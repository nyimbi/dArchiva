#!/usr/bin/env bash
# (c) Copyright Datacraft, 2026
# Setup script for dArchiva remote server prerequisites
#
# Run this on the target server before deploying:
#   curl -sSL https://raw.githubusercontent.com/your-repo/darchiva/main/scripts/deploy-config/setup-server.sh | bash
#
# Or copy and run manually.

set -euo pipefail

echo "=============================================="
echo "dArchiva Server Setup"
echo "=============================================="

# Detect OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$ID
else
    echo "Unsupported OS"
    exit 1
fi

echo "Detected OS: $OS"

# Install system packages
case $OS in
    ubuntu|debian)
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
        ;;
    centos|rhel|rocky|almalinux)
        sudo dnf install -y epel-release
        sudo dnf install -y \
            python3.11 python3.11-devel \
            postgresql \
            poppler-utils \
            tesseract tesseract-langpack-eng tesseract-langpack-deu \
            ImageMagick \
            ghostscript \
            nginx \
            certbot python3-certbot-nginx \
            git curl rsync
        ;;
    *)
        echo "Unsupported OS: $OS"
        echo "Please install manually: Python 3.11+, PostgreSQL client, Tesseract, ImageMagick, Nginx"
        exit 1
        ;;
esac

# Install uv (fast Python package manager)
if ! command -v uv &>/dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
fi

# Install Node.js via nvm (required for PM2)
if ! command -v node &>/dev/null; then
    echo "Installing Node.js via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
    echo "Node.js $(node --version) installed"
fi

# Install PM2 globally
if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    echo "PM2 $(pm2 --version) installed"
fi

# Setup PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true

# Create application user (optional, for production)
if ! id "darchiva" &>/dev/null; then
    echo "Creating darchiva user..."
    sudo useradd -r -s /bin/bash -d /opt/darchiva -m darchiva
fi

# Create directory structure
echo "Creating directories..."
sudo mkdir -p /opt/darchiva
sudo mkdir -p /var/lib/darchiva/media
sudo mkdir -p /var/log/darchiva
sudo mkdir -p /var/run/darchiva
sudo mkdir -p /etc/darchiva

# Set permissions
sudo chown -R darchiva:darchiva /opt/darchiva /var/lib/darchiva
sudo chown darchiva:darchiva /var/log/darchiva /var/run/darchiva
sudo chmod 755 /var/log/darchiva /var/run/darchiva

# Configure ImageMagick policy for PDF processing
echo "Configuring ImageMagick..."
POLICY_FILE="/etc/ImageMagick-6/policy.xml"
if [[ -f "$POLICY_FILE" ]]; then
    sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' "$POLICY_FILE"
fi

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Setup PM2 to start on boot
echo "Configuring PM2 startup..."
pm2 startup | tail -1 | sudo bash || true

echo ""
echo "=============================================="
echo "Server setup complete!"
echo "=============================================="
echo ""
echo "Installed:"
echo "  - Python: $(python3 --version 2>/dev/null || echo 'N/A')"
echo "  - Node.js: $(node --version 2>/dev/null || echo 'N/A')"
echo "  - PM2: $(pm2 --version 2>/dev/null || echo 'N/A')"
echo "  - uv: $(~/.local/bin/uv --version 2>/dev/null || echo 'N/A')"
echo ""
echo "Next steps:"
echo "1. Configure PostgreSQL database"
echo "2. Run: ./scripts/deploy.sh user@this-server --migrate --setup-pm2"
echo "3. Edit /etc/darchiva/env with your settings"
echo "4. Configure SSL: sudo certbot --nginx -d your-domain.com"
echo ""
echo "PM2 Commands:"
echo "  pm2 list          - Show running processes"
echo "  pm2 logs          - View logs"
echo "  pm2 monit         - Real-time monitoring"
echo "  pm2 save          - Save process list"
echo ""
