
import requests
import json

URL = "http://127.0.0.1:8000/api/stats/retention?years=2024&years=2025"

try:
    res = requests.get(URL)
    data = res.json()
    print("Keys:", data.keys())
    if "details" in data:
        print("Backend IS updated (Found 'details').")
        print("2025 New Count:", len(data["details"].get("2025", {}).get("new", [])))
    else:
        print("Backend is OLD (No 'details').")
except Exception as e:
    print("Error:", e)
