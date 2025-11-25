@echo off
echo ========================================
echo   DIAGNOSTICO LINGUAFLOW AVATAR
echo ========================================
echo.

REM Verificar servicos ativos
echo [1/6] Verificando servicos ativos...
echo.

echo Testando Pronunciation Service (8000)...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Pronunciation Service: ATIVO
) else (
    echo [ERRO] Pronunciation Service: INATIVO
)

echo Testando Proxy Service (3100)...
curl -s http://localhost:3100 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Proxy Service: ATIVO
) else (
    echo [ERRO] Proxy Service: INATIVO
)

echo Testando Vosk Service (8200)...
curl -s http://localhost:8200/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Vosk Service: ATIVO
) else (
    echo [AVISO] Vosk Service: INATIVO (opcional)
)

echo Testando Whisper Service (8003)...
curl -s http://localhost:8003/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Whisper Service: ATIVO
) else (
    echo [AVISO] Whisper Service: INATIVO (opcional)
)

echo Testando Wav2Lip Service (8301)...
curl -s http://localhost:8301/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Wav2Lip Service: ATIVO
) else (
    echo [AVISO] Wav2Lip Service: INATIVO (opcional)
)

echo Testando Frontend (3001)...
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend: ATIVO
) else (
    echo [ERRO] Frontend: INATIVO
)

echo.
echo ========================================
echo [2/6] Verificando processos Python...
echo ========================================
tasklist /FI "IMAGENAME eq python.exe" | find /I "python.exe" >nul
if %errorlevel% equ 0 (
    echo [OK] Processos Python encontrados
    tasklist /FI "IMAGENAME eq python.exe"
) else (
    echo [AVISO] Nenhum processo Python encontrado
)

echo.
echo ========================================
echo [3/6] Verificando processos Node...
echo ========================================
tasklist /FI "IMAGENAME eq node.exe" | find /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo [OK] Processos Node encontrados
    tasklist /FI "IMAGENAME eq node.exe"
) else (
    echo [ERRO] Nenhum processo Node encontrado
)

echo.
echo ========================================
echo [4/6] Verificando portas em uso...
echo ========================================
netstat -ano | findstr ":8000 :3100 :8200 :8003 :8301 :3001"

echo.
echo ========================================
echo [5/6] Testando endpoints criticos...
echo ========================================
echo.
echo Testando Whisper Health:
curl -s http://localhost:8003/health
echo.
echo.
echo Testando Vosk Health:
curl -s http://localhost:8200/health
echo.

echo.
echo ========================================
echo [6/6] Verificando arquivos de log...
echo ========================================
if exist LINGUAFLOW_AVATAR.log (
    echo [OK] Log principal encontrado
    echo Ultimas 10 linhas:
    powershell -Command "Get-Content LINGUAFLOW_AVATAR.log -Tail 10"
) else (
    echo [AVISO] Log principal nao encontrado
)

echo.
echo ========================================
echo   DIAGNOSTICO COMPLETO
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause >nul
