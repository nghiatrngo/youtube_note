#!/bin/bash

echo "🚀 Starting YouTube Note Clipper (Local Version)"
echo "================================================"
echo ""
echo "This version runs completely locally with:"
echo "✅ SQLite database (no MongoDB required)"
echo "✅ Local file storage"
echo "✅ No external services needed"
echo "✅ Works offline"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🌐 Starting local server..."
echo "💾 Database will be created automatically as: youtube_notes.db"
echo "🔐 JWT secret will use default local key"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the local server
npm run local
