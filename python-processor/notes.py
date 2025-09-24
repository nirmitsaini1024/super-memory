from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import chromadb
from chromadb.config import Settings
import os
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import re

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Memory Engine")

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

CHROMA_DB_PATH = "./chroma_langchain_db"
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

chroma_client = chromadb.PersistentClient(
    path=CHROMA_DB_PATH,
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

collection = chroma_client.get_or_create_collection(
    name="memory_documents",
    metadata={"description": "Memory engine document storage"}
)

# Initialize text splitter and embeddings
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", " ", ""]
)

# Initialize OpenAI embeddings and LLM (lazy initialization)
embeddings = None
llm = None

def get_embeddings():
    global embeddings
    if embeddings is None:
        embeddings = OpenAIEmbeddings(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1"
        )
    return embeddings

def get_llm():
    global llm
    if llm is None:
        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1"
        )
    return llm

def extract_date_from_question(question: str):
    """Extract date information from natural language questions"""
    # Common date patterns
    date_patterns = [
        r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})',
        r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})',
        r'(\d{4})-(\d{1,2})-(\d{1,2})',
        r'(\d{1,2})/(\d{1,2})/(\d{4})',
        r'(\d{1,2})-(\d{1,2})-(\d{4})'
    ]
    
    month_names = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    
    question_lower = question.lower()
    
    for pattern in date_patterns:
        match = re.search(pattern, question_lower)
        if match:
            groups = match.groups()
            
            if len(groups) == 3:
                if groups[0] in month_names:  # "March 6, 2025"
                    month = month_names[groups[0]]
                    day = groups[1].zfill(2)
                    year = groups[2]
                elif groups[1] in month_names:  # "6 March 2025"
                    day = groups[0].zfill(2)
                    month = month_names[groups[1]]
                    year = groups[2]
                else:  # "2025-03-06" or "03/06/2025"
                    if len(groups[0]) == 4:  # YYYY-MM-DD
                        year, month, day = groups
                    else:  # MM/DD/YYYY or MM-DD-YYYY
                        month, day, year = groups
                        month = month.zfill(2)
                        day = day.zfill(2)
                
                return f"{year}-{month}-{day}"
    
    return None

class Note(BaseModel):
    text: str
    tags: List[str] = []
    user_id: str 
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str = "note"
    timestamp: datetime = Field(default_factory=datetime.now)

class QueryRequest(BaseModel):
    question: str
    user_id: str
    top_k: int = 5



@app.post("/notes")
def create_note(note: Note):
    # Split text into chunks
    chunks = text_splitter.split_text(note.text)
    
    # Prepare documents and metadata for each chunk
    documents = []
    metadatas = []
    ids = []
    
    for i, chunk in enumerate(chunks):
        chunk_id = f"{note.id}_chunk_{i}"
        documents.append(chunk)
        metadatas.append({
            "tags": ",".join(note.tags),
            "user_id": note.user_id,
            "source": note.source,
            "timestamp": note.timestamp.isoformat(),
            "note_id": note.id,
            "chunk_index": i,
            "total_chunks": len(chunks)
        })
        ids.append(chunk_id)
    
    # Store all chunks in ChromaDB
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    
    return {
        "note": note,
        "chunks_created": len(chunks),
        "chunk_ids": ids
    }


@app.get("/notes")
def get_notes(user_id: str):
    result = collection.get(where={"user_id": user_id})
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
def get_note_by_id(note_id: str, user_id: str):
    result = collection.get(ids=[note_id], where={"user_id": user_id})
    if not result["ids"]:
        return {"error": "Note not found"}
    
    return {
        "id": result["ids"][0],
        "text": result["documents"][0],
        "metadata": result["metadatas"][0]
    }

@app.put("/notes/{note_id}")
def update_note(note_id: str, user_id: str, update_data: dict):
    # Find all chunks for this note
    result = collection.get(where={
        "$and": [
            {"note_id": note_id},
            {"user_id": user_id}
        ]
    })
    if not result["ids"]:
        return {"error": "Note not found"}
    
    # Get the first chunk's metadata to preserve original data
    existing_metadata = result["metadatas"][0]
    
    # Get updated data
    updated_text = update_data.get("text", "")
    updated_tags = update_data.get("tags", [])
    
    # Convert tags list to comma-separated string if it's a list
    if isinstance(updated_tags, list):
        tags_string = ",".join(updated_tags)
    else:
        tags_string = updated_tags
    
    # Delete all existing chunks for this note
    collection.delete(ids=result["ids"])
    
    # Re-chunk the updated text
    chunks = text_splitter.split_text(updated_text)
    
    # Create new chunks with updated content
    new_documents = []
    new_metadatas = []
    new_ids = []
    
    for i, chunk in enumerate(chunks):
        chunk_id = f"{note_id}_chunk_{i}"
        new_documents.append(chunk)
        new_metadatas.append({
            "user_id": existing_metadata["user_id"],
            "tags": tags_string,
            "source": existing_metadata["source"],
            "timestamp": existing_metadata["timestamp"],
            "note_id": note_id,
            "chunk_index": i,
            "total_chunks": len(chunks)
        })
        new_ids.append(chunk_id)
    
    # Add the new chunks
    collection.add(
        documents=new_documents,
        metadatas=new_metadatas,
        ids=new_ids
    )
    
    return {"message": "Note updated successfully", "chunks_updated": len(chunks)}

