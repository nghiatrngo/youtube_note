const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://nghiatrngo.github.io',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'https://nghiatrngo.github.io');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Database connection (will be set in Render environment variables)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Database connected successfully');
    }
});

// Initialize database tables
async function initializeDatabase() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                video_id VARCHAR(20) NOT NULL,
                video_title VARCHAR(255) NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('🗄️ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

// Initialize database on startup
initializeDatabase();

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jsonwebtoken.verify(token, process.env.JWT_SECRET || 'cloud-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'YouTube Note Clipper API',
        version: '1.0.0',
        status: 'running'
    });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        const newUser = result.rows[0];

        // Generate JWT token
        const token = jsonwebtoken.sign(
            { userId: newUser.id, username: newUser.username },
            process.env.JWT_SECRET || 'cloud-secret-key',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jsonwebtoken.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'cloud-secret-key',
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create note
app.post('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { videoId, videoTitle, startTime, endTime, text } = req.body;
        const userId = req.user.userId;

        const result = await pool.query(
            'INSERT INTO notes (user_id, video_id, video_title, start_time, end_time, text) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, videoId, videoTitle, startTime, endTime, text]
        );

        const note = result.rows[0];

        res.status(201).json({ 
            message: 'Note created successfully', 
            note: {
                id: note.id,
                videoId: note.video_id,
                videoTitle: note.video_title,
                startTime: note.start_time,
                endTime: note.end_time,
                text: note.text,
                userId: note.user_id,
                createdAt: note.created_at
            }
        });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all user notes
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );

        const notes = result.rows.map(note => ({
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        }));

        res.json({ notes });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get notes for specific video
app.get('/api/notes/video/:videoId', authenticateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        const result = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 AND video_id = $2 ORDER BY start_time ASC',
            [req.user.userId, videoId]
        );

        const notes = result.rows.map(note => ({
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        }));

        res.json({ notes });
    } catch (error) {
        console.error('Get video notes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Update request for note ID:', req.params.id);
        console.log('📝 Update data:', req.body);
        console.log('👤 User ID:', req.user.userId);
        
        const { id } = req.params;
        const userId = req.user.userId;
        const { text, startTime, endTime } = req.body;

        // Validate required fields
        if (!text || startTime === undefined || endTime === undefined) {
            return res.status(400).json({ message: 'Missing required fields: text, startTime, endTime' });
        }

        // Update the note
        const result = await pool.query(
            'UPDATE notes SET text = $1, start_time = $2, end_time = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [text, startTime, endTime, id, userId]
        );

        if (result.rowCount === 0) {
            console.log('❌ Note not found for update');
            return res.status(404).json({ message: 'Note not found' });
        }

        const updatedNote = result.rows[0];
        console.log('✅ Note updated successfully:', updatedNote);
        
        res.json({ 
            message: 'Note updated successfully', 
            note: {
                id: updatedNote.id,
                videoId: updatedNote.video_id,
                videoTitle: updatedNote.video_title,
                startTime: updatedNote.start_time,
                endTime: updatedNote.end_time,
                text: updatedNote.text,
                userId: updatedNote.user_id,
                createdAt: updatedNote.created_at
            }
        });
    } catch (error) {
        console.error('❌ Error updating note:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await pool.query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Database health check endpoint for authenticated users
app.get('/api/health', authenticateToken, async (req, res) => {
    try {
        console.log('🏥 Database health check for user:', req.user.userId);
        
        // Check database connection
        const dbCheck = await pool.query('SELECT NOW()');
        
        // Get user's notes for analysis
        const notesResult = await pool.query(
            'SELECT id, video_id, text, created_at FROM notes WHERE user_id = $1',
            [req.user.userId]
        );
        
        const notes = notesResult.rows;
        
        // Analyze note consistency
        const idAnalysis = {
            totalNotes: notes.length,
            notesWithId: notes.filter(n => n.id).length,
            notesWithValidId: notes.filter(n => n.id && Number.isInteger(n.id)).length,
            notesWithText: notes.filter(n => n.text && n.text.trim()).length,
            notesWithVideoId: notes.filter(n => n.video_id && n.video_id.trim()).length,
            databaseStatus: dbCheck.rowCount > 0 ? 'connected' : 'disconnected'
        };
        
        console.log('📊 Database health analysis:', idAnalysis);
        
        res.json({ 
            status: 'healthy',
            message: 'Database health check completed',
            analysis: idAnalysis,
            database: 'PostgreSQL',
            connection: 'active'
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({ 
            status: 'unhealthy',
            message: 'Health check failed',
            error: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Cloud YouTube Note Clipper running on port ${PORT}`);
    console.log(`🌐 API available at: http://localhost:${PORT}`);
    console.log(`🗄️ Using PostgreSQL database`);
    console.log(`🌍 Ready for cross-device access!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    pool.end();
    process.exit(0);
});
