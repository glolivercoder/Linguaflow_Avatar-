@echo off
echo Fixing Vosk model path...

set "BASE_DIR=%~dp0"
set "CURRENT_MODEL=%BASE_DIR%vosk_service\model"
set "TARGET_DIR=%BASE_DIR%vosk-models"
set "TARGET_MODEL=%TARGET_DIR%\vosk-model-small-pt-0.3"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

if exist "%CURRENT_MODEL%" (
    echo Moving model from %CURRENT_MODEL% to %TARGET_MODEL%...
    move "%CURRENT_MODEL%" "%TARGET_MODEL%"
    echo Done.
) else (
    echo Model not found in %CURRENT_MODEL%. Checking if already moved...
    if exist "%TARGET_MODEL%" (
        echo Model already exists in target location.
    ) else (
        echo ERROR: Model not found anywhere!
    )
)
pause
