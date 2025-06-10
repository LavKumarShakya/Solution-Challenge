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
        print(f"❌ Failed to connect to MongoDB: {e}")
        print("🔄 Application will continue but database features may not work")
        # Set db to None so the app can still start
        db = None

async def get_db():
    """Get database instance with connection check for real Vertex AI integration"""
    global db
    
    if db is None:
        print("🔄 Attempting to reconnect to database for real integration...")
        await init_db()
    
    return db

async def test_database_connection() -> bool:
    """Test database connection and return status"""
    global db
    try:
        if db is None:
            await init_db()
        
        if db is not None:
            # Simple ping test
            await client.admin.command('ping')
            print("✅ Database connection test successful")
            return True
        else:
            print("❌ Database is None")
            return False
            
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

async def ensure_real_data_collections():
    """Ensure collections exist for real Vertex AI data storage"""
    global db
    
    if db is None:
        return
    
    try:
        # Required collections for real Vertex AI integration
        required_collections = [
            'learning_paths',
            'search_status',
            'saved_courses',
            'vertex_ai_content'  # For caching real search results
        ]
        
        existing_collections = await db.list_collection_names()
        
        for collection_name in required_collections:
            if collection_name not in existing_collections:
                await db.create_collection(collection_name)
                print(f"📝 Created collection for real data: {collection_name}")
        
        # Create additional indexes for Vertex AI content
        try:
            await db.vertex_ai_content.create_index("query")
            await db.vertex_ai_content.create_index("created_at")
            print("📚 Created Vertex AI content indexes")
        except Exception as e:
            print(f"⚠️ Failed to create Vertex AI indexes: {e}")
        
    except Exception as e:
        print(f"⚠️ Failed to ensure real data collections: {e}")

async def close_db():
    if client:
        client.close()
        print("Closed MongoDB connection")
