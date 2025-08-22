const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://nghiatrngo.github.io',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📋 Request body:', req.body);
  }
  next();
});

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

// MongoDB Connection
console.log('🗄️ Connecting to MongoDB...');
console.log('🔗 Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube_notes');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube_notes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  videoTitle: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Routes

// User Registration
app.post('/api/auth/register', [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  console.log('🚀 POST /api/auth/register - Registration request received');
  console.log('📋 Request body:', { 
    username: req.body.username, 
    email: req.body.email, 
    password: req.body.password ? '***' : 'missing' 
  });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      
      // Create user-friendly error messages
      const errorMessages = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));
      
      console.log('📝 Formatted error messages:', errorMessages);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errorMessages 
      });
    }
    console.log('✅ Validation passed');

    const { username, email, password } = req.body;

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('❌ User already exists:', { email, username });
      return res.status(400).json({ message: 'User already exists' });
    }
    console.log('✅ No existing user found');

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed successfully');

    // Create user
    console.log('👤 Creating new user...');
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    console.log('✅ User saved to database:', { userId: user._id, username: user.username });

    // Generate token
    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    console.log('✅ JWT token generated');

    console.log('🎉 Registration successful, sending response');
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('💥 Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User Profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Notes Routes

// Create Note
app.post('/api/notes', authenticateToken, [
  body('videoId').notEmpty(),
  body('videoTitle').notEmpty(),
  body('startTime').isNumeric(),
  body('endTime').isNumeric(),
  body('text').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId, videoTitle, startTime, endTime, text } = req.body;

    const note = new Note({
      userId: req.user._id,
      videoId,
      videoTitle,
      startTime,
      endTime,
      text
    });

    await note.save();

    res.status(201).json({
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User's Notes with ID consistency validation
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Validate and repair ID consistency
    const validatedNotes = await validateAndRepairNoteIds(notes, req.user._id);
    
    console.log(`📊 Retrieved ${validatedNotes.length} notes for user ${req.user._id}`);
    console.log(`🔍 ID validation completed for user ${req.user._id}`);
    
    res.json({ notes: validatedNotes });
  } catch (error) {
    console.error('❌ Error retrieving notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Database consistency validation and repair function
async function validateAndRepairNoteIds(notes, userId) {
  console.log(`🔧 Validating ${notes.length} notes for user ${userId}`);
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    let needsUpdate = false;
    
    // Check if note has both id and _id
    if (!note.id && note._id) {
      // Missing id field - add it
      note.id = note._id.toString().slice(-6); // Use last 6 chars of _id as id
      needsUpdate = true;
      console.log(`🔧 Adding missing id field for note ${note._id}: ${note.id}`);
    } else if (note.id && !note._id) {
      // Missing _id field - this shouldn't happen with MongoDB, but handle it
      console.log(`⚠️ Note ${note.id} missing _id field - this is unusual`);
    } else if (!note.id && !note._id) {
      // Both missing - this is a corrupted note
      console.log(`❌ Note ${i} has no ID fields - this is corrupted data`);
      continue;
    }
    
    // Update the note in database if needed
    if (needsUpdate) {
      try {
        await Note.findByIdAndUpdate(note._id, { id: note.id });
        console.log(`✅ Updated note ${note._id} with id: ${note.id}`);
      } catch (updateError) {
        console.error(`❌ Failed to update note ${note._id}:`, updateError);
      }
    }
  }
  
  return notes;
}

// Get Notes by Video
app.get('/api/notes/video/:videoId', authenticateToken, async (req, res) => {
  try {
    const notes = await Note.find({ 
      userId: req.user._id, 
      videoId: req.params.videoId 
    }).sort({ startTime: 1 });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Update request for note ID:', req.params.id);
    console.log('📝 Update data:', req.body);
    console.log('👤 User ID:', req.user._id);
    
    // Try to find note by MongoDB _id first, then by regular id
    let note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    // If not found by _id, try by regular id
    if (!note) {
      console.log('🔍 Note not found by _id, trying by regular id...');
      note = await Note.findOneAndUpdate(
        { id: req.params.id, userId: req.user._id },
        req.body,
        { new: true, runValidators: true }
      );
    }

    if (!note) {
      console.log('❌ Note not found by either _id or id');
      return res.status(404).json({ message: 'Note not found' });
    }

    console.log('✅ Note updated successfully:', note);
    res.json({ message: 'Note updated successfully', note });
  } catch (error) {
    console.error('❌ Error updating note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete Note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Delete request for note ID:', req.params.id);
    console.log('👤 User ID:', req.user._id);
    
    // Try to find note by MongoDB _id first, then by regular id
    let note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    // If not found by _id, try by regular id
    if (!note) {
      console.log('🔍 Note not found by _id, trying by regular id...');
      note = await Note.findOneAndDelete({
        id: req.params.id,
        userId: req.user._id
      });
    }

    if (!note) {
      console.log('❌ Note not found by either _id or id');
      return res.status(404).json({ message: 'Note not found' });
    }

    console.log('✅ Note deleted successfully:', note);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// YouTube Data API helper function
async function getVideoTitle(videoId) {
  try {
    // For now, we'll use a simple approach
    // In production, you'd want to use YouTube Data API v3
    return `Video ${videoId}`;
  } catch (error) {
    console.error('Error getting video title:', error);
    return `Video ${videoId}`;
  }
}

// Serve the main app
app.get('/', (req, res) => {
  console.log('🏠 Serving main app (index.html)');
  res.sendFile(__dirname + '/public/index.html');
});

// Database health check endpoint
app.get('/api/health', authenticateToken, async (req, res) => {
  try {
    const userNotes = await Note.find({ userId: req.user._id });
    
    // Analyze ID consistency
    const idAnalysis = {
      totalNotes: userNotes.length,
      notesWithId: userNotes.filter(n => n.id).length,
      notesWithMongoId: userNotes.filter(n => n._id).length,
      notesWithBoth: userNotes.filter(n => n.id && n._id).length,
      notesWithNeither: userNotes.filter(n => !n.id && !n._id).length,
      idFormats: userNotes.map(n => ({ 
        id: n.id, 
        _id: n._id ? n._id.toString().slice(-6) : null,
        hasConflict: n.id && n._id && n.id !== n._id.toString().slice(-6)
      }))
    };
    
    console.log('🏥 Database health check for user:', req.user._id);
    console.log('📊 ID consistency analysis:', idAnalysis);
    
    res.json({ 
      status: 'healthy',
      message: 'Database health check completed',
      analysis: idAnalysis
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
