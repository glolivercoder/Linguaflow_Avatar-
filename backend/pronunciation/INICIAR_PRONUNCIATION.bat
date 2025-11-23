@echo off
REM =========================================================
REM Script para iniciar o Backend de Pronuncia do LinguaFlow
REM Usando ambiente virtual Python com Piper TTS
REM =========================================================

echo.
echo ========================================
echo   LinguaFlow - Backend de Pronuncia
echo   com Piper TTS e openSMILE
echo ========================================
echo.

REM Verifica se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale Python 3.11 ou superior.
    pause
    exit /b 1
)

echo [INFO] Python encontrado...
echo.

REM Verifica se ambiente virtual existe
if not exist "venv" (
    echo [ERRO] Ambiente virtual nao encontrado!
    echo Por favor, execute primeiro: setup_piper_venv.bat
    pause
    exit /b 1
)

echo [INFO] Ambiente virtual encontrado...
echo.

REM Cria diretorios necessarios
if not exist "references" mkdir references
if not exist "temp" mkdir temp
if not exist "models" mkdir models

echo [INFO] Criando diretorios...
echo.

REM Ativa ambiente virtual
echo [INFO] Ativando ambiente virtual...
call venv\Scripts\activate.bat

REM Verifica se piper-tts esta instalado
python -c "import piper" >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Piper TTS nao encontrado no ambiente virtual!
    echo Por favor, execute: setup_piper_venv.bat
    pause
    exit /b 1
)

echo [INFO] Piper TTS encontrado...
echo.

REM Verifica se ha modelos disponiveis
set MODEL_FOUND=0
if exist "models\*.onnx" set MODEL_FOUND=1
if exist "F:\Projetos2025BKP\PipperTTS\piper\trained_models" set MODEL_FOUND=1

if %MODEL_FOUND%==0 (
    echo [AVISO] Nenhum modelo Piper encontrado!
    echo Copie modelos para a pasta 'models' ou use os do PipperTTS
    echo Localizacao: F:\Projetos2025BKP\PipperTTS\piper\trained_models
    echo.
    echo Deseja continuar mesmo assim? (S/N)
    set /p CONTINUE="Digite S para continuar: "
    if /i not "%CONTINUE%"=="S" (
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Iniciando servidor FastAPI...
echo.

REM Inicia o servidor
start "LinguaFlow Pronunciation API" python main.py

REM Aguarda alguns segundos para o servico iniciar
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Backend iniciado com sucesso!
echo ========================================
echo.
echo   API URL: http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo   Health: http://localhost:8000/health
echo.
echo Para parar o backend:
echo   Feche a janela do servidor ou pressione Ctrl+C
echo.
echo ========================================
echo.

REM Testa se a API esta respondendo
echo [INFO] Verificando saude da API...
timeout /t 3 /nobreak >nul
curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo [AVISO] API ainda nao esta respondendo.
    echo [INFO] Aguarde mais alguns segundos...
) else (
    echo [OK] API esta respondendo corretamente!
)

echo.
pause
