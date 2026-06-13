# dArchiva Scan Agent — Architecture & Developer Guide

## Overview

The scan agent is a single Go binary that runs on a scan workstation alongside physical scanners. It acts as the bridge between OS-level scanner APIs (TWAIN, SANE, ISIS) and the dArchiva REST API.

```
┌─────────────────────────────────────────────────────────┐
│                  dArchiva Scan Agent                     │
│                                                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ Scanner  │  │ Hot Folder │  │  Hotkey / Foot Pedal │ │
│  │ Registry │  │  Watcher   │  │      Manager         │ │
│  └────┬─────┘  └─────┬──────┘  └──────────┬───────────┘ │
│       │               │                    │             │
│       └───────────────┴────────────────────┘             │
│                       │ pages / files                    │
│                  ┌────▼─────┐                            │
│                  │  SQLite  │  (offline queue)            │
│                  │  Queue   │                            │
│                  └────┬─────┘                            │
│                  ┌────▼─────┐                            │
│                  │ Uploader │  (retry loop)               │
│                  └────┬─────┘                            │
│                       │  HTTP multipart POST             │
└───────────────────────┼──────────────────────────────────┘
                        │
               ┌────────▼────────┐
               │  dArchiva API   │
               │  :8000          │
               └─────────────────┘

   REST API :7780
   (browser / scan station UI → agent)
```

---

## Repository Layout

```
darchiva-scan-agent/
├── cmd/
│   └── agent/
│       ├── main.go          entry point — wires subsystems, HTTP server, signals
│       ├── tray.go          system tray (fyne.io/systray)
│       └── browser.go       openBrowser + drainViaAPI helpers
├── internal/
│   ├── config/
│   │   └── config.go        JSON config file, Manager with mutex-safe accessors
│   ├── scanner/
│   │   ├── interface.go     Driver interface, all shared types (Device, Job, Page…)
│   │   ├── registry.go      fan-out device listing, job lifecycle
│   │   ├── sane.go          SANE driver (linux/darwin build tag)
│   │   ├── twain_windows.go TWAIN driver (windows build tag)
│   │   ├── isis_windows.go  ISIS/Kofax driver (windows build tag)
│   │   ├── helpers_windows.go shared Windows helpers (dpiOrDefault)
│   │   ├── platforms_linux.go   platformDrivers() → [SANE]
│   │   ├── platforms_darwin.go  platformDrivers() → [SANE]
│   │   └── platforms_windows.go platformDrivers() → [ISIS, TWAIN]
│   ├── hotfolder/
│   │   └── watcher.go       fsnotify watcher, debounce, .processed/ archive
│   ├── hotkey/
│   │   ├── hotkey.go        Manager + Action constants (platform-agnostic)
│   │   ├── hotkey_linux.go  evdev /dev/input (linux build tag)
│   │   ├── hotkey_darwin.go Carbon RegisterEventHotKey + CGO (darwin build tag)
│   │   └── hotkey_windows.go Win32 RegisterHotKey (windows build tag)
│   ├── queue/
│   │   └── queue.go         SQLite-backed offline queue (modernc.org/sqlite)
│   ├── uploader/
│   │   └── uploader.go      HTTP client, multipart upload, retry loop
│   └── api/
│       └── handlers.go      HTTP mux, all route handlers, Services struct
├── docs/
│   └── ARCHITECTURE.md      this file
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## Subsystem Internals

### 1. Scanner Drivers (`internal/scanner/`)

#### Driver Interface

Every scanner backend implements one interface (`interface.go`):

```go
type Driver interface {
    Type() DriverType
    ListDevices(ctx context.Context) ([]Device, error)
    GetCapabilities(ctx context.Context, deviceID string) (Capabilities, error)
    Scan(ctx context.Context, params ScanParams) (<-chan Page, error)
    Close() error
}
```

`Scan` returns a channel. The driver sends one `Page` per scanned page and closes the channel when the job ends (ADF empty, flatbed done, or error). This lets the registry stream pages to the queue as they arrive rather than waiting for the entire job.

#### Device ID Conventions

Every driver prefixes its device IDs to prevent collisions in the registry:

| Driver | Prefix | Example |
|---|---|---|
| SANE | `sane:` | `sane:epson2:libusb:003:002` |
| TWAIN | `twain:` | `twain:1` (numeric TWAIN DS Id) |
| ISIS | `isis:` | `isis:Kodak i3200` |

#### SANE Driver (`sane.go` — `linux || darwin`)

Uses `scanimage` as a subprocess rather than CGO bindings to `libsane`. This avoids CGO complexity and makes cross-compilation straightforward.

**Single page scan:**
```
scanimage -d <device> --format=png --resolution=<dpi> --mode=<Color|Gray|Lineart> -o /tmp/darchiva-scan-<uuid>.png
```

**ADF batch scan:**
```
scanimage -d <device> --batch=/tmp/darchiva-batch-<uuid>/page%04d.png --batch-count=-1 --format=png ...
```

The batch goroutine waits for `scanimage` to exit, then reads all `page*.png` files from the temp directory and sends them on the channel. "Document feeder empty" on stderr is treated as normal ADF termination, not an error.

**Capabilities** are parsed from `scanimage -d <device> --help` output — specifically the `--resolution [75|150|300|600]` list and the presence of `ADF`/`duplex` strings.

**Production upgrade path:** Replace `exec.Command("scanimage", ...)` with CGO bindings to `libsane` (see comment in `sane.go`). The driver interface stays identical.

#### TWAIN Driver (`twain_windows.go` — `windows`)

Loads `twaindsm.dll` (or `twain_32.dll`) and calls `DSM_Entry` via `syscall.SyscallN` — no CGO, no TWAIN SDK headers required at compile time.

**TWAIN State Machine:**

```
State 1: Pre-session
  ↓ MSG_OPENDSM (DSM_Entry with hWnd=0 for headless)
