from main import SessionLocal
from models import Checkup
from sqlalchemy import func

db = SessionLocal()

print("--- Inspecting '62' month rows ---")
# Find rows where substr(6,2) is '62' (which implies YYYYMMDD format processed by offset 6)
target_rows = db.query(
    Checkup.checkup_date,
    func.length(Checkup.checkup_date).label('len_raw'),
    func.length(func.trim(Checkup.checkup_date)).label('len_trim'),
    func.hex(Checkup.checkup_date).label('hex_val')
).filter(func.substr(func.trim(Checkup.checkup_date), 6, 2) == '62').limit(10).all()

for r in target_rows:
    print(f"Date: '{r.checkup_date}'")
    print(f"Len Raw: {r.len_raw}")
    print(f"Len Trim: {r.len_trim}")
    print(f"Hex: {r.hex_val}")
    print("-" * 20)

db.close()
