@echo off
echo ========================================
echo  INSTALACAO DO KITTEN-TTS
@REM Verifica se o Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Python não encontrado. Por favor, instale Python 3.10 ou superior.
    pause
    exit /b 1
)

@REM Cria e ativa o ambiente virtual
echo [1/4] Configurando ambiente virtual...
if not exist "app\kitten_tts_service\venv" (
    python -m venv app\kitten_tts_service\venv
)
call app\kitten_tts_service\venv\Scripts\activate

@REM Atualiza o pip
echo [2/4] Atualizando pip...
python -m pip install --upgrade pip

@REM Instala as dependências
echo [3/4] Instalando dependências...
pip install -r app\kitten_tts_service\requirements.txt

@REM Instala o PyTorch com suporte a CUDA (se disponível)
echo [4/4] Instalando PyTorch com suporte a GPU (se disponível)...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

@REM Verifica se o eSpeak NG está instalado
echo.
echo ========================================
echo VERIFICAÇÃO DE PRÉ-REQUISITOS
echo ========================================
echo.
echo Verificando instalação do eSpeak NG...

@REM Verifica nos locais comuns de instalação
set ESPEAK_FOUND=0

if exist "C:\Program Files\eSpeak NG\espeak-ng.exe" (
    echo [OK] eSpeak NG encontrado em 'C:\Program Files\eSpeak NG'.
    set PATH=%PATH%;C:\Program Files\eSpeak NG
    set ESPEAK_FOUND=1
) else if exist "C:\Program Files (x86)\eSpeak NG\espeak-ng.exe" (
    echo [OK] eSpeak NG encontrado em 'C:\Program Files (x86)\eSpeak NG'.
    set PATH=%PATH%;C:\Program Files (x86)\eSpeak NG
    set ESPEAK_FOUND=1
) else if exist "%ProgramFiles%\eSpeak NG\espeak-ng.exe" (
    echo [OK] eSpeak NG encontrado em '%ProgramFiles%\eSpeak NG'.
    set PATH=%PATH%;%ProgramFiles%\eSpeak NG
    set ESPEAK_FOUND=1
) else if exist "%ProgramFiles(x86)%\eSpeak NG\espeak-ng.exe" (
    echo [OK] eSpeak NG encontrado em '%ProgramFiles(x86)%\eSpeak NG'.
    set PATH=%PATH%;%ProgramFiles(x86)%\eSpeak NG
    set ESPEAK_FOUND=1
)

if %ESPEAK_FOUND%==0 (
    echo AVISO: Não foi possível encontrar o eSpeak NG nos locais padrão.
    echo O Kitten-TTS pode não funcionar corretamente sem ele.
    echo Você pode instalá-lo manualmente de:
    echo https://github.com/espeak-ng/espeak-ng/releases/latest
    echo Baixe e execute o instalador 'espeak-ng-X.XX-x64.msi'.
    echo.
    echo Deseja continuar mesmo assim? (S/N)
    set /p CONTINUE=
    if /i not "%CONTINUE%"=="S" (
        exit /b 1
    )
) else (
    echo [OK] eSpeak NG configurado com sucesso.
)

echo.
echo ========================================
echo INSTALAÇÃO CONCLUÍDA COM SUCESSO!
echo ========================================
echo.
echo Para iniciar o servidor Kitten-TTS, execute o arquivo:
echo INICIAR_KITTEN_TTS.bat
echo.
pause