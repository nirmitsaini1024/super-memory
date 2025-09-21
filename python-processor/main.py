from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from chromadb.config import Settings
import os

app = FastAPI(title="Memory Engine")

CHROMA_DB_PATH = "./chroma_langchain_db"
os.makedirs(CHROMA_DB_PATH, exist_ok=True)


chroma_client = chromadb.PersistentClient(
    path=CHROMA_DB_PATH,
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Get or create collection for documents
collection = chroma_client.get_or_create_collection(
    name="memory_documents",
    metadata={"description": "Memory engine document storage"}
)

origins = [
    "http://localhost:3000", "localhost:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Memory Engine is running"}

# Test ChromaDB connection
@app.get("/test-chroma")
def test_chroma():
    try:
        # Get collection info
        collection_info = collection.get()
        return {
            "status": "ok", 
            "message": "ChromaDB connected successfully",
            "collection_name": collection.name,
            "document_count": len(collection_info["ids"])
        }
    except Exception as e:
        return {"status": "error", "message": f"ChromaDB error: {str(e)}"}
