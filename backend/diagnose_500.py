import requests

try:
    print("Sending request to /api/company-list...")
    r = requests.get("http://127.0.0.1:8000/api/company-list")
    print(f"Status Code: {r.status_code}")
    if r.status_code != 200:
        print("Response Body (Error Details):")
        print(r.text)  # This will likely contain the detail message
    else:
        print("Success! Data sample:", r.json()[:5])
except Exception as e:
    print(f"Connection failed: {e}")
