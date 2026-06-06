# app/core/database.py
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Read MongoDB URL from environment variable with a sensible default for local dev
# Set MONGO_URL in production to a secure value; e.g. export MONGO_URL="mongodb://..."
MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://localhost:27017/?directConnection=true",
)

# Create the Motor client
client = AsyncIOMotorClient(MONGO_URL)

# Access the specific database for our application
db = client.ai_interview

# Helper function to get the database instance
def get_db():
    return db
