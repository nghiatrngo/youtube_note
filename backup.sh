#!/bin/bash

echo "🗄️ Starting database backup..."
echo "📁 Current directory: $(pwd)"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one with your Supabase credentials:"
    echo "   SUPABASE_URL=your_supabase_url"
    echo "   SUPABASE_ANON_KEY=your_supabase_anon_key"
    exit 1
fi

# Run the backup
echo "🚀 Running database backup script..."
node backup-database.js

echo "✅ Backup script completed!"
echo "📁 Check the backup folder: /Users/nghiango-mbp/projects/backup"
