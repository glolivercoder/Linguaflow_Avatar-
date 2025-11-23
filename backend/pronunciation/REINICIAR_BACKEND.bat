@echo off
title LinguaFlow Backend - Reiniciando...
color 0A

echo ========================================
echo   🔄 REINICIANDO BACKEND
echo ========================================
echo.

REM Matar processos do uvicorn existentes
echo Parando servidor anterior...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
timeout /t 2 /nobreak >nul

echo ✅ Servidor anterior parado
echo.

REM Ativar venv e iniciar
echo Iniciando novo servidor...
echo.

if not exist venv (
    echo ❌ Virtual environment nao encontrado!
    echo Execute setup.bat primeiro.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo ========================================
echo   ✅ BACKEND INICIADO
echo ========================================
echo.
echo URL: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.
echo ⚠️  Mantenha esta janela aberta
echo    O servidor esta rodando...
echo.

uvicorn main_simple:app --host 0.0.0.0 --port 8000 --reload
