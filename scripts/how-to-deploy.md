# dArchiva Deployment Guide

Complete guide for deploying, managing, and operating dArchiva in production.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Server Setup](#server-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Post-Deployment](#post-deployment)
7. [Management](#management)
8. [Operations](#operations)
9. [Troubleshooting](#troubleshooting)
10. [Security](#security)

---

## Overview

dArchiva is deployed as a multi-service application:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 443 (nginx) | React SPA served by nginx |
| API | 8000 | FastAPI backend (uvicorn) |
| Prefect Server | 4200 | Workflow orchestration UI |
| Prefect Worker | - | Background task processor |
| PostgreSQL | 5432 | Database (external) |

**Architecture:**
```
                    ┌─────────────┐
     HTTPS:443      │   nginx     │
    ──────────────► │  (reverse   │
                    │   proxy)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Frontend   │ │  API :8000  │ │ Prefect     │
    │  (static)   │ │  (uvicorn)  │ │ :4200       │
    └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │   :5432     │
                    └─────────────┘
```

---

## Prerequisites

### Local Machine (Development)
- Git
- Python 3.11+
- Node.js 18+ and npm
- SSH access to remote server

### Remote Server (Production)
- Ubuntu 22.04+ / Debian 12+ / RHEL 9+ / Rocky Linux 9+
- 4+ CPU cores, 8GB+ RAM (recommended)
- 50GB+ storage
- PostgreSQL 14+ (can be external/managed)
- Domain name with DNS configured

---

## Server Setup

### Option 1: Automated Setup

Run the setup script on your remote server:

```bash
# SSH into your server
ssh user@your-server.com

# Download and run setup script
curl -sSL https://raw.githubusercontent.com/your-repo/darchiva/main/scripts/deploy-config/setup-server.sh | bash
```

Or copy the script manually:

```bash
# From your local machine
scp scripts/deploy-config/setup-server.sh user@your-server.com:~/
ssh user@your-server.com 'chmod +x setup-server.sh && ./setup-server.sh'
```

### Option 2: Manual Setup

#### Install System Packages (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y \
    python3.11 python3.11-venv python3.11-dev \
    postgresql-client \
    libpq-dev \
    poppler-utils \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu \
    imagemagick \
    ghostscript \
    nginx \
    certbot python3-certbot-nginx \
    git curl rsync
```

#### Install uv (Python Package Manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Install Node.js and PM2

```bash
# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PM2
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
```

#### Create Directory Structure

```bash
sudo mkdir -p /opt/darchiva
sudo mkdir -p /var/lib/darchiva/media
sudo mkdir -p /var/www/darchiva
sudo mkdir -p /var/log/darchiva
sudo mkdir -p /var/run/darchiva
sudo mkdir -p /etc/darchiva

# Set ownership (replace 'deploy' with your deploy user)
sudo chown -R deploy:deploy /opt/darchiva /var/lib/darchiva /var/www/darchiva
sudo chown deploy:deploy /var/log/darchiva /var/run/darchiva
```

#### Configure ImageMagick for PDF Processing

```bash
sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' \
    /etc/ImageMagick-6/policy.xml
```

---

## Configuration

### 1. Database Setup

Create a PostgreSQL database:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE darchiva;
CREATE USER darchiva_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE darchiva TO darchiva_user;

-- For UUID extension
\c darchiva
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Environment Configuration

Create the environment file on the remote server:

```bash
sudo nano /etc/darchiva/env
```

Add the following configuration:

```bash
# =============================================================================
# dArchiva Environment Configuration
# =============================================================================

# Database (REQUIRED)
PM_DB_URL=postgresql://darchiva_user:your-secure-password@localhost:5432/darchiva

# Security (REQUIRED - generate with: openssl rand -hex 32)
PM_SECRET_KEY=your-64-character-hex-secret-key

# Storage
PM_MEDIA_ROOT=/var/lib/darchiva/media
PM_STORAGE_BACKEND=local

# Prefect Workflow Engine
PREFECT_API_URL=http://localhost:4200/api
PREFECT_API_DATABASE_CONNECTION_URL=${PM_DB_URL}

# Optional: Redis Cache
# PM_CACHE_ENABLED=true
# PM_REDIS_URL=redis://localhost:6379/0

# Optional: Search Backend
# PM_SEARCH_BACKEND=postgres
# PM_ELASTICSEARCH_HOSTS=http://localhost:9200

# Optional: Email (for notifications)
# PM_SMTP_HOST=smtp.example.com
# PM_SMTP_PORT=587
# PM_SMTP_USER=notifications@example.com
# PM_SMTP_PASSWORD=smtp-password
# PM_SMTP_FROM=dArchiva <notifications@example.com>

# Optional: Cloud Storage (Cloudflare R2)
# PM_R2_ACCOUNT_ID=your-account-id
# PM_R2_ACCESS_KEY_ID=your-access-key
# PM_R2_SECRET_ACCESS_KEY=your-secret-key
# PM_BUCKET_NAME=darchiva-documents
```

Secure the file:

```bash
sudo chmod 600 /etc/darchiva/env
sudo chown deploy:deploy /etc/darchiva/env
```

### 3. Nginx Configuration

Copy the nginx config:

```bash
sudo cp /opt/darchiva/scripts/deploy-config/nginx.conf /etc/nginx/sites-available/darchiva
sudo ln -sf /etc/nginx/sites-available/darchiva /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit the config to set your domain:

```bash
sudo nano /etc/nginx/sites-available/darchiva
```

Replace `darchiva.example.com` with your actual domain.

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

---

## Deployment

### First Deployment

From your local machine:

```bash
cd /path/to/papermerge-core

# Deploy with migrations and PM2 setup
./scripts/deploy.sh user@your-server.com --migrate --setup-pm2
```

### Subsequent Deployments

```bash
# Standard deployment (restarts services)
./scripts/deploy.sh user@your-server.com

# With migrations
./scripts/deploy.sh user@your-server.com --migrate

# Backend only (skip frontend)
./scripts/deploy.sh user@your-server.com --no-frontend

# Without restarting services
./scripts/deploy.sh user@your-server.com --no-restart
```

### Deployment Options

| Option | Description |
|--------|-------------|
| `-b, --branch NAME` | Git branch to deploy (default: main) |
| `-e, --env NAME` | Environment name (default: production) |
| `-m, --migrate` | Run database migrations |
| `-s, --setup-pm2` | Setup PM2 ecosystem and startup scripts |
| `-p, --no-prefect` | Disable Prefect server/worker |
| `-f, --no-frontend` | Skip frontend build and deployment |
| `-r, --no-restart` | Don't restart services after deploy |

---

## Post-Deployment

### 1. Verify Services

```bash
ssh user@your-server.com

# Check PM2 status
pm2 list

# Expected output:
# ┌─────────────────────────┬────┬─────────┬──────┬───────┐
# │ name                    │ id │ mode    │ ↺    │ status│
# ├─────────────────────────┼────┼─────────┼──────┼───────┤
# │ darchiva-api            │ 0  │ fork    │ 0    │ online│
# │ darchiva-prefect-server │ 1  │ fork    │ 0    │ online│
# │ darchiva-prefect-worker │ 2  │ fork    │ 0    │ online│
# └─────────────────────────┴────┴─────────┴──────┴───────┘
```

### 2. Check Endpoints

```bash
# API health
curl -s http://localhost:8000/docs | head -5

# Prefect health
curl -s http://localhost:4200/api/health

# Frontend (via nginx)
curl -s -o /dev/null -w '%{http_code}' https://your-domain.com/
```

### 3. Create Admin User

The CLI provides user management commands through the `pm` entry point:

```bash
ssh user@your-server.com
cd /opt/darchiva
source /etc/darchiva/env

# First, create the system user (required for audit tracking)
.venv/bin/pm users create-system-user

# Then create your admin user with --superuser flag
.venv/bin/pm users create --username admin --email admin@example.com --superuser

# You'll be prompted for password. Or use environment variables:
PAPERMERGE__AUTH__USERNAME=admin \
PAPERMERGE__AUTH__EMAIL=admin@example.com \
PAPERMERGE__AUTH__PASSWORD=your-secure-password \
.venv/bin/pm users create --superuser
```

**Available user commands:**
```bash
.venv/bin/pm users --help              # Show all user commands
.venv/bin/pm users ls                  # List all users
.venv/bin/pm users create              # Create a user (prompts for username/password)
.venv/bin/pm users create-system-user  # Create the system user
.venv/bin/pm users update <username> --superuser  # Make user a superuser
.venv/bin/pm users delete <username>   # Delete a user
```

---

## Management

### PM2 Commands

```bash
# View all processes
pm2 list

# View logs (all processes)
pm2 logs

# View logs for specific service
pm2 logs darchiva-api
pm2 logs darchiva-prefect-server
pm2 logs darchiva-prefect-worker

# Real-time monitoring
pm2 monit

# Restart services
pm2 restart darchiva-api
pm2 restart all

# Reload with zero-downtime
pm2 reload darchiva-api

# Stop services
pm2 stop all

# Start services
pm2 start all

# Save process list (for auto-start on reboot)
pm2 save

# View process details
pm2 describe darchiva-api
```

### Database Management

```bash
# Run migrations
cd /opt/darchiva
source /etc/darchiva/env
.venv/bin/alembic upgrade head

# Check migration status
.venv/bin/alembic current

# View migration history
.venv/bin/alembic history
```

### Log Files

| Log | Location |
|-----|----------|
| API | `/var/log/darchiva/api.log` |
| Prefect Server | `/var/log/darchiva/prefect-server.log` |
| Prefect Worker | `/var/log/darchiva/prefect-worker.log` |
| Nginx Access | `/var/log/nginx/darchiva_access.log` |
| Nginx Error | `/var/log/nginx/darchiva_error.log` |

View logs:

```bash
# Tail API logs
tail -f /var/log/darchiva/api.log

# View nginx errors
sudo tail -f /var/log/nginx/darchiva_error.log

# Search logs
grep "ERROR" /var/log/darchiva/api.log
```

---

## Operations

### Backups

#### Database Backup

```bash
# Manual backup
pg_dump -h localhost -U darchiva_user -d darchiva > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U darchiva_user -d darchiva | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated daily backup (add to crontab)
0 2 * * * pg_dump -h localhost -U darchiva_user -d darchiva | gzip > /var/backups/darchiva/db_$(date +\%Y\%m\%d).sql.gz
```

#### Media Files Backup

```bash
# Sync to backup location
rsync -avz /var/lib/darchiva/media/ /backup/darchiva-media/

# Or to remote storage
rsync -avz /var/lib/darchiva/media/ backup-server:/backups/darchiva-media/
```

### Restore

```bash
# Restore database
gunzip -c backup_20240115.sql.gz | psql -h localhost -U darchiva_user -d darchiva

# Restore media files
rsync -avz /backup/darchiva-media/ /var/lib/darchiva/media/
```

### Updates

```bash
# From local machine
./scripts/deploy.sh user@your-server.com --migrate

# If major version update, check release notes first
# May require additional migration steps
```

### Scaling

#### Increase API Workers

Edit PM2 config:

```bash
ssh user@your-server.com
nano /opt/darchiva/ecosystem.config.js
```

Change `--workers 4` to `--workers 8` (or desired count).

```bash
pm2 reload ecosystem.config.js
```

#### Add Prefect Workers

```bash
# Start additional worker
pm2 start /opt/darchiva/.venv/bin/prefect \
    --name "darchiva-prefect-worker-2" \
    -- worker start --pool darchiva-workflows

pm2 save
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs darchiva-api --lines 50

# Check if port is in use
sudo lsof -i :8000
sudo lsof -i :4200

# Verify environment file
cat /etc/darchiva/env

# Test database connection
source /etc/darchiva/env
psql $PM_DB_URL -c "SELECT 1"
```

### 502 Bad Gateway

```bash
# Check if API is running
pm2 list
curl http://localhost:8000/docs

# Check nginx config
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/darchiva_error.log
```

### Database Connection Errors

```bash
# Test connection
source /etc/darchiva/env
psql $PM_DB_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check firewall
sudo ufw status
```

### OCR Not Working

```bash
# Check Tesseract installation
tesseract --version
tesseract --list-langs

# Install additional languages
sudo apt-get install tesseract-ocr-fra tesseract-ocr-spa
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/darchiva/media/*
du -sh /var/log/darchiva/*

# Clean old logs (PM2 logrotate should handle this)
pm2 flush

# Clean old media files (be careful!)
find /var/lib/darchiva/media -type f -mtime +90 -name "*.tmp" -delete
```

### Memory Issues

```bash
# Check memory usage
free -h
pm2 monit

# Reduce worker count if needed
# Edit ecosystem.config.js: --workers 2

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Security

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### SSL/TLS

```bash
# Auto-renew certificates
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
0 0 1 * * certbot renew --quiet
```

### Security Headers

The nginx config includes security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Regular Updates

```bash
# System updates
sudo apt-get update && sudo apt-get upgrade -y

# Python dependencies (redeploy)
./scripts/deploy.sh user@your-server.com
```

### Audit Logs

dArchiva maintains audit logs in the database. Query them:

```sql
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

---

## Quick Reference

### Deployment Commands

```bash
# First deployment
./scripts/deploy.sh user@server.com --migrate --setup-pm2

# Update deployment
./scripts/deploy.sh user@server.com --migrate

# Backend only
./scripts/deploy.sh user@server.com --no-frontend
```

### Server Commands

```bash
# Service management
pm2 list                    # View status
pm2 logs                    # View logs
pm2 restart all             # Restart services
pm2 reload all              # Zero-downtime reload

# Database
cd /opt/darchiva && source /etc/darchiva/env
.venv/bin/alembic upgrade head

# Nginx
sudo nginx -t               # Test config
sudo systemctl reload nginx # Apply changes
```

### Useful Paths

| Path | Description |
|------|-------------|
| `/opt/darchiva` | Application code |
| `/var/www/darchiva` | Frontend static files |
| `/var/lib/darchiva/media` | Uploaded documents |
| `/var/log/darchiva` | Application logs |
| `/etc/darchiva/env` | Environment configuration |
| `/etc/nginx/sites-available/darchiva` | Nginx configuration |

---

## Support

For issues and feature requests, please visit:
- GitHub Issues: https://github.com/your-repo/darchiva/issues
- Documentation: https://docs.darchiva.com
