from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from chromadb.config import Settings
import os
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime

app = FastAPI(title="Memory Engine")

# Add CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB
CHROMA_DB_PATH = "./chroma_langchain_db"
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

# Create ChromaDB client
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

class Note(BaseModel):
    text: str
    tags: List[str] = []
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str = "note"
    timestamp: datetime = Field(default_factory=datetime.now)


@app.post("/notes")
def create_note(note: Note):
    # Store in ChromaDB
    collection.add(
        documents=[note.text],
        metadatas=[{
            "tags": note.tags,
            "source": note.source,
            "timestamp": note.timestamp.isoformat()
        }],
        ids=[note.id]
    )
    return note


@app.get("/notes")
def get_notes():
    result = collection.get()
    return {
        "notes": [
            {
                "id": result["ids"][i],
                "text": result["documents"][i],
                "metadata": result["metadatas"][i]
            }
            for i in range(len(result["ids"]))
        ]
    }

@app.get("/notes/{note_id}")
def get_note_by_id(note_id: str):
    result = collection.get(ids=[note_id])
    if not result["ids"]:
        return {"error": "Note not found"}
    
    return {
        "id": result["ids"][0],
        "text": result["documents"][0],
        "metadata": result["metadatas"][0]
    }