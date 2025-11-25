@echo off
setlocal enabledelayedexpansion

REM Define log file
set "LOG_FILE=%~dp0LINGUAFLOW_AVATAR.log"
echo ======================================== > "%LOG_FILE%"
echo LINGUAFLOW AVATAR - LOG DE INICIALIZACAO >> "%LOG_FILE%"
echo Data/Hora: %date% %time% >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo ========================================
echo   LINGUAFLOW AVATAR - INICIALIZACAO
echo ========================================
echo.
echo [LOG] Arquivo de log principal: %LOG_FILE%
echo [LOG] Logs de servicos ser enviadoao salvos nos terminais individuais.
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ========================================
REM 1. INICIAR PRONUNCIATION SERVICE
REM ========================================
echo [1/6] Iniciando Pronunciation Service (Porta 8000)...
echo [1/6] Iniciando Pronunciation Service (Porta 8000)... >> "%LOG_FILE%"
cd backend\pronunciation
if not exist venv (
    echo [INFO] Configurando ambiente do Piper TTS...
    echo [INFO] Configurando ambiente do Piper TTS... >> "%LOG_FILE%"
    call setup_piper_venv.bat
)
if exist venv (
    call venv\Scripts\activate
    start "LinguaFlow Avatar - Pronunciation" cmd /k "call venv\Scripts\activate && python main.py"
    echo [OK] Pronunciation Service iniciado >> "%LOG_FILE%"
) else (
    echo [ERRO] Falha ao criar venv do Pronunciation Service.
    echo [ERRO] Falha ao criar venv do Pronunciation Service. >> "%LOG_FILE%"
)
cd ..\..
timeout /t 2 /nobreak >nul

REM ========================================
REM 2. INICIAR PROXY SERVICE
REM ========================================
echo [2/6] Iniciando Proxy Service (Porta 3100)...
echo [2/6] Iniciando Proxy Service (Porta 3100)... >> "%LOG_FILE%"
cd backend\proxy
if not exist node_modules (
    echo [INFO] Instalando dependencias do Proxy...
    echo [INFO] Instalando dependencias do Proxy... >> "%LOG_FILE%"
    call npm install
)
start "LinguaFlow Avatar - Proxy" cmd /k "npm start"
echo [OK] Proxy Service iniciado >> "%LOG_FILE%"
cd ..\..
timeout /t 2 /nobreak >nul

REM ========================================
REM 3. INICIAR VOSK SERVICE
REM ========================================
echo [3/6] Iniciando Vosk Service (Porta 8200)...
echo [3/6] Iniciando Vosk Service (Porta 8200)... >> "%LOG_FILE%"
cd backend\vosk_service
if not exist venv (
    echo [INFO] Configurando ambiente do Vosk...
    echo [INFO] Configurando ambiente do Vosk... >> "%LOG_FILE%"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
)
if exist venv (
    call venv\Scripts\activate
    start "LinguaFlow Avatar - Vosk" cmd /k "call venv\Scripts\activate && python main.py"
    echo [OK] Vosk Service iniciado >> "%LOG_FILE%"
) else (
    echo [ERRO] Falha ao criar venv do Vosk Service.
    echo [ERRO] Falha ao criar venv do Vosk Service. >> "%LOG_FILE%"
)
cd ..\..
timeout /t 2 /nobreak >nul

REM ========================================
REM 4. INICIAR WHISPER SERVICE
REM ========================================
echo [4/6] Iniciando Whisper Service (Porta 8003)...
echo [4/6] Iniciando Whisper Service (Porta 8003)... >> "%LOG_FILE%"
cd backend\whisper_service
if not exist venv (
    echo [INFO] Configurando ambiente do Whisper...
    echo [INFO] Configurando ambiente do Whisper... >> "%LOG_FILE%"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
)
if exist venv (
    call venv\Scripts\activate
    start "LinguaFlow Avatar - Whisper" cmd /k "call venv\Scripts\activate && python main.py"
    echo [OK] Whisper Service iniciado >> "%LOG_FILE%"
) else (
    echo [ERRO] Falha ao criar venv do Whisper Service.
    echo [ERRO] Falha ao criar venv do Whisper Service. >> "%LOG_FILE%"
)
cd ..\..
timeout /t 2 /nobreak >nul

REM ========================================
REM 5. INICIAR WAV2LIP SERVICE
REM ========================================
echo [5/6] Iniciando Wav2Lip Service (Porta 8301)...
echo [5/6] Iniciando Wav2Lip Service (Porta 8301)... >> "%LOG_FILE%"
cd backend\wav2lip_service
if not exist venv (
    echo [INFO] Configurando ambiente do Wav2Lip...
    echo [INFO] Configurando ambiente do Wav2Lip... >> "%LOG_FILE%"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
)
if exist venv (
    call venv\Scripts\activate
    start "LinguaFlow Avatar - Wav2Lip" cmd /k "call venv\Scripts\activate && python main.py"
    echo [OK] Wav2Lip Service iniciado >> "%LOG_FILE%"
) else (
    echo [ERRO] Falha ao criar venv do Wav2Lip Service.
    echo [ERRO] Falha ao criar venv do Wav2Lip Service. >> "%LOG_FILE%"
)
cd ..\..
timeout /t 2 /nobreak >nul

REM ========================================
REM 6. INICIAR FRONTEND
REM ========================================
echo [6/6] Iniciando Frontend (Porta 3001)...
echo [6/6] Iniciando Frontend (Porta 3001)... >> "%LOG_FILE%"
if not exist node_modules (
    echo [INFO] Instalando dependencias do Frontend...
    echo [INFO] Instalando dependencias do Frontend... >> "%LOG_FILE%"
    call npm install
)
start "LinguaFlow Avatar - Frontend" cmd /k "npm run dev"
echo [OK] Frontend iniciado >> "%LOG_FILE%"

echo.
echo ========================================
echo   INICIALIZACAO CONCLUIDA
echo ========================================
echo.
echo Todos os servicos foram iniciados.
echo Verifique as janelas abertas se houver problemas.
echo Abrindo navegador em 5 segundos...
timeout /t 5 /nobreak >nul
start http://localhost:3001
echo.
echo Pressione qualquer tecla para sair...
pause >nul
