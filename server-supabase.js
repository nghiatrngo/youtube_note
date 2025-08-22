const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client (will be set in environment variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('❌ Supabase connection failed:', error);
        } else {
            console.log('✅ Supabase connected successfully');
        }
    } catch (error) {
        console.error('❌ Supabase connection error:', error);
    }
}

// Initialize database tables
async function initializeDatabase() {
    try {
        // Create users table
        const { error: usersError } = await supabase.rpc('create_users_table');
        if (usersError && !usersError.message.includes('already exists')) {
            console.error('Users table creation error:', usersError);
        }

        // Create notes table
        const { error: notesError } = await supabase.rpc('create_notes_table');
        if (notesError && !notesError.message.includes('already exists')) {
            console.error('Notes table creation error:', notesError);
        }

        console.log('🗄️ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

// Test connection and initialize on startup
testConnection();
initializeDatabase();

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jsonwebtoken.verify(token, process.env.JWT_SECRET || 'supabase-secret-key', (err, user) => {
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
        message: 'YouTube Note Clipper API (Supabase)',
        version: '1.0.0',
        status: 'running',
        database: 'Supabase (No Expiration)'
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
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`)
            .single();

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                { username, email, password: hashedPassword }
            ])
            .select('id, username, email')
            .single();

        if (createError) {
            throw createError;
        }

        // Generate JWT token
        const token = jsonwebtoken.sign(
            { userId: newUser.id, username: newUser.username },
            process.env.JWT_SECRET || 'supabase-secret-key',
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
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (findError || !user) {
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
            process.env.JWT_SECRET || 'supabase-secret-key',
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
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email, created_at')
            .eq('id', req.user.userId)
            .single();

        if (error || !user) {
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

        const { data: note, error } = await supabase
            .from('notes')
            .insert([
                { 
                    user_id: userId, 
                    video_id: videoId, 
                    video_title: videoTitle, 
                    start_time: startTime, 
                    end_time: endTime, 
                    text 
                }
            ])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        const formattedNote = {
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        };

        res.status(201).json({ 
            message: 'Note created successfully', 
            note: formattedNote
        });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all user notes
app.get('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const formattedNotes = notes.map(note => ({
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        }));

        res.json({ notes: formattedNotes });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get notes for specific video
app.get('/api/notes/video/:videoId', authenticateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.userId)
            .eq('video_id', videoId)
            .order('start_time', { ascending: true });

        if (error) {
            throw error;
        }

        const formattedNotes = notes.map(note => ({
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        }));

        res.json({ notes: formattedNotes });
    } catch (error) {
        console.error('Get video notes error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { text, startTime, endTime } = req.body;

        // Validate required fields
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Note text is required' });
        }

        if (typeof startTime !== 'number' || typeof endTime !== 'number') {
            return res.status(400).json({ message: 'Start time and end time must be numbers' });
        }

        if (startTime >= endTime) {
            return res.status(400).json({ message: 'End time must be greater than start time' });
        }

        // Update the note
        const { data: note, error } = await supabase
            .from('notes')
            .update({
                text: text.trim(),
                start_time: startTime,
                end_time: endTime
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const formattedNote = {
            id: note.id,
            videoId: note.video_id,
            videoTitle: note.video_title,
            startTime: note.start_time,
            endTime: note.end_time,
            text: note.text,
            userId: note.user_id,
            createdAt: note.created_at
        };

        res.json({ message: 'Note updated successfully', note: formattedNote });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            throw error;
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
        uptime: process.uptime(),
        database: 'Supabase (No Expiration)'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Supabase YouTube Note Clipper running on port ${PORT}`);
    console.log(`🌐 API available at: http://localhost:${PORT}`);
    console.log(`🗄️ Using Supabase database (No Expiration!)`);
    console.log(`🌍 Ready for cross-device access!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    process.exit(0);
});
