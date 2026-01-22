#!/usr/bin/env python3
# (c) Copyright Datacraft, 2026
"""Setup demo data for dArchiva demonstration."""
import asyncio
import uuid
from passlib.hash import pbkdf2_sha256
import asyncpg

DB_URL = "postgresql://azureuser:Abcd1234.@lindela16.postgres.database.azure.com:5432/darc"
DEFAULT_PASSWORD = "Demo1234!"
PASSWORD_HASH = pbkdf2_sha256.hash(DEFAULT_PASSWORD)
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def get_admin_id(conn):
	row = await conn.fetchrow("SELECT id FROM users WHERE username = 'admin'")
	return row['id'] if row else None

async def create_user_with_folders(conn, admin_id, username, email, first, last):
	"""Create user along with required home and inbox folders."""
	user_id = uuid.uuid4()
	home_folder_id = uuid.uuid4()
	inbox_folder_id = uuid.uuid4()

	# Create home folder node
	await conn.execute("""
		INSERT INTO nodes (id, title, ctype, lang, created_at, updated_at, created_by, updated_by)
		VALUES ($1, $2, 'folder', 'eng', NOW(), NOW(), $3, $3)
	""", home_folder_id, f".home", admin_id)

	# Create folder entry
	await conn.execute("""
		INSERT INTO folders (node_id) VALUES ($1)
	""", home_folder_id)

	# Create inbox folder node (child of home)
	await conn.execute("""
		INSERT INTO nodes (id, title, ctype, lang, parent_id, created_at, updated_at, created_by, updated_by)
		VALUES ($1, '.inbox', 'folder', 'eng', $2, NOW(), NOW(), $3, $3)
	""", inbox_folder_id, home_folder_id, admin_id)

	await conn.execute("""
		INSERT INTO folders (node_id) VALUES ($1)
	""", inbox_folder_id)

	# Create user
	await conn.execute("""
		INSERT INTO users (id, username, email, password, first_name, last_name,
			is_active, is_superuser, is_staff, tenant_id, created_at, updated_at, date_joined)
		VALUES ($1, $2, $3, $4, $5, $6, true, false, false, $7, NOW(), NOW(), NOW())
	""", user_id, username, email, PASSWORD_HASH, first, last, TENANT_ID)

	# Create special folder entries
	await conn.execute("""
		INSERT INTO special_folders (id, owner_type, owner_id, folder_type, folder_id, created_at, updated_at)
		VALUES ($1, 'user', $2, 'home', $3, NOW(), NOW())
	""", uuid.uuid4(), user_id, home_folder_id)

	await conn.execute("""
		INSERT INTO special_folders (id, owner_type, owner_id, folder_type, folder_id, created_at, updated_at)
		VALUES ($1, 'user', $2, 'inbox', $3, NOW(), NOW())
	""", uuid.uuid4(), user_id, inbox_folder_id)

	return user_id

async def setup_demo():
	conn = await asyncpg.connect(DB_URL)
	try:
		print("=" * 50)
		print("dArchiva Demo Data Setup")
		print("=" * 50)

		# Temporarily disable the folder check trigger
		await conn.execute("ALTER TABLE users DISABLE TRIGGER ensure_user_special_folders_after_insert")

		admin_id = await get_admin_id(conn)
		if not admin_id:
			print("ERROR: Admin user not found!")
			return

		# 1. Create Departments
		print("\n[1/4] Creating departments...")
		departments = [
			("Finance", "FIN", "Financial operations and accounting"),
			("Legal", "LEG", "Legal affairs and compliance"),
			("Human Resources", "HR", "Employee management"),
		]
		dept_ids = {}
		for name, code, desc in departments:
			# Check if exists first
			existing = await conn.fetchrow("SELECT id FROM departments WHERE name = $1 AND deleted_at IS NULL", name)
			if existing:
				dept_ids[name] = existing['id']
				print(f"  → {name} (exists)")
			else:
				dept_id = uuid.uuid4()
				await conn.execute("""
					INSERT INTO departments (id, name, code, description, is_active, created_at, updated_at, created_by, updated_by)
					VALUES ($1, $2, $3, $4, true, NOW(), NOW(), $5, $5)
				""", dept_id, name, code, desc, admin_id)
				dept_ids[name] = dept_id
				print(f"  ✓ {name}")

		# 2. Create Users (Kenyan names)
		print("\n[2/4] Creating demo users...")
		users = [
			("finance_user", "wanjiku@demo.local", "Wanjiku", "Kamau", "Finance"),
			("legal_user", "ochieng@demo.local", "Ochieng", "Otieno", "Legal"),
			("hr_user", "akinyi@demo.local", "Akinyi", "Odhiambo", "Human Resources"),
			("manager", "mwangi@demo.local", "Mwangi", "Njoroge", None),
		]
		user_ids = {}
		for username, email, first, last, dept in users:
			existing = await conn.fetchrow("SELECT id FROM users WHERE username = $1", username)
			if existing:
				user_ids[username] = existing['id']
				print(f"  → {first} {last} (exists)")
			else:
				user_ids[username] = await create_user_with_folders(conn, admin_id, username, email, first, last)
				print(f"  ✓ {first} {last}")

		# 3. Assign users to departments
		print("\n[3/4] Assigning departments...")
		for username, _, _, _, dept in users:
			if dept:
				await conn.execute("""
					INSERT INTO user_departments (id, user_id, department_id, is_primary, created_at, updated_at, created_by, updated_by)
					VALUES ($1, $2, $3, true, NOW(), NOW(), $4, $4)
					ON CONFLICT DO NOTHING
				""", uuid.uuid4(), user_ids[username], dept_ids[dept], admin_id)
				print(f"  ✓ {username} → {dept}")

		# 4. Create Document Types
		print("\n[4/4] Creating document types...")
		doc_types = ["Invoice", "Contract", "Employment Record", "Policy Document", "Memo", "Report"]
		for name in doc_types:
			existing = await conn.fetchrow("SELECT id FROM document_types WHERE name = $1 AND deleted_at IS NULL", name)
			if existing:
				print(f"  → {name} (exists)")
			else:
				await conn.execute("""
					INSERT INTO document_types (id, name, created_at, updated_at, created_by, updated_by)
					VALUES ($1, $2, NOW(), NOW(), $3, $3)
				""", uuid.uuid4(), name, admin_id)
				print(f"  ✓ {name}")

		# Summary
		print("\n" + "=" * 50)
		print("Setup Complete!")
		print("=" * 50)
		print(f"\nDemo Users (password: {DEFAULT_PASSWORD}):")
		print("-" * 50)
		for username, _, first, last, dept in users:
			d = dept or "All Depts"
			print(f"  {username:15} | {first} {last:15} | {d}")
		print("-" * 50)
		print("\nAdmin: admin / Abcd1234.")

		# Re-enable the trigger
		await conn.execute("ALTER TABLE users ENABLE TRIGGER ensure_user_special_folders_after_insert")

	finally:
		await conn.close()

if __name__ == "__main__":
	asyncio.run(setup_demo())
