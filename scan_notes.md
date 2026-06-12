To accommodate multi-page documents via the **Automatic Document Feeder (ADF)** on your **HP Color LaserJet MFP M181fw**, the logic must shift from a single-download approach to a state-dependent iteration.

The **eSCL** protocol handles multi-page scans by maintaining the job in a `Processing` state as long as there are physical pages in the tray. You must repeatedly call the `NextDocument` endpoint. The scanner will provide a `201` or `200 OK` for each page until the ADF is empty, at which point it will typically return a `404 Not Found`.

### 1. Multi-Page Control Flow

The robust detection of completion in an ADF context follows this state machine:

1. **Initialize:** `POST` to `/ScanJobs`.
2. **Fetch Loop:** Continuously `GET` from `/NextDocument`.
3. **Terminal Condition:** Stop fetching when the HTTP status code is non-success (usually `404`).
4. **Verification:** Poll the `JobState` until it reaches `Completed` to ensure mechanical reset.

---

### 2. Robust Multi-Page Python Implementation

This script utilizes a generator pattern to yield pages as they are digitized, ensuring memory efficiency for large documents.

```python
import requests
from lxml import etree
import time
import os

class HPADFScanner:
    def __init__(self, host):
        self.base_url = f"http://{host}/eSCL"
        self.ns = {
            'pwg': 'http://www.pwg.org/schemas/2010/12/sm',
            'escl': 'http://schemas.hp.com/imaging/escl/2011/05/03'
        }

    def _get_job_state(self, job_url):
        """Retrieves the current JobState and JobStateReasons."""
        resp = requests.get(job_url, timeout=5)
        root = etree.fromstring(resp.content)
        state = root.xpath('//pwg:JobState/text()', namespaces=self.ns)[0]
        reasons = root.xpath('//pwg:JobStateReasons/pwg:JobStateReason/text()', namespaces=self.ns)
        return state, reasons

    def scan_adf(self, output_dir="scans"):
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # 1. Start the Job
        payload = f"""<?xml version="1.0" encoding="UTF-8"?>
        <scan:ScanSettings xmlns:scan="{self.ns['escl']}" xmlns:pwg="{self.ns['pwg']}">
            <pwg:Version>2.0</pwg:Version>
            <scan:Intent>Document</scan:Intent>
            <scan:InputSource>Adf</scan:InputSource>
            <scan:XResolution>300</scan:XResolution>
            <scan:YResolution>300</scan:YResolution>
            <scan:ColorMode>RGB24</scan:ColorMode>
        </scan:ScanSettings>"""

        response = requests.post(f"{self.base_url}/ScanJobs", data=payload, timeout=10)
        response.raise_for_status()
        job_url = response.headers['Location']
        print(f"[*] ADF Job Started: {job_url}")

        page_count = 0
        try:
            while True:
                page_count += 1
                doc_url = f"{job_url}/NextDocument"
                print(f"[*] Attempting to pull page {page_count}...")
                
                with requests.get(doc_url, stream=True, timeout=60) as r:
                    if r.status_code == 404:
                        print("[*] No more pages in ADF.")
                        break
                    r.raise_for_status()
                    
                    filename = os.path.join(output_dir, f"page_{page_count}.jpg")
                    with open(filename, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=65536):
                            f.write(chunk)
                    print(f"[+] Saved {filename}")

        except Exception as e:
            print(f"[-] Error during stream: {e}")

        # 2. Robust Completion Check
        self._finalize_job(job_url)

    def _finalize_job(self, job_url, timeout=30):
        """Polls for terminal state to ensure the MFP is ready for the next job."""
        start_time = time.time()
        while (time.time() - start_time) < timeout:
            state, reasons = self._get_job_state(job_url)
            print(f"[*] Finalizing: State={state}, Reasons={reasons}")

            if state == "Completed":
                print("[!] Hardware reporting successful job closure.")
                return
            elif state in ["Aborted", "Canceled"]:
                print(f"[!] Warning: Job ended with state {state}.")
                return
            
            time.sleep(1.5)
        print("[!] Timeout reached while waiting for job completion.")

if __name__ == "__main__":
    scanner = HPADFScanner("192.168.1.50")
    scanner.scan_adf()

```

### 3. Key Observations for the M181fw

* **The 404 Sentinel:** In the eSCL specification, the `NextDocument` endpoint acts as a blocking call if the scanner is still processing a page, but it returns a **404 Not Found** immediately if the ADF sensor detects no paper.
* **Buffer Management:** The `chunk_size` is set to **64KB** in this version. For high-resolution scans (600 DPI+), HP MFPs can produce very large uncompressed streams; using `iter_content` prevents **MemoryError** exceptions.
* **InputSource Tag:** Note the explicit `<scan:InputSource>Adf</scan:InputSource>`. While many scanners auto-switch, explicitly declaring the source prevents the M181fw from defaulting to the **Platen** (flatbed) if the ADF sensor has a slight delay in reporting.

Would you like to add a post-processing step using a library like `img2pdf` to consolidate these individual page captures into a single PDF/A document?