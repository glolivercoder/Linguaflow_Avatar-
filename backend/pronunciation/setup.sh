#!/bin/bash

# Setup script for Pronunciation Backend

set -e

echo "🚀 Setting up LinguaFlow Pronunciation Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Download Piper TTS voice model
echo "🎤 Downloading Piper TTS voice model (en_US-lessac-medium)..."
python3 -m piper.download_voices en_US-lessac-medium

# Create references directory
echo "📁 Creating references directory..."
mkdir -p references

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  1. Activate virtual environment:"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "     source venv/Scripts/activate"
else
    echo "     source venv/bin/activate"
fi
echo "  2. Run the server:"
echo "     python main.py"
echo ""
echo "Or use Docker:"
echo "  docker-compose up --build"
echo ""
