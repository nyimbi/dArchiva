#!/usr/bin/env bash
# (c) Copyright Datacraft, 2026
# Start dArchiva development environment
#
# Usage:
#   ./scripts/start-dev.sh          # Start both backend and frontend
#   ./scripts/start-dev.sh backend  # Start only backend
#   ./scripts/start-dev.sh frontend # Start only frontend
#   ./scripts/start-dev.sh stop     # Stop all services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/papermerge-core"
FRONTEND_DIR="$PROJECT_ROOT/darchiva-ui"

# Database URL - defaults to Azure, override with PM_DB_URL env var
DB_URL="${PM_DB_URL:-postgresql://azureuser:Abcd1234.@lindela16.postgres.database.azure.com:5432/darc}"

# Ports
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"

# Log files
BACKEND_LOG="/tmp/darchiva-backend.log"
FRONTEND_LOG="/tmp/darchiva-frontend.log"

start_backend() {
	echo "Starting backend on port $BACKEND_PORT..."
	cd "$BACKEND_DIR"

	# Kill any existing backend
	pkill -f "uvicorn papermerge" 2>/dev/null || true
	sleep 1

	PM_DB_URL="$DB_URL" uv run uvicorn papermerge.app:app \
		--host 0.0.0.0 \
		--port "$BACKEND_PORT" \
		--reload > "$BACKEND_LOG" 2>&1 &

	# Wait for startup
	echo "Waiting for backend to start..."
	for i in {1..30}; do
		if curl -s "http://localhost:$BACKEND_PORT/docs" > /dev/null 2>&1; then
			echo "Backend started successfully!"
			echo "  API: http://localhost:$BACKEND_PORT"
			echo "  Docs: http://localhost:$BACKEND_PORT/docs"
			echo "  Logs: $BACKEND_LOG"
			return 0
		fi
		sleep 1
	done

	echo "Backend failed to start. Check logs: $BACKEND_LOG"
	tail -20 "$BACKEND_LOG"
	return 1
}

start_frontend() {
	echo "Starting frontend on port $FRONTEND_PORT..."
	cd "$FRONTEND_DIR"

	# Kill any existing frontend
	pkill -f "vite" 2>/dev/null || true
	sleep 1

	npm run dev -- --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 &

	# Wait for startup
	echo "Waiting for frontend to start..."
	for i in {1..30}; do
		if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
			echo "Frontend started successfully!"
			echo "  App: http://localhost:$FRONTEND_PORT"
			echo "  Logs: $FRONTEND_LOG"
			return 0
		fi
		sleep 1
	done

	echo "Frontend failed to start. Check logs: $FRONTEND_LOG"
	tail -20 "$FRONTEND_LOG"
	return 1
}

stop_all() {
	echo "Stopping dArchiva services..."
	pkill -f "uvicorn papermerge" 2>/dev/null || true
	pkill -f "vite" 2>/dev/null || true
	echo "Done"
}

show_status() {
	echo "dArchiva Status"
	echo "==============="
	echo ""

	if curl -s "http://localhost:$BACKEND_PORT/docs" > /dev/null 2>&1; then
		echo "Backend:  Running on port $BACKEND_PORT"
	else
		echo "Backend:  Not running"
	fi

	if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
		echo "Frontend: Running on port $FRONTEND_PORT"
	else
		echo "Frontend: Not running"
	fi
}

case "${1:-all}" in
	backend)
		start_backend
		;;
	frontend)
		start_frontend
		;;
	stop)
		stop_all
		;;
	status)
		show_status
		;;
	all)
		start_backend
		echo ""
		start_frontend
		echo ""
		echo "============================================"
		echo "dArchiva development environment is running!"
		echo "  Frontend: http://localhost:$FRONTEND_PORT"
		echo "  Backend:  http://localhost:$BACKEND_PORT"
		echo "  API Docs: http://localhost:$BACKEND_PORT/docs"
		echo ""
		echo "Login with: admin / Abcd1234."
		echo "============================================"
		;;
	*)
		echo "dArchiva Development Environment"
		echo ""
		echo "Usage: $0 <command>"
		echo ""
		echo "Commands:"
		echo "  all      - Start both backend and frontend (default)"
		echo "  backend  - Start only backend"
		echo "  frontend - Start only frontend"
		echo "  stop     - Stop all services"
		echo "  status   - Check status"
		echo ""
		echo "Environment variables:"
		echo "  PM_DB_URL      - Database URL"
		echo "  BACKEND_PORT   - Backend port (default: 8000)"
		echo "  FRONTEND_PORT  - Frontend port (default: 3001)"
		;;
esac
