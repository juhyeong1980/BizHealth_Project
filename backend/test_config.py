import requests
import json

base_url = "http://127.0.0.1:8000"

def test_endpoint(name, url):
    try:
        print(f"Testing {name} ({url})...")
        r = requests.get(url)
        if r.status_code == 200:
            data = r.json()
            print(f"SUCCESS: {len(data)} items retrieved.")
            print(f"Sample: {str(data)[:100]}")
        else:
            print(f"ERROR: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_endpoint("Company List", f"{base_url}/api/company-list")
    test_endpoint("Company Map", f"{base_url}/api/company-map")
    test_endpoint("Exclude List", f"{base_url}/api/company-exclude")
