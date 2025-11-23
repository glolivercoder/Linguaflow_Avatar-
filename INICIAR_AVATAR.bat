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
echo [LOG] Arquivo de log: %LOG_FILE%
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ========================================
REM 1. INICIAR PRONUNCIATION SERVICE
REM ========================================
echo [1/4] Iniciando Pronunciation Service (Porta 8000)...
echo [1/4] Iniciando Pronunciation Service (Porta 8000)... >> "%LOG_FILE%"
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
timeout /t 5 /nobreak >nul

REM ========================================
REM 2. INICIAR PROXY SERVICE
REM ========================================
echo [2/4] Iniciando Proxy Service (Porta 3100)...
echo [2/4] Iniciando Proxy Service (Porta 3100)... >> "%LOG_FILE%"
cd backend\proxy
if not exist node_modules (
    echo Instalando dependencias do proxy...
    echo Instalando dependencias do proxy... >> "%LOG_FILE%"
    call npm install
)
start "LinguaFlow Avatar - Proxy" cmd /k "npm start"
echo [OK] Proxy Service iniciado >> "%LOG_FILE%"
cd ..\..
timeout /t 3 /nobreak >nul

REM ========================================
REM 3. INICIAR VOSK SERVICE (OPCIONAL)
REM ========================================
echo [3/4] Iniciando Vosk Service (Porta 8200)...
echo [3/4] Iniciando Vosk Service (Porta 8200)... >> "%LOG_FILE%"
if exist backend\vosk_service (
    cd backend\vosk_service
    if not exist venv (
        echo Criando ambiente virtual Python para Vosk...
        echo Criando ambiente virtual Python para Vosk... >> "%LOG_FILE%"
        python -m venv venv
        call venv\Scripts\activate
        pip install -r requirements.txt
    ) else (
        call venv\Scripts\activate
    )
    
    REM Setup Vosk Model if missing
    if not exist model (
        echo [INFO] Verificando modelo Vosk...
        echo [INFO] Verificando modelo Vosk... >> "%LOG_FILE%"
        python ..\setup_vosk_model.py
    )

    cd ..
    
    echo [INFO] Iniciando Vosk Service... >> "%LOG_FILE%"
    start "LinguaFlow Avatar - Vosk" cmd /k "cd /d "%SCRIPT_DIR%" && backend\vosk_service\venv\Scripts\python.exe start_vosk.py"
    echo [OK] Vosk Service comando executado >> "%LOG_FILE%"
    cd ..
) else (
    echo Vosk Service nao encontrado. Pulando...
    echo [AVISO] Vosk Service nao encontrado. Pulando... >> "%LOG_FILE%"
)
timeout /t 3 /nobreak >nul

REM ========================================
REM 3.5. INICIAR WAV2LIP SERVICE
REM ========================================
echo [3.5/4] Iniciando Wav2Lip Service (Porta 8300)...
echo [3.5/4] Iniciando Wav2Lip Service (Porta 8300)... >> "%LOG_FILE%"
if exist backend\wav2lip_service (
    cd backend\wav2lip_service
    if not exist venv (
        echo [INFO] Criando ambiente virtual Wav2Lip...
        echo [INFO] Criando ambiente virtual Wav2Lip... >> "%LOG_FILE%"
        python -m venv venv
        call venv\Scripts\activate
        pip install -r requirements.txt
    )
    
    start "LinguaFlow Avatar - Wav2Lip" cmd /k "venv\Scripts\activate && python main.py"
    echo [OK] Wav2Lip Service iniciado >> "%LOG_FILE%"
    cd ..\..
) else (
    echo [AVISO] Wav2Lip Service nao encontrado. >> "%LOG_FILE%"
)
timeout /t 3 /nobreak >nul

REM ========================================
REM 4. INICIAR FRONTEND
REM ========================================
echo [4/4] Iniciando Frontend (Porta 3001)...
echo [4/4] Iniciando Frontend (Porta 3001)... >> "%LOG_FILE%"
if not exist node_modules (
    echo Instalando dependencias do frontend...
    echo Instalando dependencias do frontend... >> "%LOG_FILE%"
    call npm install
)
start "LinguaFlow Avatar - Frontend" cmd /k "npm run dev"
echo [OK] Frontend iniciado >> "%LOG_FILE%"

echo.
echo ========================================
echo   LINGUAFLOW AVATAR INICIADO!
echo ========================================
echo.
echo  Servidores ativos:
echo    Pronunciation:  http://localhost:8000
echo    Proxy:          http://localhost:3100
echo    Vosk (opt):     http://localhost:8200
echo    Wav2Lip:        http://localhost:8300
echo    Frontend:       http://localhost:3001
echo.
echo  Log disponivel em: %LOG_FILE%
echo.
echo ======================================== >> "%LOG_FILE%"
echo INICIALIZACAO COMPLETA >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"

echo Pressione qualquer tecla para sair...
pause >nul
