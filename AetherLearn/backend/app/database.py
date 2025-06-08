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
    
    try:
        # Connect to MongoDB with SSL configuration
        if "mongodb+srv://" in MONGODB_URL:
            # For MongoDB Atlas connections, add SSL parameters
            client = AsyncIOMotorClient(
                MONGODB_URL,
                tls=True,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                maxPoolSize=10,
                retryWrites=True
            )
        else:
            # For local connections
            client = AsyncIOMotorClient(MONGODB_URL)
        
        db = client[MONGODB_DB]
        
        # Test the connection
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!")
        
        # Create indexes for collections (with error handling)
        try:
            await db.users.create_index("email", unique=True)
            print("Created users email index")
        except Exception as e:
            print(f"Users index creation failed (may already exist): {e}")
        
        try:
            await db.learning_paths.create_index("query")
            print("Created learning_paths query index")
        except Exception as e:
            print(f"Learning paths index creation failed (may already exist): {e}")
        
        try:
            await db.search_status.create_index("search_id", unique=True)
            print("Created search_status index")
        except Exception as e:
            print(f"Search status index creation failed (may already exist): {e}")
        
        print("Connected to MongoDB database:", MONGODB_DB)
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        print("Application will continue but database features may not work")
        # Set db to None so the app can still start
        db = None

async def close_db():
    if client:
        client.close()
        print("Closed MongoDB connection")
