#!/usr/bin/env bash
# (c) Copyright Datacraft, 2026
# Deploy dArchiva platform to a remote server (without Docker)
#
# Usage:
#   ./scripts/deploy.sh <remote_host> [options]
#
# Examples:
#   ./scripts/deploy.sh user@server.example.com
#   ./scripts/deploy.sh user@server.example.com --env production
#   ./scripts/deploy.sh user@server.example.com --branch main --migrate
#
# Prerequisites on remote server:
#   - Python 3.11+
#   - Node.js 18+ (for PM2)
#   - PostgreSQL client (psql)
#   - Git

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$(dirname "$PROJECT_ROOT")/darchiva-ui"
APP_NAME="darchiva"
DEPLOY_DIR="/opt/${APP_NAME}"
FRONTEND_DEPLOY_DIR="/var/www/${APP_NAME}"
VENV_DIR="${DEPLOY_DIR}/.venv"
LOG_DIR="/var/log/${APP_NAME}"
RUN_DIR="/var/run/${APP_NAME}"
CONFIG_DIR="/etc/${APP_NAME}"

# Default values
REMOTE_HOST=""
BRANCH="main"
ENV_NAME="production"
RUN_MIGRATIONS=false
RESTART_SERVICES=true
SETUP_PM2=false
PREFECT_ENABLED=true
DEPLOY_FRONTEND=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

usage() {
	cat <<EOF
Usage: $(basename "$0") <remote_host> [options]

Deploy dArchiva platform to a remote server using PM2 for process management.

Arguments:
  remote_host          SSH destination (e.g., user@server.example.com)

Options:
  -b, --branch NAME    Git branch to deploy (default: main)
  -e, --env NAME       Environment name (default: production)
  -m, --migrate        Run database migrations
  -s, --setup-pm2      Setup PM2 ecosystem and startup scripts
  -p, --no-prefect     Disable Prefect server/worker
  -f, --no-frontend    Skip frontend build and deployment
  -r, --no-restart     Don't restart services after deploy
  -h, --help           Show this help message

Environment Variables (set on remote or in ${CONFIG_DIR}/env):
  PM_DB_URL            PostgreSQL connection URL (required)
  PM_MEDIA_ROOT        Media storage path (default: /var/lib/${APP_NAME}/media)
  PM_SECRET_KEY        Application secret key
  PREFECT_API_URL      Prefect server URL (default: http://localhost:4200/api)

Examples:
  $(basename "$0") deploy@prod.example.com --migrate --setup-pm2
  $(basename "$0") user@staging.example.com -b develop -e staging
EOF
	exit 0
}

remote_exec() {
	ssh -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" "$@"
}

remote_sudo() {
	ssh -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" "sudo $*"
}

# ============================================================================
# Parse Arguments
# ============================================================================
parse_args() {
	while [[ $# -gt 0 ]]; do
		case $1 in
			-b|--branch) BRANCH="$2"; shift 2 ;;
			-e|--env) ENV_NAME="$2"; shift 2 ;;
			-m|--migrate) RUN_MIGRATIONS=true; shift ;;
			-s|--setup-pm2) SETUP_PM2=true; shift ;;
			-p|--no-prefect) PREFECT_ENABLED=false; shift ;;
			-f|--no-frontend) DEPLOY_FRONTEND=false; shift ;;
			-r|--no-restart) RESTART_SERVICES=false; shift ;;
			-h|--help) usage ;;
			-*) log_error "Unknown option: $1"; usage ;;
			*)
				if [[ -z "$REMOTE_HOST" ]]; then
					REMOTE_HOST="$1"
				else
					log_error "Unexpected argument: $1"
					usage
				fi
				shift
				;;
		esac
	done

	if [[ -z "$REMOTE_HOST" ]]; then
		log_error "Remote host is required"
		usage
	fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================
