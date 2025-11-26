@echo off
title Kitten-TTS Server
echo ========================================
echo  INICIALIZANDO SERVIDOR KITTEN-TTS
echo ========================================
echo.

@REM Verifica se o ambiente virtual existe
if not exist "app\kitten_tts_service\venv" (
    echo ERRO: Ambiente virtual não encontrado. Execute INSTALAR_KITTEN_TTS.bat primeiro.
    pause
    exit /b 1
)

@REM Navega para o diretório do Kitten-TTS
cd app\kitten_tts_service

@REM Ativa o ambiente virtual
call venv\Scripts\activate

echo [INFO] Iniciando servidor Kitten-TTS na porta 5000...
echo [INFO] Acesse a interface web em: http://localhost:5000
echo [INFO] Pressione Ctrl+C para parar o servidor.
echo.

@REM Inicia o servidor
python -m uvicorn main:app --host 0.0.0.0 --port 5000

@REM Se o comando acima falhar, tenta com python3
if %errorlevel% neq 0 (
    python3 -m uvicorn main:app --host 0.0.0.0 --port 5000
)

@REM Se o servidor for encerrado, mantém a janela aberta
echo.
echo O servidor Kitten-TTS foi encerrado.
pause
