const express = require('express');
const bcrypt = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'youtube_notes.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Notes table
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        video_id TEXT NOT NULL,
        video_title TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    console.log('🗄️ Local SQLite database initialized');
});

// Helper function to run database queries with promises
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jsonwebtoken.verify(token, process.env.JWT_SECRET || 'local-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
        const existingUser = await getQuery('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await runQuery(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // Generate JWT token
        const token = jsonwebtoken.sign(
            { userId: result.id, username },
            process.env.JWT_SECRET || 'local-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: result.id, username, email }
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
        const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
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
            process.env.JWT_SECRET || 'local-secret-key',
            { expiresIn: '24h' }
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
        const user = await getQuery('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.user.userId]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
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

        const result = await runQuery(
            'INSERT INTO notes (user_id, video_id, video_title, start_time, end_time, text) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, videoId, videoTitle, startTime, endTime, text]
        );

        const note = {
            id: result.id,
            videoId,
            videoTitle,
            startTime,
            endTime,
            text,
            userId
        };

        res.status(201).json({ message: 'Note created successfully', note });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all user notes
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await allQuery(
            'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.userId]
        );

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
        const notes = await allQuery(
            'SELECT * FROM notes WHERE user_id = ? AND video_id = ? ORDER BY start_time ASC',
            [req.user.userId, videoId]
        );

        res.json({ notes });
    } catch (error) {
        console.error('Get video notes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await runQuery(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Local YouTube Note Clipper running on port ${PORT}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
    console.log(`🗄️ Using local SQLite database: ${dbPath}`);
    console.log(`💾 All data stored locally - no external services required!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});
