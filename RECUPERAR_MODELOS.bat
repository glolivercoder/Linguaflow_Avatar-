@echo off
echo ========================================
echo   RECUPERACAO DE MODELOS DE VOZ
echo ========================================
echo.

set "SOURCE_DIR=F:\Projetos2025BKP\Llinguaflow_bug"
set "DEST_DIR=%~dp0"

echo [INFO] Origem: %SOURCE_DIR%
echo [INFO] Destino: %DEST_DIR%
echo.

REM ----------------------------------------
REM 1. Recuperar modelos Piper
REM ----------------------------------------
echo [1/2] Copiando modelos Piper...
if not exist "%DEST_DIR%backend\pronunciation\models" (
    mkdir "%DEST_DIR%backend\pronunciation\models"
)

xcopy /E /I /Y "%SOURCE_DIR%\backend\pronunciation\models\*" "%DEST_DIR%backend\pronunciation\models\"
if errorlevel 1 (
    echo [ERRO] Falha ao copiar modelos Piper.
) else (
    echo [OK] Modelos Piper copiados.
)
echo.

REM ----------------------------------------
REM 2. Recuperar modelo Vosk
REM ----------------------------------------
echo [2/2] Copiando modelo Vosk (PT-BR)...

REM Limpar pasta model antiga se existir (para evitar conflitos)
if exist "%DEST_DIR%backend\vosk_service\model" (
    echo [INFO] Removendo pasta model antiga/incompleta...
    rmdir /S /Q "%DEST_DIR%backend\vosk_service\model"
)

if not exist "%DEST_DIR%backend\vosk_service\model" (
    mkdir "%DEST_DIR%backend\vosk_service\model"
)

xcopy /E /I /Y "%SOURCE_DIR%\backend\vosk-models\vosk-model-small-pt-0.3\*" "%DEST_DIR%backend\vosk_service\model\"
if errorlevel 1 (
    echo [ERRO] Falha ao copiar modelo Vosk.
) else (
    echo [OK] Modelo Vosk copiado.
)
echo.

echo ========================================
echo   RECUPERACAO CONCLUIDA!
echo ========================================
echo.
echo Agora voce pode iniciar o avatar novamente.
pause
