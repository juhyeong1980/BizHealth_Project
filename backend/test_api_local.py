import requests
import json

try:
    print("Testing /api/stats...")
    # No params = all data
    r = requests.get("http://127.0.0.1:8000/api/stats") 
    if r.status_code == 200:
        data = r.json()
        print("Keys:", data.keys())
        yt = data.get("YT", {})
        print("YT Sample:", list(yt.items())[:5])
        
        # Check if sums are 0
        total_rev = sum(d['rev'] for d in yt.values())
        print(f"Total Revenue in YT: {total_rev}")
    else:
        print(f"Error: {r.status_code} {r.text}")

    print("\nTesting /api/years...")
    r = requests.get("http://127.0.0.1:8000/api/years")
    print("Years:", r.json())
except Exception as e:
    print(f"Request failed: {e}")
