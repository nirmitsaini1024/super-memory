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

def parse_time_query(question: str):
    """Parse time-based queries like 'latest', 'recent', 'today', 'yesterday'"""
    import re
    from datetime import datetime, timedelta
    
    question_lower = question.lower()
    
    # Latest note queries
    if any(word in question_lower for word in ['latest', 'most recent', 'newest']):
        return {"type": "latest", "limit": 1}
    
    # Recent notes queries
    if any(word in question_lower for word in ['recent', 'recently']):
        return {"type": "recent", "days": 7}  # Last 7 days
    
    # Today's notes
    if any(word in question_lower for word in ['today', "today's"]):
        return {"type": "today"}
    
    # Yesterday's notes
    if any(word in question_lower for word in ['yesterday', "yesterday's"]):
        return {"type": "yesterday"}
    
    # Last week
    if any(phrase in question_lower for phrase in ['last week', 'past week']):
        return {"type": "recent", "days": 7}
    
    # Last month
    if any(phrase in question_lower for phrase in ['last month', 'past month']):
        return {"type": "recent", "days": 30}
    
    return None

def parse_tag_query(question: str):
    """Parse tag-based queries like 'tag:work', 'with tag important'"""
    import re
    
    question_lower = question.lower()
    
    # Pattern 1: "tag:work" or "tag:important"
    tag_pattern = r'tag:(\w+)'
    match = re.search(tag_pattern, question_lower)
    if match:
        return {"type": "tag", "tag": match.group(1)}
    
    # Pattern 2: "with tag work" or "tagged with important"
    with_tag_patterns = [
        r'with tag (\w+)',
        r'tagged with (\w+)',
        r'notes with (\w+) tag',
        r'(\w+) tagged notes'
    ]
    
    for pattern in with_tag_patterns:
        match = re.search(pattern, question_lower)
        if match:
            return {"type": "tag", "tag": match.group(1)}
    
    # Pattern 3: "my work notes" or "important notes"
    # This is more complex and might need a predefined list of common tags
    common_tags = ['work', 'important', 'personal', 'study', 'project', 'idea', 'todo', 'meeting', 'python', 'ai', 'machine learning', 'coding']
    for tag in common_tags:
        if f' {tag} ' in question_lower or f' {tag}s ' in question_lower or question_lower.endswith(f' {tag}'):
            return {"type": "tag", "tag": tag}
    
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
        from datetime import datetime, timedelta
        
        # Parse time and tag queries
        time_filter = parse_time_query(query.question)
        tag_filter = parse_tag_query(query.question)
        extracted_date = extract_date_from_question(query.question)
        
        # Determine query strategy based on filters
        if time_filter and time_filter["type"] == "latest":
            # For latest queries, get all notes and sort by timestamp
            results = collection.get(
                where={"user_id": query.user_id},
                limit=100  # Get more to sort from
            )
            
            if not results["ids"]:
                return {"answer": "No notes found.", "sources": []}
            
            # Sort by timestamp (newest first)
            if results["metadatas"]:
                # Create list of (index, timestamp) tuples
                indexed_timestamps = []
                for i, metadata in enumerate(results["metadatas"]):
                    if metadata and "timestamp" in metadata:
                        try:
                            timestamp = datetime.fromisoformat(metadata["timestamp"].replace('Z', '+00:00'))
                            indexed_timestamps.append((i, timestamp))
                        except:
                            continue
                
                if not indexed_timestamps:
                    return {"answer": "No notes with valid timestamps found.", "sources": []}
                
                # Sort by timestamp (newest first)
                indexed_timestamps.sort(key=lambda x: x[1], reverse=True)
                
                # Take only the latest note(s)
                limit = time_filter.get("limit", 1)
                latest_indices = [idx for idx, _ in indexed_timestamps[:limit]]
                
                # Filter results to only include latest notes
                # Note: collection.get() returns flat lists, not nested lists like collection.query()
                filtered_results = {
                    "ids": [[results["ids"][i] for i in latest_indices]],
                    "documents": [[results["documents"][i] for i in latest_indices]],
                    "metadatas": [[results["metadatas"][i] for i in latest_indices]],
                    "distances": [[]]  # No distances for get() queries
                }
                results = filtered_results
            else:
                return {"answer": "No notes with timestamps found.", "sources": []}
        
        elif time_filter and time_filter["type"] in ["today", "yesterday", "recent"]:
            # For time-based queries, get all notes and filter by date
            results = collection.get(
                where={"user_id": query.user_id},
                limit=1000  # Get more to filter from
            )
            
            if not results["ids"]:
                return {"answer": "No notes found.", "sources": []}
            
            # Calculate target date
            today = datetime.now().date()
            if time_filter["type"] == "today":
                target_date = today
            elif time_filter["type"] == "yesterday":
                target_date = today - timedelta(days=1)
            elif time_filter["type"] == "recent":
                days = time_filter.get("days", 7)
                target_date = today - timedelta(days=days)
            
            # Filter by date
            filtered_results = {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]]
            }
            
            for i, metadata in enumerate(results["metadatas"]):
                if metadata and "timestamp" in metadata:
                    try:
                        note_date = datetime.fromisoformat(metadata["timestamp"].replace('Z', '+00:00')).date()
                        if time_filter["type"] == "recent":
                            if note_date >= target_date:
                                filtered_results["ids"][0].append(results["ids"][i])
                                filtered_results["documents"][0].append(results["documents"][i])
                                filtered_results["metadatas"][0].append(metadata)
                        else:
                            if note_date == target_date:
                                filtered_results["ids"][0].append(results["ids"][i])
                                filtered_results["documents"][0].append(results["documents"][i])
                                filtered_results["metadatas"][0].append(metadata)
                    except:
                        continue
            
            if not filtered_results["ids"][0]:
                time_desc = time_filter["type"]
                if time_filter["type"] == "recent":
                    time_desc = f"last {time_filter.get('days', 7)} days"
                return {"answer": f"No notes found for {time_desc}.", "sources": []}
            
            results = filtered_results
        
        elif tag_filter:
            # For tag-based queries, get all notes and filter by tag
            results = collection.get(
                where={"user_id": query.user_id},
                limit=1000  # Get more to filter from
            )
            
            if not results["ids"]:
                return {"answer": "No notes found.", "sources": []}
            
            # Filter by tag
            filtered_results = {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]]
            }
            
            target_tag = tag_filter["tag"].lower()
            for i, metadata in enumerate(results["metadatas"]):
                if metadata and "tags" in metadata:
                    note_tags = metadata["tags"].lower()
                    if target_tag in note_tags:
                        filtered_results["ids"][0].append(results["ids"][i])
                        filtered_results["documents"][0].append(results["documents"][i])
                        filtered_results["metadatas"][0].append(metadata)
            
            if not filtered_results["ids"][0]:
                return {"answer": f"No notes found with tag '{tag_filter['tag']}'.", "sources": []}
            
            results = filtered_results
        
        else:
            # Regular semantic search
            results = collection.query(
                query_texts=[query.question],
                where={"user_id": query.user_id},
                n_results=query.top_k * 3  # Get more results to filter from
            )
        
        if not results["ids"][0]:
            return {"answer": "No relevant information found in your notes.", "sources": []}
        
        # Filter by specific date if specified (for date queries like "March 6, 2025")
        if extracted_date and not time_filter:
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
        
        # Handle different result structures (query vs get)
        if results["ids"] and isinstance(results["ids"][0], list):
            # This is from collection.query() - nested structure
            ids_list = results["ids"][0]
            documents_list = results["documents"][0]
            metadatas_list = results["metadatas"][0]
            distances_list = results["distances"][0] if "distances" in results and results["distances"][0] else []
        else:
            # This is from collection.get() - flat structure, but we wrapped it in nested lists
            ids_list = results["ids"][0] if results["ids"] and isinstance(results["ids"][0], list) else results["ids"]
            documents_list = results["documents"][0] if results["documents"] and isinstance(results["documents"][0], list) else results["documents"]
            metadatas_list = results["metadatas"][0] if results["metadatas"] and isinstance(results["metadatas"][0], list) else results["metadatas"]
            distances_list = results["distances"][0] if "distances" in results and results["distances"][0] else []
        
        for i, chunk_id in enumerate(ids_list):
            chunk_text = documents_list[i]
            metadata = metadatas_list[i]
            
            context_chunks.append(chunk_text)
            sources.append({
                "chunk_id": chunk_id,
                "note_id": metadata.get("note_id"),
                "text_snippet": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text,
                "relevance_score": distances_list[i] if i < len(distances_list) else 0
            })
        
        # Create prompt for AI with note IDs
        context_with_ids = []
        for i, chunk in enumerate(context_chunks):
            note_id = sources[i]["note_id"] if sources[i]["note_id"] else "unknown"
            context_with_ids.append(f"[Note ID: {note_id}]\n{chunk}")
        
        context = "\n\n".join(context_with_ids)
        
        # Add filter information to the prompt
        filter_info = ""
        if time_filter:
            if time_filter["type"] == "latest":
                filter_info = f"\nNote: This query is filtered to show your latest note(s)."
            elif time_filter["type"] == "today":
                filter_info = f"\nNote: This query is filtered for notes from today."
            elif time_filter["type"] == "yesterday":
                filter_info = f"\nNote: This query is filtered for notes from yesterday."
            elif time_filter["type"] == "recent":
                days = time_filter.get("days", 7)
                filter_info = f"\nNote: This query is filtered for notes from the last {days} days."
        
        if tag_filter:
            filter_info += f"\nNote: This query is filtered for notes with tag '{tag_filter['tag']}'."
        
        if extracted_date and not time_filter:
            filter_info += f"\nNote: This query is filtered for notes from {extracted_date}."
        
        prompt = f"""
        You are a personal assistant that answers questions using ONLY the user's personal notes provided below.
        Question: {query.question}{filter_info}
        
        Your personal notes (with Note IDs for reference):
        {context}
        
        Instructions:
        1. Answer the question using ONLY the information from your notes above
        2. If the notes don't contain enough information to answer the question, say "I don't have enough information in my notes to answer this question"
        3. Be specific about which information comes from the notes. Do not use general knowledge.
        4. Do not present yourself as an AI assistant.
        5. If a question requires information outside of the provided notes, respond only with: "I don't have enough information in my notes to answer this question."
        6. Do NOT mention Note IDs or technical references in your response. Keep the answer natural and user-friendly.
        7. If this is a time-filtered query (latest, today, yesterday, recent), acknowledge that the results are filtered by time.
        8. If this is a tag-filtered query, acknowledge that the results are filtered by the specified tag.
        9. If this is a date-specific query and no notes are found for that date, mention that no notes were found for the specified date.
        10. Use the Note IDs only internally to track which notes contain the information, but do not display them to the user.
        11. When multiple notes are found, format them clearly (e.g., "Here are your notes with tag 'ss':" followed by a list or clear separation between notes).
        12. If showing multiple notes, make it easy to distinguish between different notes.
        
        
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