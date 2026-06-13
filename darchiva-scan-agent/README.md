# dArchiva Scan Agent

A cross-platform document scanning agent that bridges physical scanners to the [dArchiva](https://github.com/nyimbi/dArchiva) document management platform.

Runs as a local background process on a scan workstation. Exposes a REST API on `:7780` for scanner control, hot folder management, and queue status. Provides a system tray icon for operator convenience.

---

## Supported Platforms

| Platform | Scanner Protocols | Foot Pedals | System Tray |
|---|---|---|---|
| **Linux** | SANE (scanimage) | evdev `/dev/input` | libappindicator |
| **macOS** | SANE (scanimage via Homebrew) | Carbon RegisterHotKey | Native macOS |
| **Windows** | TWAIN (twaindsm.dll), ISIS (Kofax PixTools), WIA fallback | Win32 RegisterHotKey | Win32 systray |

---

## Installation

### Prerequisites

**Linux:**
```bash
sudo apt install sane-utils         # provides scanimage
sudo usermod -aG scanner $USER      # scanner access
sudo usermod -aG input $USER        # foot pedal access (evdev)
newgrp input
```

**macOS:**
```bash
brew install sane-backends
# For foot pedal / global hotkeys: grant Accessibility + Input Monitoring
# in System Preferences → Security & Privacy → Privacy
```

**Windows:**
- Install the TWAIN Data Source Manager: [twain.org/downloads](https://www.twain.org/downloads/)
- For ISIS/Kofax scanners: install Kofax PixTools SDK (provides `ptscandemo.exe`)
- Foot pedals (Olympus RS-31H, Infinity IN-USB-2, etc.) need no special driver — they register as HID keyboards

### Download a binary

```bash
# macOS (universal binary)
curl -L https://github.com/nyimbi/dArchiva/releases/latest/download/darchiva-scan-agent-darwin -o /usr/local/bin/darchiva-scan-agent
chmod +x /usr/local/bin/darchiva-scan-agent

# Linux amd64
curl -L https://github.com/nyimbi/dArchiva/releases/latest/download/darchiva-scan-agent-linux-amd64 -o /usr/local/bin/darchiva-scan-agent
chmod +x /usr/local/bin/darchiva-scan-agent
```

### Build from source

Requires Go 1.22+.

```bash
git clone https://github.com/nyimbi/dArchiva
cd dArchiva/darchiva-scan-agent
go build -o darchiva-scan-agent ./cmd/agent
```

Cross-compile all platforms (requires `zig` for Windows CGO):
```bash
make build-all        # darwin universal + linux amd64/arm64 + windows amd64
# Binaries land in dist/
```

---

## Quick Start

```bash
# Start the agent (creates default config on first run)
darchiva-scan-agent

# Point it at your dArchiva server
darchiva-scan-agent --log-level=debug

# Run without system tray (headless / server mode)
darchiva-scan-agent --no-tray
```

On first run the agent creates a config file at:
- **Linux/macOS:** `~/.config/darchiva-scan-agent/config.json`
- **Windows:** `%APPDATA%\darchiva-scan-agent\config.json`

---

## Configuration

Edit the config file directly, or use the REST API (`PUT /config`).

```json
{
  "server_url": "http://your-darchiva-server:8000",
  "api_token": "your-api-token",
  "default_project_id": "",
  "port": 7780,
  "hotkeys": {
    "scan_next_page":  "F9",
    "accept_page":     "F10",
    "reject_page":     "F11",
    "end_batch":       "F12",
    "capture_camera":  "Space"
  },
  "hot_folders": [],
  "upload": {
    "auto_upload": true,
    "retry_interval_s": 30,
    "max_retries": 5
  }
}
```

### Key settings

| Field | Default | Description |
|---|---|---|
| `server_url` | `http://localhost:8000` | dArchiva API base URL |
| `api_token` | — | dArchiva authentication token |
| `port` | `7780` | Local REST API port |
| `upload.auto_upload` | `true` | Upload pages immediately after scan |
| `upload.max_retries` | `5` | Retry attempts before marking a job failed |

### Hotkey syntax

Keys are case-insensitive. Modifiers are joined with `+`.

```
F9                  # function key alone
Ctrl+F1             # with modifier
Shift+F9
```

Supported modifiers: `Ctrl`, `Shift`, `Alt`, `Win` (Windows), `Cmd` (macOS), `Option` (macOS).

Supported keys: `F1`–`F12`, `Space`, `Enter`/`Return`, `Escape`, `Insert`, `Delete`, `Home`, `End`, `PageUp`, `PageDown`, arrow keys, `A`–`Z`.

---

## Foot Pedal Setup

USB foot pedals (Olympus RS-31H, Infinity IN-USB-2, PageFlip Firefly, generic HID pedals) register as standard keyboard devices — no special driver needed. Plug in the pedal, use the pedal manufacturer's configuration utility to assign key codes, then map those same key codes in the agent config:

```json
{
  "hotkeys": {
    "scan_next_page": "F9",
    "accept_page":    "F10",
    "reject_page":    "F11"
  }
}
```

**Linux:** The agent reads raw evdev events from `/dev/input/event*`. The user must be in the `input` group:
```bash
sudo usermod -aG input $USER && newgrp input
```

**macOS:** Grant **Input Monitoring** permission in System Preferences → Security & Privacy → Privacy → Input Monitoring.

**Windows:** The agent uses `RegisterHotKey` — works globally without special permissions.

---

## Hot Folders

A hot folder watches a directory and automatically ingests any document dropped into it (PDF, TIFF, JPEG, PNG, BMP).

### Add a hot folder via REST API

```bash
curl -X POST http://localhost:7780/hot-folders \
  -H 'Content-Type: application/json' \
  -d '{
    "path": "/mnt/scan-inbox",
    "project_id": "proj-abc123",
    "batch_id": "",
    "enabled": true
  }'
```

### How it works

1. The watcher uses `fsnotify` to monitor the directory tree recursively.
2. File system events are debounced by 1 second (waiting for the write to complete).
3. Once stable, the file is moved to a `.processed/` subdirectory and queued for upload.
4. The agent uploads it to `POST /api/v1/documents/upload` on the dArchiva server.

---

## REST API Reference

All endpoints are on `http://localhost:7780`. No authentication is required on the local port — restrict access with a firewall or bind to `127.0.0.1`.

### Health

```
GET /health
→ {"status":"ok","time":"..."}
```

### Devices

```
GET /devices
→ [{"id":"sane:epson2:libusb:003:002","name":"Epson GT-S50","driver":"sane","has_adf":true,...}]
```

### Scan

```
POST /scan
Body: {
  "params": {
    "device_id": "sane:epson2:libusb:003:002",
    "dpi": 300,
    "color_mode": "color",       // "bw" | "grayscale" | "color"
    "paper_size": "a4",          // "a4" | "a3" | "letter" | "legal" | "auto"
    "duplex": false,
    "use_adf": false,
    "auto_blank_detection": false,
    "barcode_detection": false
  },
  "project_id": "proj-abc123",
  "batch_id": "batch-xyz"
}
→ 202 {"job_id":"...", "status":"queued"}
```

### Jobs

```
GET  /jobs           → list all jobs
GET  /jobs/{id}      → get one job (includes pages array)
DELETE /jobs/{id}    → remove a completed job
```

**Job status values:** `queued` → `scanning` → `complete` | `failed`

**Page status values:** `ok` | `blank` | `error`

### Hot Folders

```
GET    /hot-folders          → list registered hot folders
POST   /hot-folders          → add a hot folder (see above)
DELETE /hot-folders/{id}     → remove a hot folder
```

### Hotkeys

```
GET /hotkeys                                   → current bindings
PUT /hotkeys                                   → update bindings
Body: {"scan_next_page":"F9","accept_page":"F10",...}
```

### Queue

```
GET  /queue/stats     → {"pending":3,"uploading":1,"done":142,"failed":0}
POST /queue/drain     → force immediate upload attempt
```

### Config

```
GET /config           → full config (api_token redacted as "***")
PUT /config           → partial update
Body: {"server_url":"http://...","api_token":"...","port":7780}
```

---

## Offline Operation

The agent maintains a SQLite queue (`queue.db` next to the config file). Scanned pages are enqueued immediately and uploaded in the background. If the dArchiva server is unreachable:

- Pages accumulate in the queue (no data loss)
- Upload retries every 10 seconds
- After 5 failed attempts a job is marked `failed` (still retained in the DB)
- Use `POST /queue/drain` to force a retry after the server comes back

---

## Running as a Service

**Linux (systemd):**
```ini
# /etc/systemd/system/darchiva-scan-agent.service
[Unit]
Description=dArchiva Scan Agent
After=network.target

[Service]
User=scanner-operator
ExecStart=/usr/local/bin/darchiva-scan-agent --no-tray
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now darchiva-scan-agent
```

**macOS (launchd):**
```xml
<!-- ~/Library/LaunchAgents/io.darchiva.scan-agent.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>io.darchiva.scan-agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/darchiva-scan-agent</string>
    <string>--no-tray</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
```
```bash
launchctl load ~/Library/LaunchAgents/io.darchiva.scan-agent.plist
```

**Windows (NSSM):**
```bat
nssm install dArchivaScanAgent "C:\Program Files\dArchiva\darchiva-scan-agent.exe"
nssm set dArchivaScanAgent AppParameters "--no-tray"
nssm start dArchivaScanAgent
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `scanimage not found` | SANE not installed | `apt install sane-utils` / `brew install sane-backends` |
| No devices listed | Permission denied | Add user to `scanner` group; on macOS grant "Input Monitoring" |
| Hotkeys not firing on Linux | Not in `input` group | `sudo usermod -aG input $USER` |
| Hotkeys not firing on macOS | Accessibility denied | System Prefs → Security → Accessibility → add agent |
| Upload fails repeatedly | Wrong `server_url` or token | `PUT /config` with correct values, then `POST /queue/drain` |
| TWAIN DSM not found | No TWAIN installed | Install from twain.org |
| ISIS device not found | PixTools not installed | Install Kofax PixTools SDK |

---

## License

Part of the [dArchiva](https://github.com/nyimbi/dArchiva) project.
