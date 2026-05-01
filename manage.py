#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import signal
import time
import threading
import requests


def analyze_loop():
    base_url = "http://127.0.0.1:8000"
    endpoint = f"{base_url}/api/terminator/analyze/"

    print(f"Starting forever loop → {endpoint}")

    while True:
        try:
            response = requests.post(endpoint, timeout=30)
            response.raise_for_status()
            print(f"[OK] {response.status_code} {response.text[:200]}")
            time.sleep(5)
        except Exception as exc:
            print(f"[ERROR] {exc}")
            time.sleep(30)


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    if len(sys.argv) > 1 and sys.argv[1] == 'runserver':
        if os.environ.get('RUN_MAIN') == 'true':
            t = threading.Thread(target=analyze_loop, daemon=True)
            t.start()

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()