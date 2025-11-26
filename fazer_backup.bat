@echo off
setlocal enabledelayedexpansion

REM Obter data e hora no formato YYYY-MM-DD_HH-MM-SS usando PowerShell
for /f "tokens=1-6 delims=:-. " %%a in ('powershell -Command "Get-Date -Format 'yyyy MM dd HH mm ss'"') do (
    set "year=%%a"
    set "month=%%b"
    set "day=%%c"
    set "hour=%%d"
    set "minute=%%e"
    set "second=%%f"
)
set "timestamp=!year!-!month!-!day!_!hour!-!minute!-!second!"

REM Criar diretório de backup
set "backup_dir=_BACKUPS\Backup_%timestamp%"
mkdir "%backup_dir%" 2>nul

if not exist "%backup_dir%" (
    echo Erro ao criar o diretório de backup.
    exit /b 1
)

echo Criando backup em %backup_dir%
echo.

REM Lista de diretórios para backup
set "dirs=app config components backend data"

REM Copiar diretórios principais
for %%d in (%dirs%) do (
    if exist "%%d" (
        echo Copiando pasta %%d...
        xcopy /E /I /Y "%%d" "%backup_dir%\%%d"
    )
)

REM Copiar arquivos Python na raiz
echo Copiando arquivos Python...
copy *.py "%backup_dir%\" >nul

echo.
echo Backup concluído com sucesso em %backup_dir%

timeout /t 5
exit /b 0
