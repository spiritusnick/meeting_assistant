#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the project directory
cd "$SCRIPT_DIR"

echo "🎙️  Meeting Assistant Launcher"
echo "============================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "🔨 Building application..."
    npm run build:all
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
# OpenAI API Key for transcription and summarization
OPENAI_API_KEY=your_openai_api_key_here

# Email configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Audio device (optional - will auto-detect if not set)
DEVICE_NAME=BlackHole 2ch
EOF
    echo "Please edit .env file with your API keys before running."
    open .env
    exit 1
fi

echo "🚀 Starting Meeting Assistant..."
echo ""
echo "The app will:"
echo "• Run in your system tray"
echo "• Show a window when you click the tray icon"
echo "• Use Ctrl+Shift+R to start/stop recording"
echo ""

# Start the application
npm start