import requests
import json

API_URL = "http://127.0.0.1:8000"

def test_period_exclude():
    # personal checkup '개인종합검진' is excluded in DB.
    # Query for 2024 full year
    resp = requests.get(f"{API_URL}/api/stats/period", params={"start_date": "2024-01-01", "end_date": "2024-12-31"})
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} {resp.text}")
        return

    data = resp.json()
    by_biz = data.get("byBiz", {})
    
    # Check if '개인종합검진' is in keys
    found = '개인종합검진' in by_biz
    print(f"Is '개인종합검진' in result? {found}")
    
    if found:
        print("FAIL: Excluded item found in result.")
    else:
        print("PASS: Excluded item NOT found.")
        
    # Also check if random other company exists
    print(f"Total companies in byBiz: {len(by_biz)}")
    print("Top 5:", list(by_biz.keys())[:5])

if __name__ == "__main__":
    test_period_exclude()
