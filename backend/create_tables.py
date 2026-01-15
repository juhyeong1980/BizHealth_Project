from main import engine
from models import Base

print("Creating all tables if they don't exist...")
Base.metadata.create_all(bind=engine)
print("Done.")
