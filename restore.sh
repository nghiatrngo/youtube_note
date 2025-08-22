#!/bin/bash

echo "🗄️ Starting database restore preview..."
echo "📁 Current directory: $(pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with your Supabase credentials first."
    echo "   Required variables: SUPABASE_URL, SUPABASE_ANON_KEY"
    exit 1
fi

echo "🚀 Running database restore preview script..."
node restore-database.js

echo "✅ Restore preview completed!"
echo "📁 Check the output above for data summary and restore options."