preflight_checks() {
	log_info "Running pre-flight checks..."

	# Check SSH connectivity
	if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" "echo ok" &>/dev/null; then
		log_error "Cannot connect to $REMOTE_HOST"
		exit 1
	fi
	log_success "SSH connection OK"

	# Check Python on remote
	local py_version
	py_version=$(remote_exec "python3 --version 2>/dev/null || echo 'not found'")
	if [[ "$py_version" == "not found" ]]; then
		log_error "Python3 not found on remote server"
		exit 1
	fi
	log_success "Remote Python: $py_version"

	# Check uv on remote (install if missing)
	if ! remote_exec "command -v uv &>/dev/null"; then
		log_warn "uv not found, installing..."
		remote_exec "curl -LsSf https://astral.sh/uv/install.sh | sh"
		log_success "uv installed"
	fi

	# Check Node.js on remote (required for PM2)
	local node_version
	node_version=$(remote_exec "node --version 2>/dev/null || echo 'not found'")
	if [[ "$node_version" == "not found" ]]; then
		log_warn "Node.js not found, installing via nvm..."
		remote_exec 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
		remote_exec 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install 20 && nvm use 20'
		log_success "Node.js installed"
	else
		log_success "Remote Node.js: $node_version"
	fi

	# Check PM2 on remote (install if missing)
	if ! remote_exec "command -v pm2 &>/dev/null"; then
		log_warn "PM2 not found, installing..."
		remote_exec "npm install -g pm2"
		log_success "PM2 installed"
	else
		local pm2_version
		pm2_version=$(remote_exec "pm2 --version 2>/dev/null")
		log_success "Remote PM2: $pm2_version"
	fi
}

# ============================================================================
# Setup Remote Directory Structure
# ============================================================================
setup_directories() {
	log_info "Setting up directory structure..."

	remote_sudo "mkdir -p ${DEPLOY_DIR} ${LOG_DIR} ${RUN_DIR} ${CONFIG_DIR}"
	remote_sudo "mkdir -p /var/lib/${APP_NAME}/media"
	remote_sudo "chown -R \$(whoami):\$(whoami) ${DEPLOY_DIR}"
	remote_sudo "chmod 755 ${LOG_DIR} ${RUN_DIR}"

	log_success "Directories created"
}

# ============================================================================
# Deploy Code
# ============================================================================
deploy_code() {
	log_info "Deploying code from branch: $BRANCH..."

	# Sync code using rsync (exclude .venv, __pycache__, .git)
	rsync -avz --delete \
		--exclude '.venv' \
		--exclude '__pycache__' \
		--exclude '*.pyc' \
		--exclude '.git' \
		--exclude '.pytest_cache' \
		--exclude 'node_modules' \
		--exclude '.mypy_cache' \
		"${PROJECT_ROOT}/" "${REMOTE_HOST}:${DEPLOY_DIR}/"

	log_success "Code deployed"
}

# ============================================================================
# Build and Deploy Frontend
# ============================================================================
deploy_frontend() {
	if [[ "$DEPLOY_FRONTEND" != "true" ]]; then
		log_info "Skipping frontend deployment (use without --no-frontend to deploy)"
		return
	fi

	if [[ ! -d "$FRONTEND_DIR" ]]; then
		log_warn "Frontend directory not found at $FRONTEND_DIR, skipping"
		return
	fi

	log_info "Building frontend..."

	# Check if npm is installed locally
	if ! command -v npm &>/dev/null; then
		log_error "npm not found locally. Install Node.js to build frontend."
		exit 1
	fi

	# Install dependencies and build (using vite build directly to skip TypeScript check)
	(cd "$FRONTEND_DIR" && npm ci && npx vite build)

	if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
		log_error "Frontend build failed - dist directory not found"
		exit 1
	fi

	log_success "Frontend built"

	log_info "Deploying frontend to ${FRONTEND_DEPLOY_DIR}..."

	# Create frontend directory on remote
	remote_sudo "mkdir -p ${FRONTEND_DEPLOY_DIR}"
	remote_sudo "chown -R \$(whoami):\$(whoami) ${FRONTEND_DEPLOY_DIR}"

	# Sync built files
	rsync -avz --delete \
		"${FRONTEND_DIR}/dist/" "${REMOTE_HOST}:${FRONTEND_DEPLOY_DIR}/"

	log_success "Frontend deployed"
}

# ============================================================================
# Install Dependencies
# ============================================================================
install_dependencies() {
	log_info "Installing Python dependencies..."

	remote_exec "cd ${DEPLOY_DIR} && ~/.local/bin/uv venv ${VENV_DIR} --python 3.11"
	remote_exec "cd ${DEPLOY_DIR} && ~/.local/bin/uv pip install -e '.[prefect]' --python ${VENV_DIR}/bin/python"

	log_success "Dependencies installed"
}

# ============================================================================
# Run Migrations
# ============================================================================
run_migrations() {
	if [[ "$RUN_MIGRATIONS" != "true" ]]; then
		log_info "Skipping migrations (use --migrate to run)"
		return
	fi

	log_info "Running database migrations..."

	remote_exec "cd ${DEPLOY_DIR} && source ${CONFIG_DIR}/env && ${VENV_DIR}/bin/alembic upgrade head"

	log_success "Migrations complete"
}

