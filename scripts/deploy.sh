#!/usr/bin/env bash
# dArchiva — Full Platform Deployment Script
#
# Automates: local builds → remote sync → deps → migrations →
#            nginx config → PM2 ecosystem → health checks
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   -H, --host HOST      SSH target (default: from .env.deploy)
#   -b, --branch BRANCH  Git branch (default: main)
#   -m, --migrate        Run alembic upgrade head
#   -s, --setup          First-time: rsync code + install system deps
#   -n, --nginx          Deploy / reload nginx config
#   --no-frontend        Skip frontend build
#   --no-agent           Skip scan agent build
#   --no-restart         Skip PM2 reload
#   --rollback           Roll back to previous PM2 deployment
#   -h, --help           Show this help

set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONO_ROOT="$(dirname "$SCRIPT_DIR")"          # dArchiva/
CORE_DIR="${MONO_ROOT}/papermerge-core"
UI_DIR="${MONO_ROOT}/darchiva-ui"
AGENT_DIR="${MONO_ROOT}/darchiva-scan-agent"
OCR_DIR="${MONO_ROOT}/papermerge-ocr-worker"
S3_DIR="${MONO_ROOT}/papermerge-s3-worker"
NGINX_CONF="${SCRIPT_DIR}/deploy-config/nginx.conf"

# ── Load deploy config ────────────────────────────────────────────────────────
ENV_DEPLOY="${MONO_ROOT}/.env.deploy"
if [[ -f "$ENV_DEPLOY" ]]; then
	# shellcheck source=/dev/null
	set -o allexport; source "$ENV_DEPLOY"; set +o allexport
fi

# Defaults (override via .env.deploy or CLI flags)
DEPLOY_HOST="${DEPLOY_HOST:-azureuser@172.190.196.182}"
DEPLOY_USER="${DEPLOY_USER:-azureuser}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/azureuser/src/darc}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

# Derived remote paths
REMOTE_CORE="${DEPLOY_PATH}/papermerge-core"
REMOTE_OCR="${DEPLOY_PATH}/papermerge-ocr-worker"
REMOTE_S3="${DEPLOY_PATH}/papermerge-s3-worker"
REMOTE_UI="${DEPLOY_PATH}/darchiva-ui"
REMOTE_AGENT_BIN="/opt/darchiva-scan-agent"
VENV_CORE="${DEPLOY_PATH}/.venv-core"
VENV_OCR="${DEPLOY_PATH}/.venv-ocr"
VENV_S3="${DEPLOY_PATH}/.venv-s3"
LOG_DIR="/var/log/darchiva"
CONFIG_ENV="/etc/darchiva/env"

# ── Flags ─────────────────────────────────────────────────────────────────────
OPT_MIGRATE=false
OPT_SETUP=false
OPT_NGINX=false
OPT_FRONTEND=true
OPT_AGENT=true
OPT_RESTART=true
OPT_ROLLBACK=false

# ── Colors ────────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${B}[INFO]${NC} $*"; }
log_ok()      { echo -e "${G}[ OK ]${NC} $*"; }
log_warn()    { echo -e "${Y}[WARN]${NC} $*"; }
log_error()   { echo -e "${R}[ERR ]${NC} $*" >&2; }
log_section() { echo -e "\n${B}━━━ $* ━━━${NC}"; }

die() { log_error "$*"; exit 1; }

# ── Parse CLI ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
	case $1 in
		-H|--host)       DEPLOY_HOST="$2"; shift 2 ;;
		-b|--branch)     DEPLOY_BRANCH="$2"; shift 2 ;;
		-m|--migrate)    OPT_MIGRATE=true; shift ;;
		-s|--setup)      OPT_SETUP=true; shift ;;
		-n|--nginx)      OPT_NGINX=true; shift ;;
		--no-frontend)   OPT_FRONTEND=false; shift ;;
		--no-agent)      OPT_AGENT=false; shift ;;
		--no-restart)    OPT_RESTART=false; shift ;;
		--rollback)      OPT_ROLLBACK=true; shift ;;
		-h|--help)
			sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
			exit 0
			;;
		*) die "Unknown argument: $1" ;;
	esac
done

