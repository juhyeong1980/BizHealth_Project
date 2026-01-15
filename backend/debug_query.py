from main import SessionLocal
from models import Checkup
from sqlalchemy import distinct

try:
    db = SessionLocal()
    print("Querying distinct companies...")
    rows = db.query(distinct(Checkup.company_name)).all()
    print("Row 0:", rows[0] if rows else "No data")
    
    result = sorted([r[0] or "미지정" for r in rows if r[0]])
    print("Success! Found:", len(result))
except Exception as e:
    print("FATAL ERROR:")
    print(e)
finally:
    db.close()
