#!/usr/bin/env python3
"""
Test script to debug scanner background task execution.
This script simulates the scanning process to verify that the background tasks work.
"""

import asyncio
import sys
import os

# Add the papermerge-core directory to the Python path
sys.path.insert(0, '/Users/nyimbiodero/src/pjs/dArchiva/papermerge-core')

async def test_background_task_creation():
    """Test that background tasks are created and executed properly."""
    print("Testing background task creation...")
    
    async def mock_scan_job(job_id: str):
        """Mock scan job function."""
        print(f"Mock scan job {job_id} started")
        await asyncio.sleep(1)  # Simulate scan time
        print(f"Mock scan job {job_id} completed")
        return {"success": True, "pages": 1}
    
    # Test asyncio.create_task
    print("Creating background task...")
    task = asyncio.create_task(mock_scan_job("test_job_123"))
    print(f"Task created: {task}")
    
    # Wait a bit to see if task starts
    await asyncio.sleep(0.5)
    print(f"Task status after 0.5s: {task.done()}")
    
    # Wait for task to complete
    result = await task
    print(f"Task completed with result: {result}")
    
    return True

async def test_task_with_reference():
    """Test that storing task reference prevents garbage collection."""
    print("\nTesting task with reference...")
    
    tasks = {}
    
    async def mock_scan_job(job_id: str):
        """Mock scan job function."""
        print(f"Mock scan job {job_id} started")
        await asyncio.sleep(1)  # Simulate scan time
        print(f"Mock scan job {job_id} completed")
        return {"success": True, "pages": 1}
    
    # Create task and store reference
    job_id = "test_job_456"
    task = asyncio.create_task(mock_scan_job(job_id))
    tasks[job_id] = task
    
    print(f"Task stored in dict: {task}")
    
    # Add cleanup callback
    task.add_done_callback(lambda t: tasks.pop(job_id, None))
    
    # Wait for task to complete
    await asyncio.sleep(1.5)
    print(f"Task completed, dict now contains: {list(tasks.keys())}")
    
    return True

async def main():
    """Main test function."""
    print("Starting scanner background task debug test...")
    
    # Test 1: Basic task creation
    try:
        result1 = await test_background_task_creation()
        print(f"Test 1 result: {result1}")
    except Exception as e:
        print(f"Test 1 failed: {e}")
        return False
    
    # Test 2: Task with reference
    try:
        result2 = await test_task_with_reference()
        print(f"Test 2 result: {result2}")
    except Exception as e:
        print(f"Test 2 failed: {e}")
        return False
    
    print("All tests completed successfully!")
    return True

if __name__ == "__main__":
    # Run the async main function
    success = asyncio.run(main())
    sys.exit(0 if success else 1)