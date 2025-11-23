@echo off
echo ========================================
echo   LINGUAFLOW AVATAR - INICIALIZACAO
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ========================================
REM 1. INICIAR PRONUNCIATION SERVICE
REM ========================================
echo [1/4] Iniciando Pronunciation Service (Porta 8000)...
cd backend\pronunciation
if not exist venv (
    echo [INFO] Configurando ambiente do Piper TTS...
    call setup_piper_venv.bat
)
if exist venv (
    call venv\Scripts\activate
    start "LinguaFlow Avatar - Pronunciation" cmd /k "call venv\Scripts\activate && python main.py"
) else (
    echo [ERRO] Falha ao criar venv do Pronunciation Service.
)
cd ..\..
timeout /t 5 /nobreak >nul

REM ========================================
REM 2. INICIAR PROXY SERVICE
REM ========================================
echo [2/4] Iniciando Proxy Service (Porta 3100)...
cd backend\proxy
if not exist node_modules (
    echo Instalando dependencias do proxy...
    call npm install
)
start "LinguaFlow Avatar - Proxy" cmd /k "npm start"
cd ..\..
timeout /t 3 /nobreak >nul

REM ========================================
REM 3. INICIAR VOSK SERVICE (OPCIONAL)
REM ========================================
echo [3/4] Iniciando Vosk Service (Porta 8200)...
if exist backend\vosk_service (
    cd backend\vosk_service
    if not exist venv (
        echo Criando ambiente virtual Python para Vosk...
        python -m venv venv
        call venv\Scripts\activate
        pip install -r requirements.txt
    ) else (
        call venv\Scripts\activate
    )
    
    REM Setup Vosk Model if missing
    if not exist model (
        echo [INFO] Verificando modelo Vosk...
        python ..\setup_vosk_model.py
    )

    cd ..
    REM Override VOSK_MODEL_PATH to correct location (Absolute Path)
set "VOSK_MODEL_PATH=%SCRIPT_DIR%backend\vosk_service\model"

REM Override PIPER_VOICE_MODEL to correct location (Absolute Path)
set "PIPER_VOICE_MODEL=%SCRIPT_DIR%backend\pronunciation\models\en_US-lessac-medium.onnx"
    
    start "LinguaFlow Avatar - Vosk" cmd /k "cd /d "%SCRIPT_DIR%backend" && vosk_service\venv\Scripts\activate && python -m vosk_service.main"
    cd ..
) else (
    echo Vosk Service nao encontrado. Pulando...
)
timeout /t 3 /nobreak >nul

REM ========================================
REM 4. INICIAR FRONTEND
REM ========================================
echo [4/4] Iniciando Frontend (Porta 3001)...
if not exist node_modules (
    echo Instalando dependencias do frontend...
    call npm install
)
start "LinguaFlow Avatar - Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   LINGUAFLOW AVATAR INICIADO!
echo ========================================
echo.
echo  Servidores ativos:
echo    Pronunciation:  http://localhost:8000
echo    Proxy:          http://localhost:3100
echo    Vosk (opt):     http://localhost:8200
echo    Frontend:       http://localhost:3001
echo.
echo Pressione qualquer tecla para sair...
pause >nul
