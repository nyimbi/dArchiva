# (c) Copyright Datacraft, 2026
"""Load test script for scanner ingestion pipeline."""
import asyncio
import time
import uuid
import httpx
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
SCANNER_ID = "test-scanner-id"
API_KEY = "test-api-key"

async def simulate_scan_job(client, job_id, pages=50):
    """Simulate a single scan job with multiple pages."""
    start_time = time.time()
    
    # 1. Create Job
    response = await client.post(
        f"{BASE_URL}/scanners/jobs",
        json={
            "scanner_id": SCANNER_ID,
            "options": {"resolution": 300, "color_mode": "color"},
            "destination_folder_id": str(uuid.uuid4())
        }
    )
    if response.status_code != 201:
        print(f"Job {job_id} failed to create: {response.text}")
        return False

    # 2. Simulate ingestion (This would normally be handled by the hardware bridge)
    # Here we just check the job status and wait for completion
    job_data = response.json()
    actual_job_id = job_data['id']
    
    for _ in range(30):  # Poll for 30 seconds
        status_resp = await client.get(f"{BASE_URL}/scanners/jobs/{actual_job_id}")
        status = status_resp.json()['status']
        if status == 'completed':
            duration = time.time() - start_time
            print(f"Job {job_id} completed in {duration:.2f}s")
            return True
        elif status == 'failed':
            print(f"Job {job_id} failed")
            return False
        await asyncio.sleep(1)
    
    print(f"Job {job_id} timed out")
    return False

async def run_load_test(concurrency=10, jobs_per_worker=1):
    """Run multiple concurrent scan jobs."""
    async with httpx.AsyncClient(headers={"X-Scanner-API-Key": API_KEY}) as client:
        tasks = []
        for i in range(concurrency):
            for j in range(jobs_per_worker):
                tasks.append(simulate_scan_job(client, f"W{i}-J{j}"))
        
        results = await asyncio.gather(*tasks)
        success_count = sum(1 for r in results if r)
        print(f"\nLoad Test Complete: {success_count}/{len(results)} jobs successful")

if __name__ == "__main__":
    # This is a template script. In a real environment, 
    # you would run this against a live dev server.
    print("Starting simulated load test...")
    # asyncio.run(run_load_test())