# ── SSH helpers ───────────────────────────────────────────────────────────────
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
r() { ssh $SSH_OPTS "$DEPLOY_HOST" "$@"; }
rs() { ssh $SSH_OPTS "$DEPLOY_HOST" "sudo $*"; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
preflight() {
	log_section "Pre-flight checks"

	# Local tools
	for tool in git rsync npm go; do
		command -v "$tool" &>/dev/null || die "Local: '$tool' not found"
	done
	log_ok "Local tools: git rsync npm go"

	# SSH
	if ! ssh $SSH_OPTS "$DEPLOY_HOST" "echo ok" &>/dev/null; then
		die "Cannot SSH to $DEPLOY_HOST — check key auth"
	fi
	log_ok "SSH → $DEPLOY_HOST"

	# Remote: uv
	if ! r "command -v uv &>/dev/null || ~/.local/bin/uv --version &>/dev/null"; then
		log_warn "uv not found on remote — installing"
		r "curl -LsSf https://astral.sh/uv/install.sh | sh"
	fi
	log_ok "Remote: uv"

	# Remote: pm2
	if ! r "command -v pm2 &>/dev/null"; then
		log_warn "pm2 not found on remote — installing"
		r "npm install -g pm2 && pm2 install pm2-logrotate"
	fi
	log_ok "Remote: pm2"
}

# ── First-time server setup ───────────────────────────────────────────────────
server_setup() {
	[[ "$OPT_SETUP" == "true" ]] || return 0
	log_section "Server setup (--setup)"

	# Create directory skeleton
	rs "mkdir -p ${DEPLOY_PATH} ${LOG_DIR} /etc/darchiva /opt/darchiva-scan-agent /var/www/darchiva"
	rs "chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH} /opt/darchiva-scan-agent /var/www/darchiva"
	rs "chown ${DEPLOY_USER}:${DEPLOY_USER} ${LOG_DIR}"

	# Clone repos if not present
	r "test -d ${DEPLOY_PATH}/.git || git clone https://github.com/nyimbi/dArchiva.git ${DEPLOY_PATH} --recurse-submodules"

	# Generate env template if missing
	if ! r "test -f ${CONFIG_ENV}"; then
		log_warn "Creating env template at ${CONFIG_ENV}"
		rs "mkdir -p /etc/darchiva"
		# Write template (no secrets committed)
		rs "tee ${CONFIG_ENV} > /dev/null" <<'ENVEOF'
# dArchiva Environment — fill in before first start
PM_DB_URL=postgresql+psycopg://user:pass@localhost:5432/darchiva
PM_DB_SSL=false
PM_API_PREFIX=/api/v1
PM_SECRET_KEY=CHANGE_ME
PM_MASTER_KEY=CHANGE_ME
PM_MEDIA_ROOT=/var/lib/darchiva/media
REDIS_URL=redis://localhost:6379/0
ENVEOF
		rs "chmod 600 ${CONFIG_ENV}"
		log_warn "Edit ${CONFIG_ENV} before starting services"
	fi

	# Nginx
	rs "apt-get install -y nginx certbot python3-certbot-nginx 2>/dev/null || true"

	log_ok "Server setup complete"
}

# ── Pull code on remote ───────────────────────────────────────────────────────
pull_code() {
	log_section "Code update → ${DEPLOY_BRANCH}"

	r "cd ${DEPLOY_PATH} && git fetch --all --prune"
	r "cd ${DEPLOY_PATH} && git checkout ${DEPLOY_BRANCH} && git pull origin ${DEPLOY_BRANCH}"
	r "cd ${DEPLOY_PATH} && git submodule update --init --recursive"

	log_ok "Code pulled (branch: ${DEPLOY_BRANCH})"
	r "cd ${DEPLOY_PATH} && git log -1 --format='  commit %h  %s  (%ai)'"
}

# ── Build frontend locally → upload dist/ ─────────────────────────────────────
build_frontend() {
	[[ "$OPT_FRONTEND" == "true" ]] || { log_info "Skipping frontend (--no-frontend)"; return; }
	log_section "Frontend build"

	[[ -d "$UI_DIR" ]] || die "UI dir not found: $UI_DIR"

	log_info "npm ci..."
	(cd "$UI_DIR" && npm ci --silent)
	log_info "vite build..."
	(cd "$UI_DIR" && npx vite build)
	[[ -d "$UI_DIR/dist" ]] || die "Frontend build failed — no dist/"

	log_info "Uploading to remote /var/www/darchiva..."
	rs "mkdir -p /var/www/darchiva && chown ${DEPLOY_USER}:${DEPLOY_USER} /var/www/darchiva"
	rsync -az --delete --checksum \
		"${UI_DIR}/dist/" "${DEPLOY_HOST}:/var/www/darchiva/"

	log_ok "Frontend deployed"
}

# ── Build scan agent (linux amd64) → upload binary ───────────────────────────
build_agent() {
	[[ "$OPT_AGENT" == "true" ]] || { log_info "Skipping scan agent (--no-agent)"; return; }
	log_section "Scan agent build (linux-amd64)"

	[[ -d "$AGENT_DIR" ]] || { log_warn "Scan agent dir not found — skipping"; return; }

	(cd "$AGENT_DIR" && make linux)
	AGENT_BIN="${AGENT_DIR}/dist/darchiva-scan-agent-linux-amd64"
	[[ -f "$AGENT_BIN" ]] || die "Agent binary not built: $AGENT_BIN"

	log_info "Uploading binary..."
	rs "mkdir -p ${REMOTE_AGENT_BIN} && chown ${DEPLOY_USER}:${DEPLOY_USER} ${REMOTE_AGENT_BIN}"
	rsync -az "${AGENT_BIN}" "${DEPLOY_HOST}:${REMOTE_AGENT_BIN}/darchiva-scan-agent"
	r "chmod +x ${REMOTE_AGENT_BIN}/darchiva-scan-agent"

	log_ok "Scan agent deployed → ${REMOTE_AGENT_BIN}/darchiva-scan-agent"
}

# ── Install Python deps (uv sync in each venv) ────────────────────────────────
install_deps() {
	log_section "Python dependencies"

	local UV="~/.local/bin/uv"

	log_info "core..."
	r "cd ${REMOTE_CORE} && ${UV} venv ${VENV_CORE} --python 3.13 -q && ${UV} pip install -e '.' --python ${VENV_CORE}/bin/python -q"
	log_ok "core deps"

	if r "test -d ${REMOTE_OCR}"; then
		log_info "ocr-worker..."
		r "cd ${REMOTE_OCR} && ${UV} venv ${VENV_OCR} --python 3.13 -q && ${UV} pip install -e '.' --python ${VENV_OCR}/bin/python -q"
		log_ok "ocr-worker deps"
	fi

	if r "test -d ${REMOTE_S3}"; then
		log_info "s3-worker..."
		r "cd ${REMOTE_S3} && ${UV} venv ${VENV_S3} --python 3.13 -q && ${UV} pip install -e '.' --python ${VENV_S3}/bin/python -q"
		log_ok "s3-worker deps"
	fi
}

# ── Alembic migrations ────────────────────────────────────────────────────────
run_migrations() {
	[[ "$OPT_MIGRATE" == "true" ]] || { log_info "Skipping migrations (pass --migrate to run)"; return; }
	log_section "Database migrations"

	# Snapshot current head for rollback reference
	PREV_HEAD=$(r "cd ${REMOTE_CORE} && source ${CONFIG_ENV} && ${VENV_CORE}/bin/alembic current 2>/dev/null | awk '{print \$1}'" || echo "unknown")
	log_info "Current revision: ${PREV_HEAD}"

	r "cd ${REMOTE_CORE} && set -a && source ${CONFIG_ENV} && set +a && ${VENV_CORE}/bin/alembic upgrade head"

	NEW_HEAD=$(r "cd ${REMOTE_CORE} && source ${CONFIG_ENV} && ${VENV_CORE}/bin/alembic current 2>/dev/null | awk '{print \$1}'" || echo "unknown")
	log_ok "Migrated: ${PREV_HEAD} → ${NEW_HEAD}"
}

# ── Nginx config ──────────────────────────────────────────────────────────────
deploy_nginx() {
	[[ "$OPT_NGINX" == "true" ]] || return 0
	log_section "Nginx config"

	[[ -f "$NGINX_CONF" ]] || die "Nginx conf not found: $NGINX_CONF"

	rsync -az "$NGINX_CONF" "${DEPLOY_HOST}:/tmp/darchiva-nginx.conf"
	rs "cp /tmp/darchiva-nginx.conf /etc/nginx/sites-available/darchiva"
	rs "ln -sf /etc/nginx/sites-available/darchiva /etc/nginx/sites-enabled/darchiva"
	rs "nginx -t"
	rs "systemctl reload nginx"

	log_ok "Nginx reloaded"
}

# ── PM2 ecosystem ─────────────────────────────────────────────────────────────
write_ecosystem() {
	log_section "PM2 ecosystem"

	r "cat > ${DEPLOY_PATH}/ecosystem.config.js" <<ECOSYSTEM
// Generated by scripts/deploy.sh — $(date -u '+%Y-%m-%d %H:%M UTC')
module.exports = {
  apps: [
    {
      name: 'darchiva-api',
      script: '${VENV_CORE}/bin/uvicorn',
      args: 'papermerge.app:app --host 0.0.0.0 --port 8000 --workers 4',
      cwd: '${REMOTE_CORE}',
      env_file: '${CONFIG_ENV}',
      log_file: '${LOG_DIR}/api.log',
      error_file: '${LOG_DIR}/api-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      watch: false,
    },
    {
      name: 'darchiva-ocr-worker',
      script: '${VENV_OCR}/bin/celery',
      args: '-A ocrworker.celery_app worker --loglevel=info -Q ocr -c 2',
      cwd: '${REMOTE_OCR}',
      env_file: '${CONFIG_ENV}',
      log_file: '${LOG_DIR}/ocr-worker.log',
      error_file: '${LOG_DIR}/ocr-worker-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      max_memory_restart: '2G',
      watch: false,
    },
    {
      name: 'darchiva-s3-worker',
      script: '${VENV_S3}/bin/celery',
      args: '-A s3worker.celery_app worker --loglevel=info -Q s3 -c 4',
      cwd: '${REMOTE_S3}',
      env_file: '${CONFIG_ENV}',
      log_file: '${LOG_DIR}/s3-worker.log',
      error_file: '${LOG_DIR}/s3-worker-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      max_memory_restart: '1G',
      watch: false,
    },
    {
      name: 'darchiva-scheduler',
      script: '${VENV_CORE}/bin/celery',
      args: '-A papermerge.celery_app beat --loglevel=info',
      cwd: '${REMOTE_CORE}',
      env_file: '${CONFIG_ENV}',
      log_file: '${LOG_DIR}/scheduler.log',
      error_file: '${LOG_DIR}/scheduler-error.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 15000,
      watch: false,
    },
  ],
};
ECOSYSTEM

	log_ok "ecosystem.config.js written"
}

# ── PM2 restart / rollback ────────────────────────────────────────────────────
restart_services() {
	[[ "$OPT_RESTART" == "true" ]] || { log_info "Skipping restart (--no-restart)"; return; }
	log_section "PM2 services"

	write_ecosystem

	if [[ "$OPT_ROLLBACK" == "true" ]]; then
		log_warn "Rolling back PM2 deployments..."
		r "pm2 revertall" || true
		log_ok "Rollback issued — check: pm2 list"
		return
	fi

	if r "pm2 list | grep -q darchiva-api"; then
		log_info "Reloading (zero-downtime)..."
		r "cd ${DEPLOY_PATH} && pm2 reload ecosystem.config.js"
	else
		log_info "Starting fresh..."
		r "cd ${DEPLOY_PATH} && pm2 start ecosystem.config.js"
	fi

	r "pm2 save"
	log_ok "PM2 services reloaded"

	# Ensure PM2 survives reboots
	r "pm2 startup | tail -1 | bash" 2>/dev/null || true
}

# ── Health checks ─────────────────────────────────────────────────────────────
health_check() {
	log_section "Health checks"

	local retries=12 wait=5 api_ok=false

	for ((i=1; i<=retries; i++)); do
		local code
		code=$(r "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v1/liveness-probe/ 2>/dev/null || echo 000")
		if [[ "$code" == "200" ]]; then
			api_ok=true
			break
		fi
		log_info "  attempt ${i}/${retries}: API returned ${code}, waiting ${wait}s..."
		sleep "$wait"
	done

	if [[ "$api_ok" == "true" ]]; then
		log_ok "API healthy (/api/v1/liveness-probe/ → 200)"
	else
		log_error "API did not become healthy after $((retries * wait))s"
		log_warn "Check logs: ssh $DEPLOY_HOST 'pm2 logs darchiva-api --lines 50'"
		# Print PM2 status but don't exit — don't block deploy pipeline on a health-check race
	fi

	# PM2 summary
	echo ""
	r "pm2 list" || true
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
	local host_short="${DEPLOY_HOST##*@}"
	echo ""
	echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
	echo -e "${G}  dArchiva deployed successfully${NC}"
	echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
	cat <<INFO

  Host:     ${DEPLOY_HOST}
  Branch:   ${DEPLOY_BRANCH}
  Deploy:   ${DEPLOY_PATH}

  Services (PM2):
    API          http://${host_short}:8000
    Docs         http://${host_short}:8000/docs
    OCR worker   celery queue: ocr
    S3 worker    celery queue: s3
    Scheduler    celery beat

  Frontend:  https://${host_short}/   (nginx → /var/www/darchiva)
  Agent UI:  ${REMOTE_AGENT_BIN}/darchiva-scan-agent

  Useful commands:
    Logs:     ssh ${DEPLOY_HOST} 'pm2 logs'
    Status:   ssh ${DEPLOY_HOST} 'pm2 list'
    Monitor:  ssh ${DEPLOY_HOST} 'pm2 monit'
    Restart:  ssh ${DEPLOY_HOST} 'pm2 restart darchiva-api'
    Migrate:  ./scripts/deploy.sh --migrate --no-frontend --no-agent --no-restart

INFO
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
	echo -e "\n${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
	echo -e "${B}  dArchiva Deployment${NC}  →  ${DEPLOY_HOST}"
	echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

	preflight
	server_setup
	pull_code
	build_frontend
	build_agent
	install_deps
	run_migrations
	deploy_nginx
	restart_services
	health_check
	print_summary
}

main "$@"
