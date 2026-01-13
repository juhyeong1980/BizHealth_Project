import os
from sqlalchemy import create_engine, text

db_path = "healthcare.db"
if not os.path.exists(db_path):
    print("DB not found")
    exit()

engine = create_engine(f'sqlite:///{db_path}')
with engine.connect() as conn:
    print("--- Checkup Table Sample (First 5) ---")
    try:
        result = conn.execute(text("SELECT * FROM tb_checkup LIMIT 5"))
        for row in result:
            print(row)
        
        print("\n--- Count by Year ---")
        result = conn.execute(text("SELECT substr(checkup_date, 1, 4) as year, count(*) as cnt, sum(total_price) as rev FROM tb_checkup GROUP BY year ORDER BY year DESC"))
        for row in result:
            print(f"Year: {row.year}, Count: {row.cnt}, Revenue: {row.rev}")
    except Exception as e:
        print(f"Error: {e}")
