from main import SessionLocal
from models import Checkup
from sqlalchemy import func, case

db = SessionLocal()

print("--- 1. Sample Checkup Dates ---")
dates = db.query(Checkup.checkup_date).limit(20).all()
for d in dates:
    print(f"Date: '{d[0]}'")

print("\n--- 2. Monthly Aggregation Debug (2022, 2023) ---")
for year in ['2022', '2023']:
    print(f"\nChecking Year: {year}")
    c5 = func.substr(func.trim(Checkup.checkup_date), 5, 1)
    month_expr = case(
        (c5.in_(['-', '.', '/']), func.substr(func.trim(Checkup.checkup_date), 6, 2)),
        else_=func.substr(func.trim(Checkup.checkup_date), 5, 2)
    ).label("month")

    q = db.query(
        func.substr(Checkup.checkup_date, 1, 4).label("year"),
        month_expr,
        func.count(Checkup.receipt_no).label("cnt"),
        func.sum(Checkup.total_price).label("rev")
    ).filter(func.substr(Checkup.checkup_date, 1, 4) == year)\
     .group_by("year", "month")
    
    rows = q.all()
    if not rows:
        print("No data found.")
    for r in rows:
        print(f"Year: {r.year}, Month: {r.month}, Count: {r.cnt}, Rev: {r.rev}")

db.close()
