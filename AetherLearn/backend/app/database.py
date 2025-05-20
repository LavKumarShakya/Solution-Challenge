import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "aetherlearn")

# Database client
client = None
db = None

async def init_db():
    global client, db
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB]
    
    # Create indexes for collections
    await db.users.create_index("email", unique=True)
    await db.learning_paths.create_index("query")
    await db.search_status.create_index("search_id", unique=True)
    
    print("Connected to MongoDB database:", MONGODB_DB)

async def close_db():
    if client:
        client.close()
        print("Closed MongoDB connection")
