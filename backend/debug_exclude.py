import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import CompanyExclude, CompanyMap

engine = create_engine('sqlite:///backend/healthcare.db')
Session = sessionmaker(bind=engine)
session = Session()

print("--- Exclude List ---")
excludes = session.query(CompanyExclude).all()
for e in excludes:
    print(f"- {e.company_name}")

print("\n--- Map List (First 10) ---")
maps = session.query(CompanyMap).limit(10).all()
for m in maps:
    print(f"{m.original_name} -> {m.standard_name}")
