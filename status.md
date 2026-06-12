# Scanner Implementation Status

**Date:** 2026-01-23
**Scanner:** HP Color LaserJet MFP M181fw at 192.168.100.63
**Protocol:** eSCL (AirScan)

---

## Current Issue

**The scan completes on the physical scanner, but the UI stays in "Scanning..." state indefinitely.**

The frontend polls the backend for job status, but the job status never updates from 'scanning' to 'completed' because the background task that should download the scanned image and update the database is not executing properly.

---

## What Works

1. **Scanner Discovery** - Scanner is detected and shows as "online"
2. **Scan Job Creation** - POST to `/eSCL/ScanJobs` succeeds, scanner physically scans
3. **Image Ready** - Scanner reports `ImagesCompleted=1`, `ImagesToTransfer=1`
4. **Manual Download** - `curl -o test.jpg "http://192.168.100.63:80/eSCL/ScanJobs/{job}/NextDocument"` works perfectly

## What Doesn't Work

1. **Background Task Execution** - The `execute_scan_job_background` function doesn't run or complete
2. **Job Status Update** - Database job status stays at 'scanning', never becomes 'completed'
3. **Image Download** - Backend never downloads the scanned image from the scanner
4. **Frontend Detection** - Frontend times out after 120 seconds waiting for completion

---

## Key Files

### Backend (papermerge-core)

| File | Purpose |
|------|---------|
| `papermerge/core/features/scanners/router.py` | FastAPI endpoints, creates scan job and triggers background task |
| `papermerge/core/features/scanners/service.py` | Service layer with `execute_scan_job_background` and `execute_scan_job` functions |
| `papermerge/core/scanner/escl.py` | eSCL protocol implementation, handles HTTP communication with scanner |
| `papermerge/core/db/engine.py` | Database engine, defines `AsyncSessionLocal` |

### Frontend (darchiva-ui)

| File | Purpose |
|------|---------|
| `src/features/scanning-projects/api/index.ts` | API client with `createScanJob`, `getScanJob`, `quickScan` functions |

---

## Approaches Tried

### Approach 1: Async Function with BackgroundTasks (Original)
```python
# router.py
background_tasks.add_task(
    service.execute_scan_job_background,
    job_id=job.id,
    tenant_id=str(user.tenant_id),
)
```
**Result:** Background task never executed. Starlette's BackgroundTasks may have issues with async functions in certain configurations.

### Approach 2: Sync Function with asyncio.run()
```python
def execute_scan_job_background(job_id: str, tenant_id: str) -> None:
    asyncio.run(_execute_scan_job_background_async(job_id, tenant_id))
```
**Result:** Failed - `asyncio.run()` creates a new event loop which conflicts with SQLAlchemy async engine that was created in a different loop.

### Approach 3: Sync Function with new Event Loop
```python
def execute_scan_job_background(job_id: str, tenant_id: str) -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_execute_async(...))
    finally:
        loop.close()
```
**Result:** Failed - Same issue with SQLAlchemy async engine context.

### Approach 4: Native Async with New Session (Current)
```python
async def execute_scan_job_background(job_id: str, tenant_id: str) -> None:
    from papermerge.core.db.engine import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        result = await execute_scan_job(session=session, ...)
```
**Result:** Background task still not executing. Logs show "Background task STARTING" message is never printed.

### Approach 5: asyncio.create_task() (Latest - Untested)
```python
# router.py
asyncio.create_task(
    service.execute_scan_job_background(
        job_id=job.id,
        tenant_id=str(user.tenant_id),
    )
)
```
**Status:** Code changed but not tested yet. This approach runs the task immediately in the same event loop.

---

## Technical Details

### eSCL Protocol Flow
1. `POST /eSCL/ScanJobs` with XML settings → Returns `Location` header with job URL
2. `GET {job_url}/NextDocument` → Returns scanned image (JPEG/PDF)
3. 404 from NextDocument = no more pages (ADF empty)
4. Poll `GET /eSCL/ScannerStatus` for job state

### HP Scanner Quirks
- Uses port 8080 for eSCL API commands
- Uses port 80 for document retrieval (Location header returns full URL with port 80)
- Returns `JobState=Processing` while images are ready for download (not `Completed`)
- `ImagesCompleted > 0` indicates images are ready to download
- 503 errors when scanner is busy with pending jobs

### XML Namespace Issue (Previously Fixed)
Scanner requires `pwg:InputSource` not `scan:InputSource`:
```xml
<pwg:InputSource>Platen</pwg:InputSource>
```

---

## Debugging Steps

### Check Scanner Status
```bash
curl -s "http://192.168.100.63:80/eSCL/ScannerStatus"
```

### Check for Pending Jobs
Look for `<scan:JobInfo>` elements in scanner status. Delete if needed:
```bash
curl -s -X DELETE "http://192.168.100.63:80/eSCL/ScanJobs/{job_uuid}"
```

### Manual Scan Test
```bash
# Create job
curl -X POST "http://192.168.100.63:8080/eSCL/ScanJobs" \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:InputSource>Platen</pwg:InputSource>
  <scan:ColorMode>RGB24</scan:ColorMode>
  <scan:XResolution>300</scan:XResolution>
  <scan:YResolution>300</scan:YResolution>
</scan:ScanSettings>' -v

# Download image (use Location header from response)
curl -o scan.jpg "http://192.168.100.63:80/eSCL/ScanJobs/{job}/NextDocument"
```

---

## Next Steps

1. **Test asyncio.create_task() approach** - Server needs restart to pick up changes
2. **Add print() statements** - Logger may not be configured; try `print()` for immediate console output
3. **Check uvicorn logs** - Look for any errors in the terminal running the server
4. **Consider Celery** - If background tasks continue to fail, use Celery for reliable async task execution
5. **Add sync HTTP calls** - As a workaround, use synchronous `requests` library instead of async `httpx` in a thread

---

## Reference: scan_notes.md

The file `/Users/nyimbiodero/src/pjs/dArchiva/scan_notes.md` contains detailed notes about eSCL multi-page ADF scanning including a working Python implementation using a polling loop for `NextDocument` with 404 as the terminal condition.
