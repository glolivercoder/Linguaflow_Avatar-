@echo off
REM Setup script for Pronunciation Backend (Windows)

echo 🚀 Setting up LinguaFlow Pronunciation Backend...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.11+
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Download Piper TTS voice model
echo 🎤 Downloading Piper TTS voice model (en_US-lessac-medium)...
python -m piper.download_voices en_US-lessac-medium

REM Create references directory
echo 📁 Creating references directory...
if not exist references mkdir references

echo.
echo ✅ Setup complete!
echo.
echo To start the server:
echo   1. Activate virtual environment:
echo      venv\Scripts\activate.bat
echo   2. Run the server:
echo      python main.py
echo.
echo Or use Docker:
echo   docker-compose up --build
echo.

pause