State 2: DSM open
  ↓ MSG_GETFIRST / MSG_GETNEXT → enumerate Data Sources
  ↓ MSG_OPENDS (select DS by ID)
State 3: DS open
  ↓ Set capabilities: resolution, color mode, paper size, duplex
  ↓ MSG_ENABLEDS (headless mode via TWAIN 2.x DSM)
State 4/5: Scanning / Transfer Ready
  ↓ DAT_IMAGENATIVEXFER → HBITMAP → PNG/TIFF
  ↓ MSG_ENDXFER (loop for ADF)
State 2: Back to DSM open
  ↓ MSG_CLOSEDSM
State 1: Done
```

The full native transfer path requires a live scanner. The current implementation falls back to a **WIA PowerShell script** (`scanViaWIAScript`) which uses WIA COM automation — this covers most modern Windows scanners without requiring the TWAIN SDK headers.

**Full TWAIN path** (for future implementation): Set build tag `DARCHIVA_TWAIN_CGO=1`, link against the TWAIN SDK headers, and replace the `scanViaWIAScript` call with the native `DAT_IMAGENATIVEXFER` transfer loop.

#### ISIS Driver (`isis_windows.go` — `windows`)

Uses Kofax PixTools `ptscandemo.exe` as a subprocess (similar to SANE's `scanimage` approach). Searches for the executable in these locations:
- `C:\Program Files\Kofax\PixTools\bin\ptscandemo.exe`
- `C:\Program Files (x86)\Kofax\PixTools\bin\ptscandemo.exe`
- PATH (`isisan.exe` as fallback)

Arguments passed:
```
ptscandemo.exe --device "<name>" --dpi 300 --mode color --output /tmp/... --format tiff --adf --duplex
```

"No more pages" in stdout/stderr is treated as normal ADF termination.

#### Registry (`registry.go`)

The registry owns all loaded drivers and all active jobs.

**Device listing:** Fans out `ListDevices` to all drivers in parallel using a `sync.WaitGroup`. Driver errors are collected but don't block results from other drivers.

**Job lifecycle:**
```
StartScan()
  → creates Job{Status: JobQueued}
  → stores in jobs map
  → goroutine: runScan()
       → updateJobStatus(JobScanning)
       → driver.Scan() → <-chan Page
       → for each page: append to job.Pages
       → updateJobStatus(JobComplete | JobFailed)
