import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

# Load environment variables
load_dotenv()

db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "3306")
db_user = os.getenv("DB_USER", "root")
db_password = os.getenv("DB_PASSWORD", "")
db_name = os.getenv("DB_NAME", "medical_ai")

print(os.getenv("PORT"))

# Construct Async MySQL Connection URL (using aiomysql or pymysql with asyncio)
# Note: For async SQLAlchemy with PyMySQL, we use the mysql+pymysql driver string
# DATABASE_URL = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
# Change this line in config/database.py:
DATABASE_URL = f"mysql+aiomysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
# Create SQLAlchemy Async Engine with connection pooling settings 
# (equivalent to connectionLimit: 10, waitForConnections: true)
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # max 10 open connections at once
    max_overflow=5,        # allow up to 5 additional temporary connections beyond pool_size
    pool_pre_ping=True,    # verifies connection health before using
    echo=False             # set to True if you want SQL query logging in console
)

# Create Session Factory for async database operations
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def test_connection():
    """
    Tests the database connection on startup.
    Crashes hard (exits) if the connection fails, exactly like the Node version.
    """
    try:
        async with engine.connect() as connection:
            # Execute a simple test query
            await connection.execute(text("SELECT 1"))
            print("✅ MySQL connected")
            print(f"   → {db_host}:{db_port} / {db_name}")
    except Exception as err:
        print(f"database connection failed {str(err)}")
        sys.exit(1)  # Crash hard — can't serve requests without DB

# Execute the connection test on module load (matching your index.js / db.js behavior)
import asyncio
try:
    asyncio.run(test_connection())
except RuntimeError:
    # Handles case where an event loop is already running in certain environments
    pass