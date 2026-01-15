import requests

base_url = "http://127.0.0.1:8000"

def check(url):
    try:
        r = requests.get(url)
        print(f"{url}: {r.status_code}")
        if r.status_code != 200:
             print(r.text)
    except Exception as e:
        print(f"{url}: Failed - {e}")

print("Checking Config APIs...")
check(f"{base_url}/api/company-list")
check(f"{base_url}/api/company-map")
check(f"{base_url}/api/company-exclude")
