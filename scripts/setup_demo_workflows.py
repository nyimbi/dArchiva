#!/usr/bin/env python3
# (c) Copyright Datacraft, 2026
"""Setup demo workflows for dArchiva demonstration."""
import asyncio
import uuid
import json
import asyncpg

DB_URL = "postgresql://azureuser:Abcd1234.@lindela16.postgres.database.azure.com:5432/darc"
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def get_ids(conn):
	"""Get user and department IDs."""
	admin = await conn.fetchrow("SELECT id FROM users WHERE username = 'admin'")
	finance = await conn.fetchrow("SELECT id FROM departments WHERE name = 'Finance' AND deleted_at IS NULL")
	legal = await conn.fetchrow("SELECT id FROM departments WHERE name = 'Legal' AND deleted_at IS NULL")
	hr = await conn.fetchrow("SELECT id FROM departments WHERE name = 'Human Resources' AND deleted_at IS NULL")

	finance_user = await conn.fetchrow("SELECT id FROM users WHERE username = 'finance_user'")
	legal_user = await conn.fetchrow("SELECT id FROM users WHERE username = 'legal_user'")
	hr_user = await conn.fetchrow("SELECT id FROM users WHERE username = 'hr_user'")
	manager = await conn.fetchrow("SELECT id FROM users WHERE username = 'manager'")

	return {
		'admin': admin['id'],
		'finance_dept': finance['id'] if finance else None,
		'legal_dept': legal['id'] if legal else None,
		'hr_dept': hr['id'] if hr else None,
		'finance_user': finance_user['id'] if finance_user else None,
		'legal_user': legal_user['id'] if legal_user else None,
		'hr_user': hr_user['id'] if hr_user else None,
		'manager': manager['id'] if manager else None,
	}

async def create_workflow(conn, ids, name, description, category, trigger_type, trigger_conditions):
	"""Create a workflow and return its ID."""
	workflow_id = uuid.uuid4()

	# Check if exists
	existing = await conn.fetchrow(
		"SELECT id FROM workflows WHERE name = $1 AND tenant_id = $2",
		name, TENANT_ID
	)
	if existing:
		print(f"  → {name} (exists)")
		return existing['id']

	await conn.execute("""
		INSERT INTO workflows (id, tenant_id, name, description, category, trigger_type, trigger_conditions, is_active, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
	""", workflow_id, TENANT_ID, name, description, category, trigger_type,
		json.dumps(trigger_conditions), ids['admin'])

	print(f"  ✓ {name}")
	return workflow_id

async def create_step(conn, workflow_id, name, step_type, step_order, assignee_type=None,
					  assignee_id=None, action_type=None, action_config=None, deadline_hours=None):
	"""Create a workflow step."""
	step_id = uuid.uuid4()
	await conn.execute("""
		INSERT INTO workflow_steps (id, workflow_id, name, step_type, step_order,
			assignee_type, assignee_id, action_type, action_config, deadline_hours)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	""", step_id, workflow_id, name, step_type, step_order,
		assignee_type, assignee_id, action_type,
		json.dumps(action_config) if action_config else None, deadline_hours)
	return step_id

async def setup_workflows():
	conn = await asyncpg.connect(DB_URL)
	try:
		print("=" * 50)
		print("dArchiva Demo Workflows Setup")
		print("=" * 50)

		ids = await get_ids(conn)

		# 1. Invoice Approval Workflow
		print("\n[1/3] Creating Invoice Approval Workflow...")
		invoice_wf = await create_workflow(
			conn, ids,
			name="Invoice Approval",
			description="Route invoices for approval based on amount",
			category="Finance",
			trigger_type="document_type",
			trigger_conditions={"document_type": "Invoice"}
		)

		if invoice_wf:
			# Clear existing steps
			await conn.execute("DELETE FROM workflow_steps WHERE workflow_id = $1", invoice_wf)

			await create_step(conn, invoice_wf, "Finance Review", "approval", 1,
				assignee_type="department", assignee_id=ids['finance_dept'],
				action_type="approve_reject", deadline_hours=24)

			await create_step(conn, invoice_wf, "Manager Approval", "approval", 2,
				assignee_type="user", assignee_id=ids['manager'],
				action_type="approve_reject", deadline_hours=48)

			await create_step(conn, invoice_wf, "Archive", "action", 3,
				action_type="move_to_folder", action_config={"folder": "Finance/Approved"})
			print("    + 3 steps created")

		# 2. Contract Review Workflow
		print("\n[2/3] Creating Contract Review Workflow...")
		contract_wf = await create_workflow(
			conn, ids,
			name="Contract Review",
			description="Legal review process for contracts",
			category="Legal",
			trigger_type="document_type",
			trigger_conditions={"document_type": "Contract"}
		)

		if contract_wf:
			await conn.execute("DELETE FROM workflow_steps WHERE workflow_id = $1", contract_wf)

			await create_step(conn, contract_wf, "Legal Review", "approval", 1,
				assignee_type="department", assignee_id=ids['legal_dept'],
				action_type="review", deadline_hours=72)

			await create_step(conn, contract_wf, "Compliance Check", "approval", 2,
				assignee_type="user", assignee_id=ids['legal_user'],
				action_type="approve_reject", deadline_hours=48)

			await create_step(conn, contract_wf, "Final Approval", "approval", 3,
				assignee_type="user", assignee_id=ids['manager'],
				action_type="approve_reject", deadline_hours=24)

			await create_step(conn, contract_wf, "Archive", "action", 4,
				action_type="move_to_folder", action_config={"folder": "Legal/Contracts"})
			print("    + 4 steps created")

		# 3. Employee Document Processing
		print("\n[3/3] Creating Employee Document Workflow...")
		hr_wf = await create_workflow(
			conn, ids,
			name="Employee Document Processing",
			description="Process HR documents for new employees",
			category="HR",
			trigger_type="document_type",
			trigger_conditions={"document_type": "Employment Record"}
		)

		if hr_wf:
			await conn.execute("DELETE FROM workflow_steps WHERE workflow_id = $1", hr_wf)

			await create_step(conn, hr_wf, "HR Review", "approval", 1,
				assignee_type="department", assignee_id=ids['hr_dept'],
				action_type="review", deadline_hours=24)

			await create_step(conn, hr_wf, "Data Entry", "task", 2,
				assignee_type="user", assignee_id=ids['hr_user'],
				action_type="complete_task",
				action_config={"task": "Enter employee details into HRIS"})

			await create_step(conn, hr_wf, "Archive", "action", 3,
				action_type="move_to_folder", action_config={"folder": "HR/Employee Files"})
			print("    + 3 steps created")

		print("\n" + "=" * 50)
		print("Workflows Setup Complete!")
		print("=" * 50)
		print("\nWorkflows created:")
		print("  1. Invoice Approval (Finance → Manager → Archive)")
		print("  2. Contract Review (Legal → Compliance → Manager → Archive)")
		print("  3. Employee Document Processing (HR → Data Entry → Archive)")

	finally:
		await conn.close()

if __name__ == "__main__":
	asyncio.run(setup_workflows())