```

Callers poll `GetJob(id)` to observe page accumulation. The API handler `watchAndEnqueue` polls every 500ms and enqueues each new `PageOK` page as it appears.

---

### 2. Hot Folder Watcher (`internal/hotfolder/`)

Uses `fsnotify` for cross-platform filesystem events. Key design decisions:

**Debouncing:** File system events are noisy — a single file copy can emit dozens of `Write` events. The watcher records the last-seen timestamp per path and only fires `IngestFunc` once the file hasn't changed for 1 second.

**Subdirectory recursion:** On `Create` events for directories, the watcher immediately adds the new directory to `fsnotify`. On startup it walks the entire tree.

**`.processed/` archive:** After ingest, files are `os.Rename()`'d into a `.processed/` subdirectory in the same parent folder. This is atomic on POSIX (same filesystem), prevents re-ingest on agent restart, and keeps an audit trail.

**Ingestable extensions:** `.pdf`, `.tif`, `.tiff`, `.jpg`, `.jpeg`, `.png`, `.bmp`. Change `isIngestable()` in `watcher.go` to extend.

---

### 3. Hotkey / Foot Pedal Runtime (`internal/hotkey/`)

The `hotkey.go` file defines the platform-agnostic interface and `Manager`. Platform implementations are selected at compile time via `//go:build` tags.

#### Linux (`hotkey_linux.go`)

Opens all `/dev/input/event*` devices and reads raw `input_event` structs. Checks the `EV_KEY` capability bit via `EVIOCGBIT` ioctl before opening each device.

