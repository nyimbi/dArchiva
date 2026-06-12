#!/usr/bin/env python3
"""Upload sample documents to dArchiva via the API.

Usage:
    1. Start the dArchiva backend and frontend
    2. Log in to the UI and copy your authentication token from:
       localStorage.getItem('darchiva_token') in browser console
    3. Set the token: export DARCHIVA_TOKEN="your_token_here"
    4. Run: python upload_to_darchiva.py

Or use --auto to attempt automatic login with default credentials.
"""
import os
import sys
import argparse
import httpx
from pathlib import Path
import mimetypes
import time

# Configuration
API_BASE = os.environ.get('DARCHIVA_API', 'http://localhost:8000/api/v1')
IMAGES_DIR = Path(__file__).parent / "images"

def get_token() -> str | None:
    """Get auth token from environment or try auto-login."""
    return os.environ.get('DARCHIVA_TOKEN')

def auto_login(username: str = 'admin', password: str = 'admin123') -> str | None:
    """Try to auto-login and get token."""
    try:
        # OAuth2PasswordRequestForm expects form data, not JSON
        response = httpx.post(
            f"{API_BASE}/auth/token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0
        )
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token') or data.get('token')
        print(f"Auto-login failed: {response.status_code} - {response.text[:200]}")
        return None
    except Exception as e:
        print(f"Auto-login error: {e}")
        return None

def upload_file(client: httpx.Client, file_path: Path, project_id: str | None = None) -> bool:
    """Upload a single file to dArchiva."""
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if mime_type is None:
        mime_type = 'image/png'

    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, mime_type)}
        data = {}
        if project_id:
            data['project_id'] = project_id

        try:
            response = client.post(
                f"{API_BASE}/documents/upload-scan",
                files=files,
                data=data,
                timeout=30.0
            )
            if response.status_code in (200, 201):
                return True
            else:
                print(f"  Failed: {response.status_code} - {response.text[:200]}")
                return False
        except Exception as e:
            print(f"  Error: {e}")
            return False

def list_projects(client: httpx.Client) -> list:
    """List available scanning projects."""
    try:
        response = client.get(f"{API_BASE}/scanning-projects", timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception:
        return []

def main():
    parser = argparse.ArgumentParser(description='Upload sample documents to dArchiva')
    parser.add_argument('--auto', action='store_true', help='Try auto-login with default credentials')
    parser.add_argument('--username', default='admin', help='Username for auto-login')
    parser.add_argument('--password', default='admin123', help='Password for auto-login')
    parser.add_argument('--project', help='Scanning project ID to associate uploads with')
    parser.add_argument('--limit', type=int, default=0, help='Limit number of uploads (0=all)')
    args = parser.parse_args()

    # Check for images
    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}")
        print("Run download_samples.py first to generate sample documents.")
        sys.exit(1)

    images = list(IMAGES_DIR.glob("*.png")) + list(IMAGES_DIR.glob("*.jpg"))
    if not images:
        print("No images found in images directory.")
        sys.exit(1)

    print(f"Found {len(images)} images to upload")

    # Get authentication token
    token = get_token()
    if not token and args.auto:
        print(f"Attempting auto-login as {args.username}...")
        token = auto_login(args.username, args.password)

    if not token:
        print("\nNo authentication token found!")
        print("Options:")
        print("  1. Set DARCHIVA_TOKEN environment variable")
        print("  2. Use --auto flag to try auto-login")
        print("  3. Get token from browser: localStorage.getItem('darchiva_token')")
        sys.exit(1)

    # Create client with auth
    headers = {'Authorization': f'Bearer {token}'}
    client = httpx.Client(headers=headers)

    # List available projects
    projects = list_projects(client)
    if projects:
        print(f"\nAvailable scanning projects:")
        for p in projects:
            print(f"  - {p.get('name', 'Unnamed')} (ID: {p.get('id', 'N/A')})")

    # Upload files
    print(f"\nUploading to: {API_BASE}")
    if args.project:
        print(f"Project ID: {args.project}")

    success = 0
    failed = 0
    total = len(images) if args.limit == 0 else min(args.limit, len(images))

    for i, img_path in enumerate(images[:total], 1):
        print(f"[{i}/{total}] Uploading {img_path.name}...", end=' ')
        if upload_file(client, img_path, args.project):
            print("OK")
            success += 1
        else:
            failed += 1

        # Rate limiting
        if i % 10 == 0:
            time.sleep(0.5)

    print(f"\nUpload complete!")
    print(f"  Success: {success}")
    print(f"  Failed: {failed}")

    client.close()

if __name__ == "__main__":
    main()
