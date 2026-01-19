#!/usr/bin/env bash
# (c) Copyright Datacraft, 2026
# Local Prefect development setup (no Docker required)
#
# Usage:
#   ./scripts/prefect-local.sh server   # Start Prefect server
#   ./scripts/prefect-local.sh worker   # Start Prefect worker
#   ./scripts/prefect-local.sh setup    # Initial setup (create work pool)
#   ./scripts/prefect-local.sh status   # Check status
#   ./scripts/prefect-local.sh stop     # Stop all Prefect processes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/papermerge-core"

# Default settings (override with environment variables)
PREFECT_API_URL="${PREFECT_API_URL:-http://127.0.0.1:4200/api}"
PREFECT_SERVER_HOST="${PREFECT_SERVER_HOST:-127.0.0.1}"
PREFECT_SERVER_PORT="${PREFECT_SERVER_PORT:-4200}"
WORK_POOL="${PM_PREFECT_WORK_POOL:-darchiva-workflows}"
DB_URL="${PM_DB_URL:-postgresql+asyncpg://pm:pm@localhost:5432/pmdb}"

export PREFECT_API_URL
export PREFECT_API_DATABASE_CONNECTION_URL="$DB_URL"

check_prefect() {
	if ! command -v prefect &> /dev/null; then
		echo "Error: prefect CLI not found. Install with: uv pip install 'prefect>=3.0'"
		exit 1
	fi
}

start_server() {
	check_prefect
	echo "Starting Prefect server at $PREFECT_SERVER_HOST:$PREFECT_SERVER_PORT..."
	echo "Dashboard: http://$PREFECT_SERVER_HOST:$PREFECT_SERVER_PORT"
	echo ""
	prefect server start --host "$PREFECT_SERVER_HOST" --port "$PREFECT_SERVER_PORT"
}

start_worker() {
	check_prefect
	echo "Starting Prefect worker for pool: $WORK_POOL"
	echo "Connecting to: $PREFECT_API_URL"
	echo ""
	cd "$BACKEND_DIR"
	PYTHONPATH="$BACKEND_DIR:$PYTHONPATH" prefect worker start --pool "$WORK_POOL"
}

setup() {
	check_prefect
	echo "Setting up Prefect for dArchiva..."

	# Wait for server
	echo "Waiting for Prefect server..."
	for i in {1..30}; do
		if curl -s "$PREFECT_API_URL/health" > /dev/null 2>&1; then
			echo "Server is ready!"
			break
		fi
		sleep 1
	done

	# Create work pool if not exists
	echo "Creating work pool: $WORK_POOL"
	prefect work-pool create "$WORK_POOL" --type process 2>/dev/null || \
		echo "Work pool already exists or created"

	# Set concurrency limits
	prefect work-pool update "$WORK_POOL" --concurrency-limit 50

	echo ""
	echo "Setup complete!"
	echo "  - Work pool: $WORK_POOL"
	echo "  - API URL: $PREFECT_API_URL"
	echo ""
	echo "To start the worker: $0 worker"
}

check_status() {
	check_prefect
	echo "Prefect Status"
	echo "=============="
	echo ""

	# Check server
	if curl -s "$PREFECT_API_URL/health" > /dev/null 2>&1; then
		echo "Server: Running at $PREFECT_API_URL"
	else
		echo "Server: Not running"
	fi

	# Check work pool
	echo ""
	prefect work-pool ls 2>/dev/null || echo "Cannot list work pools (server not running?)"

	# Show recent flow runs
	echo ""
	echo "Recent flow runs:"
	prefect flow-run ls --limit 5 2>/dev/null || echo "Cannot list flow runs"
}

stop_all() {
	echo "Stopping Prefect processes..."
	pkill -f "prefect server" 2>/dev/null || true
	pkill -f "prefect worker" 2>/dev/null || true
	echo "Done"
}

case "${1:-help}" in
	server)
		start_server
		;;
	worker)
		start_worker
		;;
	setup)
		setup
		;;
	status)
		check_status
		;;
	stop)
		stop_all
		;;
	*)
		echo "Prefect Local Development Setup"
		echo ""
		echo "Usage: $0 <command>"
		echo ""
		echo "Commands:"
		echo "  server  - Start Prefect server (run first)"
		echo "  worker  - Start Prefect worker"
		echo "  setup   - Initial setup (create work pool)"
		echo "  status  - Check status"
		echo "  stop    - Stop all Prefect processes"
		echo ""
		echo "Environment variables:"
		echo "  PREFECT_API_URL         - Prefect API URL (default: http://127.0.0.1:4200/api)"
		echo "  PM_DB_URL               - Database URL"
		echo "  PM_PREFECT_WORK_POOL    - Work pool name (default: darchiva-workflows)"
		;;
esac