The `EVIOCGBIT` ioctl number is computed inline (no dependency on `unix.EVIOCGBIT` which isn't available in all `golang.org/x/sys` versions):
```go
func eviocgbit(ev, length int) uintptr {
    // _IOC(_IOC_READ=2, 'E', 0x20+ev, length) — x86/arm layout
    return uintptr(2<<30 | 'E'<<8 | (0x20+ev) | length<<16)
}
```

Key codes are mapped from human-readable names (`"F9"` → `67`) using a static table of Linux `KEY_*` constants.

#### macOS (`hotkey_darwin.go`)

Uses Carbon `RegisterEventHotKey` via CGO. An OS pipe is used to pass hotkey IDs from the C callback back to Go without unsafe shared state:

```
C callback (hotKeyHandler)
  → write hotKeyID.id to pipe fd
Go goroutine (readLoop)
  → read 4 bytes from pipe
  → look up Action in idMap
  → send Event to channel
```

Requires the **Accessibility** permission (System Prefs → Security → Accessibility). Without it `RegisterEventHotKey` fails silently; the manager logs a warning and continues.

Virtual key codes use Carbon's numbering (different from Windows VK codes and Linux KEY_ codes).

#### Windows (`hotkey_windows.go`)

Uses `RegisterHotKey(hwnd=0, id, modifiers, vk)` which registers a system-wide hotkey. `GetMessage` in a background goroutine receives `WM_HOTKEY` messages and dispatches them as `Event` values.

`modNoRepeat = 0x4000` prevents key repeat from flooding the event channel.

---

### 4. Offline Queue (`internal/queue/`)

SQLite via `modernc.org/sqlite` (pure Go, no CGO). Single writer (`SetMaxOpenConns(1)`).

**Schema:**
```sql
CREATE TABLE jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_job_id TEXT NOT NULL,      -- scanner job ID (UUID)
    file_path   TEXT NOT NULL,      -- absolute path to scanned file
    project_id  TEXT NOT NULL,
    batch_id    TEXT NOT NULL DEFAULT '',
    meta        TEXT NOT NULL DEFAULT '{}',  -- JSON (page number, DPI, etc.)
    status      TEXT NOT NULL DEFAULT 'pending',
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT NOT NULL DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**State transitions:**
```
pending → uploading → done
pending → uploading → failed (attempts++)
failed  → uploading  (retry, if attempts < maxAttempts)
```

`NextPending(ctx, n, maxAttempts)` returns up to `n` jobs where `status IN ('pending','failed') AND attempts < maxAttempts`, ordered by `created_at ASC` (FIFO). This ensures jobs don't starve and older scans aren't indefinitely blocked by newer failures.

---

### 5. Uploader (`internal/uploader/`)

Polls the queue every 10 seconds. For each pending job:

1. `MarkUploading` — prevents concurrent upload attempts
2. `os.Open(job.FilePath)` — reads the scanned file
3. Multipart POST to `{server_url}/api/v1/documents/upload`:
   - Field `file` — the binary content
   - Field `project_id`
   - Field `batch_id` (if set)
   - Field `meta` — JSON blob (page number, DPI, dimensions)
   - Header `Authorization: Token {api_token}`
4. On 2xx: `MarkDone`
5. On error: `MarkFailed` (increments `attempts`, records `last_error`)

Timeout per upload: 120 seconds. The `Drain()` method can be called externally to force an immediate poll cycle (used after a scan completes).

---

### 6. HTTP API (`internal/api/`)

Standard library `net/http` with Go 1.22 pattern routing (`"GET /jobs/{id}"`). No third-party router needed.

The `Services` struct is injected at construction time:

```go
type Services struct {
    Registry   *scanner.Registry
    HotFolders *hotfolder.Watcher
    HotKeys    *hotkey.Manager  // nil if hotkey init failed
    Queue      *queue.Queue
    Uploader   *uploader.Uploader
    Config     *config.Manager
}
```

`HotKeys` may be nil if global hotkey registration fails (common in headless/CI environments). All hotkey handlers nil-check before calling methods.

---

### 7. Entry Point (`cmd/agent/main.go`)

Startup sequence:

1. Parse flags (`--log-level`, `--no-tray`)
2. Load config via `config.New()` (creates defaults on first run)
3. Create `os.TempDir()/darchiva-scans` for scan output files
4. Open SQLite queue at `{config_dir}/queue.db`
5. Create `uploader.Uploader` pointed at `cfg.ServerURL`
6. Create `hotfolder.Watcher` with the ingest callback
7. Restore hot folders from config
8. Create `hotkey.Manager` with bindings from config (non-fatal failure)
9. Create `context.Context` with cancel (shared across all subsystems)
10. Start hotkey event goroutine
11. Wire `api.Services`, create `api.Server`
12. Start uploader background loop
13. Start system tray goroutine (unless `--no-tray`)
14. Start HTTP server goroutine
15. Block on `SIGINT`/`SIGTERM`
16. Cancel context, graceful `httpServer.Shutdown`, `uploader.Stop`

---

## Data Flow Diagrams

### Scan → Upload

```
Operator presses F9 (hotkey)
  │
  ▼
POST /scan  {device_id, params, project_id, batch_id}
  │
  ▼
scanner.Registry.StartScan(ctx, params)
  │  returns Job immediately (status=queued)
  │
  ├─► goroutine: runScan()
  │     driver.Scan(ctx, params) → <-chan Page
  │     for page := range pageCh:
  │       job.Pages = append(job.Pages, page)
  │
  └─► goroutine: watchAndEnqueue(jobID, ...)
        polls GetJob() every 500ms
        for each new PageOK page:
          queue.Enqueue(Job{FilePath: page.Path, ...})
        on JobComplete:
          uploader.Drain()

Uploader.loop() [every 10s or on Drain()]
  queue.NextPending(ctx, 10, 5)
  for each job:
    queue.MarkUploading(id)
    POST {server_url}/api/v1/documents/upload
      (multipart: file, project_id, batch_id, meta)
    on 2xx → queue.MarkDone(id)
    on err  → queue.MarkFailed(id, errMsg)
```

### Hot Folder → Upload

```
File dropped into watched directory
  │
  ▼
fsnotify Create/Write event
  │  debounce 1s (pending map)
  ▼
isIngestable(filename) → true
  │
  ▼
IngestFunc(ctx, path, projectID, batchID)
  queue.Enqueue(Job{FilePath: path, Meta: {source: "hot_folder"}, ...})
  uploader.Drain()
  os.Rename(path, .processed/filename)
  │
  ▼
  (same upload path as above)
```

---

## Adding a New Scanner Driver

1. Create `internal/scanner/mydriver_<platform>.go` with the appropriate `//go:build` tag.
2. Implement the `Driver` interface. Use the `sane:` / `twain:` / `isis:` prefix pattern for device IDs.
3. Register it in the matching `platforms_<platform>.go`:

```go
//go:build myplatform

package scanner

func platformDrivers() []Driver {
    var drivers []Driver
    if d, err := newMyDriver(); err == nil {
        drivers = append(drivers, d)
    }
    // ... existing drivers
    return drivers
}
```

4. Add a `DriverType` constant in `interface.go`.
5. Build and test: `GOOS=myplatform go build ./...`

The registry picks up the new driver automatically — no other changes needed.

---

## Adding a New Hotkey Platform

1. Create `internal/hotkey/hotkey_<platform>.go` with the appropriate `//go:build` tag.
2. Implement the `Listener` interface:
   ```go
   type Listener interface {
       Register(action Action, keyCombo string) error
       Unregister(action Action)
       Events() <-chan Event
       Close()
   }
   ```
3. Implement `func newListener() (Listener, error)` — called by `hotkey.New()`.

The `Manager` in `hotkey.go` is platform-agnostic and wraps whichever `Listener` the platform file provides.

---

## Cross-Compilation Notes

| Target | CGO | Notes |
|---|---|---|
| darwin/arm64 | Required (hotkey Carbon framework) | Build natively on Apple Silicon |
| darwin/amd64 | Required | Build natively or use `SDKROOT` cross-compile |
| linux/amd64 | Not required | `CGO_ENABLED=0 GOOS=linux go build ./...` |
| linux/arm64 | Not required | `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build ./...` |
| windows/amd64 | Required for fyne.io/systray | Use `zig cc -target x86_64-windows` as C compiler |

The Makefile `windows` target uses `zig cc` for Windows cross-compilation from macOS/Linux. Install with `brew install zig` or from [ziglang.org](https://ziglang.org/download/).

For Linux and Windows builds where the system tray is not needed (headless server deployments), build with `--no-tray` at runtime — the binary still compiles with CGO_ENABLED=0.

---

## Dependencies

| Module | Version | Purpose |
|---|---|---|
| `fyne.io/systray` | v1.11.0 | Cross-platform system tray (replaces archived getlantern/systray) |
| `github.com/fsnotify/fsnotify` | v1.7.0 | Cross-platform filesystem events for hot folders |
| `github.com/google/uuid` | v1.6.0 | Job and hot folder ID generation |
| `golang.org/x/sys` | v0.20.0 | Windows DLL loading, Linux syscall constants |
| `modernc.org/sqlite` | v1.29.9 | Pure-Go SQLite for offline queue (no CGO) |

---

## Testing

```bash
# Unit tests (all platforms)
go test ./...

# Build check for all platforms
GOOS=linux GOARCH=amd64 go build ./...
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build ./...
go build ./...   # darwin (native)

# Integration test against a real scanner (Linux)
# Start agent and POST a scan:
darchiva-scan-agent --log-level=debug &
curl -X POST http://localhost:7780/scan \
  -H 'Content-Type: application/json' \
  -d '{"params":{"device_id":"sane:test","dpi":300,"color_mode":"color"},"project_id":"test"}'
curl http://localhost:7780/queue/stats
```

---

## Known Limitations & Future Work

| Area | Current State | Upgrade Path |
|---|---|---|
| TWAIN full transfer | WIA PowerShell fallback | Implement `DAT_IMAGENATIVEXFER` loop with CGO (comment in `twain_windows.go`) |
| SANE capabilities | Parsed from `--help` text | CGO bindings to `sane_get_option_descriptor()` for exact values |
| Hotkey events SSE | Not implemented | Add `GET /hotkey/events` Server-Sent Events endpoint for real-time UI |
| macOS hotkeys headless | Requires running event loop | Wrap in `CFRunLoopRun()` thread for headless daemon use |
| Page quality scoring | Not in agent | Agent is upload-only; quality scoring runs on the dArchiva backend via OpenCV + optional qwen2.5-VL |
| TWAIN duplex | Not wired | Add `CAP_DUPLEXENABLED` capability set before `MSG_ENABLEDS` |
| ISIS device listing | Parses subprocess JSON | Replace with direct ISIS SDK COM calls when headers available |
