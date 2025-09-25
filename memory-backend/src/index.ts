import express from 'express';
import cors from 'cors';
import { clerkMiddleware, getAuth } from '@clerk/express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

// Clerk middleware for JWT verification
app.use(clerkMiddleware());

// Routes
app.get('/', (req, res) => {
  res.send('SuperMemory Backend - Python service handles all data operations');
});

// Public route - no authentication required
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Protected route - requires authentication
app.get('/user', (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to access this resource' 
    });
  }
  
  res.json({
    userId: auth.userId,
    sessionId: auth.sessionId,
    isAuthenticated: auth.isAuthenticated
  });
});

// Proxy route to Python service with user authentication
app.post('/api/notes', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to create notes' 
    });
  }
  
  try {
    // Forward request to Python service with user_id
    const pythonResponse = await fetch('http://localhost:8000/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...req.body,
        user_id: auth.userId
      })
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy route for getting notes
app.get('/api/notes', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to view notes' 
    });
  }
  
  try {
    const pythonResponse = await fetch(`http://localhost:8000/api/notes?user_id=${encodeURIComponent(auth.userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy route for querying notes
app.post('/api/query', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to query notes' 
    });
  }
  
  try {
    // Forward request to Python service with user_id
    const pythonResponse = await fetch('http://localhost:8000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...req.body,
        user_id: auth.userId
      })
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy route for querying notes with retriever
app.post('/api/query-retriever', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to query notes' 
    });
  }
  
  try {
    // Forward request to Python service with user_id
    const pythonResponse = await fetch('http://localhost:8000/api/query-retriever', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...req.body,
        user_id: auth.userId
      })
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy route for updating notes
app.put('/api/notes/:id', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to update notes' 
    });
  }
  
  try {
    const { id } = req.params;
    const pythonResponse = await fetch(`http://localhost:8000/api/notes/${id}?user_id=${encodeURIComponent(auth.userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy route for deleting notes
app.delete('/api/notes/:id', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in to delete notes' 
    });
  }
  
  try {
    const { id } = req.params;
    const pythonResponse = await fetch(`http://localhost:8000/api/notes/${id}?user_id=${encodeURIComponent(auth.userId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await pythonResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error forwarding to Python service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Add this at the very end, before app.listen
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!' 
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