@app.delete("/notes/{note_id}")
def delete_note(note_id: str, user_id: str):
    # Find all chunks for this note
    result = collection.get(where={
        "$and": [
            {"note_id": note_id},
            {"user_id": user_id}
        ]
    })
    if not result["ids"]:
        return {"error": "Note not found"}
    
    # Delete all chunks for this note
    collection.delete(ids=result["ids"])
    return {"message": "Note deleted successfully", "chunks_deleted": len(result["ids"])}

@app.post("/query")
def query_notes(query: QueryRequest):
    try:
        # Extract date from question if present
        extracted_date = extract_date_from_question(query.question)
        
        # Search for similar chunks (we'll filter by date after retrieval)
        results = collection.query(
            query_texts=[query.question],
            where={"user_id": query.user_id},
            n_results=query.top_k * 3  # Get more results to filter from
        )
        
        if not results["ids"][0]:
            return {"answer": "No relevant information found in your notes.", "sources": []}
        
        # Filter by date if specified
        if extracted_date:
            filtered_results = {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]]
            }
            
            for i, metadata in enumerate(results["metadatas"][0]):
                if metadata and "timestamp" in metadata:
                    note_date = metadata["timestamp"][:10]  # Get YYYY-MM-DD part
                    if note_date == extracted_date:
                        filtered_results["ids"][0].append(results["ids"][0][i])
                        filtered_results["documents"][0].append(results["documents"][0][i])
                        filtered_results["metadatas"][0].append(metadata)
                        if "distances" in results and results["distances"][0]:
                            filtered_results["distances"][0].append(results["distances"][0][i])
            
            # If no results after date filtering, return appropriate message
            if not filtered_results["ids"][0]:
                return {"answer": f"No notes found for {extracted_date}.", "sources": []}
            
            results = filtered_results
        
        # Prepare context from retrieved chunks
        context_chunks = []
        sources = []
        
        for i, chunk_id in enumerate(results["ids"][0]):
            chunk_text = results["documents"][0][i]
            metadata = results["metadatas"][0][i]
            
            context_chunks.append(chunk_text)
            sources.append({
                "chunk_id": chunk_id,
                "note_id": metadata.get("note_id"),
                "text_snippet": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text,
                "relevance_score": results["distances"][0][i] if "distances" in results else 0
            })
        
        # Create prompt for AI with note IDs
        context_with_ids = []
        for i, chunk in enumerate(context_chunks):
            note_id = sources[i]["note_id"] if sources[i]["note_id"] else "unknown"
            context_with_ids.append(f"[Note ID: {note_id}]\n{chunk}")
        
        context = "\n\n".join(context_with_ids)
        # Check if this is a date-specific query
        date_info = ""
        if extracted_date:
            date_info = f"\nNote: This query is filtered for notes from {extracted_date}."
        
        prompt = f"""
        You are a personal assistant that answers questions using ONLY the user's personal notes provided below.
        Question: {query.question}{date_info}
        
        Your personal notes (with Note IDs for reference):
        {context}
        
        Instructions:
        1. Answer the question using ONLY the information from your notes above
        2. If the notes don't contain enough information to answer the question, say "I don't have enough information in my notes to answer this question"
        3. Always reference the specific Note ID when citing information (e.g., "According to Note ID: abc123...")
        4. Be specific about which information comes from the notes. Do not use general knowledge.
        5. Do not present yourself as an AI assistant.
        6. If a question requires information outside of the provided notes, respond only with: "I don't have enough information in my notes to answer this question."
        7. Always include the Note ID when referencing specific information.
        8. If this is a date-specific query and no notes are found for that date, mention that no notes were found for the specified date.
        
        
        Answer:
        """
        
        # Generate AI response
        llm_instance = get_llm()
        response = llm_instance.invoke(prompt)
        answer = response.content
        
        return {
            "answer": answer,
            "sources": sources,
            "chunks_found": len(context_chunks)
        }
        
    except Exception as e:
        return {"error": f"Query failed: {str(e)}"}