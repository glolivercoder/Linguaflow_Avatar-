@echo off
REM Script para configurar ambiente virtual e instalar Piper TTS
REM Baseado na estrutura funcional do PipperTTS

echo ========================================
echo Setup Piper TTS para LinguaFlow
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Python não encontrado. Por favor, instale Python 3.11 ou superior.
    pause
    exit /b 1
)

echo [1/5] Criando ambiente virtual...
if exist venv (
    echo Ambiente virtual já existe. Removendo...
    rmdir /s /q venv
)
python -m venv venv
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar ambiente virtual
    pause
    exit /b 1
)

echo [2/5] Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo [3/5] Atualizando pip...
python -m pip install --upgrade pip

echo [4/5] Instalando dependências...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependências
    pause
    exit /b 1
)

echo [5/5] Criando diretórios necessários...
if not exist models mkdir models
if not exist references mkdir references
if not exist temp mkdir temp

echo.
echo ========================================
echo Setup concluído com sucesso!
echo ========================================
echo.
echo Próximos passos:
echo 1. Copie os modelos Piper (.onnx e .onnx.json) para a pasta 'models'
echo    Ou use os modelos do PipperTTS em: F:\Projetos2025BKP\PipperTTS\piper\trained_models
echo.
echo 2. Para iniciar o servidor:
echo    venv\Scripts\activate
echo    python main.py
echo.
echo Ou use o script: INICIAR_PRONUNCIATION.bat
echo.
pause