# ============================================================================
# Setup PM2 Ecosystem
# ============================================================================
setup_pm2() {
	log_info "Setting up PM2 ecosystem..."

	# Generate PM2 ecosystem config
	local prefect_apps=""
	if [[ "$PREFECT_ENABLED" == "true" ]]; then
		prefect_apps=",
    {
      name: 'darchiva-prefect-server',
      script: '${VENV_DIR}/bin/prefect',
      args: 'server start --host 0.0.0.0 --port 4200',
      cwd: '${DEPLOY_DIR}',
      env_file: '${CONFIG_DIR}/env',
      log_file: '${LOG_DIR}/prefect-server.log',
      error_file: '${LOG_DIR}/prefect-server-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: 'darchiva-prefect-worker',
      script: '${VENV_DIR}/bin/prefect',
      args: 'worker start --pool darchiva-workflows',
      cwd: '${DEPLOY_DIR}',
      env_file: '${CONFIG_DIR}/env',
      log_file: '${LOG_DIR}/prefect-worker.log',
      error_file: '${LOG_DIR}/prefect-worker-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      wait_ready: true,
      listen_timeout: 10000
    }"
	fi

	cat <<EOF | ssh "$REMOTE_HOST" "cat > ${DEPLOY_DIR}/ecosystem.config.js"
// PM2 Ecosystem Configuration for dArchiva
// Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
module.exports = {
  apps: [
    {
      name: 'darchiva-api',
      script: '${VENV_DIR}/bin/uvicorn',
      args: 'papermerge.app:app --host 0.0.0.0 --port 8000 --workers 4',
      cwd: '${DEPLOY_DIR}',
      env_file: '${CONFIG_DIR}/env',
      log_file: '${LOG_DIR}/api.log',
      error_file: '${LOG_DIR}/api-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }${prefect_apps}
  ]
};
EOF

	log_success "PM2 ecosystem config created"

	# Setup PM2 startup script if --setup-pm2 flag is set
	if [[ "$SETUP_PM2" == "true" ]]; then
		log_info "Configuring PM2 startup..."

		# Generate and run startup command
		remote_exec "pm2 startup | tail -1 | bash" || true

		# Save current PM2 process list
		remote_exec "cd ${DEPLOY_DIR} && pm2 start ecosystem.config.js && pm2 save"

		log_success "PM2 startup configured"
	fi
}

# ============================================================================
# Create Environment File Template
# ============================================================================
create_env_template() {
	log_info "Checking environment configuration..."

	if ! remote_exec "test -f ${CONFIG_DIR}/env"; then
		log_warn "Creating environment template at ${CONFIG_DIR}/env"
		cat <<EOF | ssh "$REMOTE_HOST" "sudo tee ${CONFIG_DIR}/env > /dev/null"
# dArchiva Environment Configuration
# Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Database (REQUIRED)
PM_DB_URL=postgresql://user:password@localhost:5432/darchiva

# Security
PM_SECRET_KEY=$(openssl rand -hex 32)

# Encryption (document-level encryption)
PM_MASTER_KEY=$(openssl rand -hex 32)
PM_ENCRYPTION_ALGORITHM=AES-256-GCM

# Storage
PM_MEDIA_ROOT=/var/lib/${APP_NAME}/media
PM_STORAGE_BACKEND=local

# Prefect (workflow engine)
PREFECT_API_URL=http://localhost:4200/api
PREFECT_API_DATABASE_CONNECTION_URL=\${PM_DB_URL}

# Optional: Redis cache
# PM_CACHE_ENABLED=true
# PM_REDIS_URL=redis://localhost:6379/0

# Optional: Search backend
# PM_SEARCH_BACKEND=postgres
# PM_ELASTICSEARCH_HOSTS=http://localhost:9200

# Optional: Cloud storage
# PM_R2_ACCOUNT_ID=
# PM_R2_ACCESS_KEY_ID=
# PM_R2_SECRET_ACCESS_KEY=
# PM_BUCKET_NAME=
EOF
		remote_sudo "chmod 600 ${CONFIG_DIR}/env"
		log_warn "Please edit ${CONFIG_DIR}/env with your settings before starting services"
	else
		log_success "Environment file exists"
	fi
}

# ============================================================================
# Restart Services (PM2)
# ============================================================================
restart_services() {
	if [[ "$RESTART_SERVICES" != "true" ]]; then
		log_info "Skipping service restart (use without --no-restart to restart)"
		return
	fi

	log_info "Restarting services via PM2..."

	# Check if ecosystem config exists
	if remote_exec "test -f ${DEPLOY_DIR}/ecosystem.config.js"; then
		# Check if processes are already running
		if remote_exec "pm2 list | grep -q darchiva-api"; then
			# Reload with zero-downtime
			remote_exec "cd ${DEPLOY_DIR} && pm2 reload ecosystem.config.js"
			log_success "PM2 processes reloaded (zero-downtime)"
		else
			# Start fresh
			remote_exec "cd ${DEPLOY_DIR} && pm2 start ecosystem.config.js"
			log_success "PM2 processes started"
		fi

		# Save PM2 process list
		remote_exec "pm2 save"
	else
		log_error "ecosystem.config.js not found. Run setup_pm2 first."
		exit 1
	fi

	# Show process status
	log_info "PM2 Process Status:"
	remote_exec "pm2 list"
}

# ============================================================================
# Health Check
# ============================================================================
health_check() {
	log_info "Running health check..."

	sleep 3

	# Check API
	local api_status
	api_status=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs || echo '000'")
	if [[ "$api_status" == "200" ]]; then
		log_success "API is healthy (HTTP $api_status)"
	else
		log_warn "API returned HTTP $api_status"
	fi

	# Check Prefect
	if [[ "$PREFECT_ENABLED" == "true" ]]; then
		local prefect_status
		prefect_status=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/api/health || echo '000'")
		if [[ "$prefect_status" == "200" ]]; then
			log_success "Prefect server is healthy (HTTP $prefect_status)"
		else
			log_warn "Prefect server returned HTTP $prefect_status"
		fi
	fi
}

# ============================================================================
# Print Summary
# ============================================================================
print_summary() {
	echo ""
	echo "=============================================="
	echo -e "${GREEN}Deployment Complete${NC}"
	echo "=============================================="
	echo "Remote Host:    $REMOTE_HOST"
	echo "Deploy Dir:     $DEPLOY_DIR"
	if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
		echo "Frontend Dir:   $FRONTEND_DEPLOY_DIR"
	fi
	echo "Environment:    $ENV_NAME"
	echo "Branch:         $BRANCH"
	echo ""
	echo "Services:"
	echo "  Frontend:     https://<domain>/ (served by nginx)"
	echo "  API:          http://<server>:8000 (internal)"
	echo "  API Docs:     http://<server>:8000/docs"
	if [[ "$PREFECT_ENABLED" == "true" ]]; then
		echo "  Prefect UI:   http://<server>:4200"
	fi
	echo ""
	echo "Security Features:"
	echo "  Policies:     /policies/* (PBAC policy management)"
	echo "  Audit:        /audit-logs/* (analytics, compliance)"
	echo "  Encryption:   /encryption/* (KEK rotation, hidden docs)"
	echo ""
	echo "Logs:"
	echo "  Nginx:        /var/log/nginx/darchiva_*.log"
	echo "  API:          ${LOG_DIR}/api.log"
	if [[ "$PREFECT_ENABLED" == "true" ]]; then
		echo "  Prefect:      ${LOG_DIR}/prefect-server.log"
		echo "  Worker:       ${LOG_DIR}/prefect-worker.log"
	fi
	echo ""
	echo "PM2 Commands:"
	echo "  Status:       ssh $REMOTE_HOST 'pm2 list'"
	echo "  Logs:         ssh $REMOTE_HOST 'pm2 logs darchiva-api'"
	echo "  Restart:      ssh $REMOTE_HOST 'pm2 restart darchiva-api'"
	echo "  Reload:       ssh $REMOTE_HOST 'cd ${DEPLOY_DIR} && pm2 reload ecosystem.config.js'"
	echo "  Stop:         ssh $REMOTE_HOST 'pm2 stop all'"
	echo "  Monitor:      ssh $REMOTE_HOST 'pm2 monit'"
	echo ""
	echo "Migration:"
	echo "  ssh $REMOTE_HOST 'cd ${DEPLOY_DIR} && source ${CONFIG_DIR}/env && ${VENV_DIR}/bin/alembic upgrade head'"
	echo "=============================================="
}

# ============================================================================
# Main
# ============================================================================
main() {
	parse_args "$@"

	echo "=============================================="
	echo "dArchiva Deployment (PM2)"
	echo "=============================================="
	echo "Target: $REMOTE_HOST"
	echo "Branch: $BRANCH"
	echo "Environment: $ENV_NAME"
	echo "=============================================="
	echo ""

	preflight_checks
	setup_directories
	deploy_code
	deploy_frontend
	install_dependencies
	create_env_template
	run_migrations
	setup_pm2
	restart_services
	health_check
	print_summary
}

main "$@"
