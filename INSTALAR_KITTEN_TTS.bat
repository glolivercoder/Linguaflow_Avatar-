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

@REM Verifica no PATH e no diretório padrão do Windows 11
where espeak-ng >nul 2>&1
if %errorlevel% neq 0 (
    @REM Tenta encontrar no diretório padrão de instalação do Windows 11
    if exist "C:\Program Files\eSpeak NG\espeak-ng.exe" (
        echo [OK] eSpeak NG encontrado em 'C:\Program Files\eSpeak NG'.
        @REM Adiciona ao PATH temporariamente
        set PATH=%PATH%;C:\Program Files\eSpeak NG
    ) else if exist "C:\Program Files (x86)\eSpeak NG\espeak-ng.exe" (
        echo [OK] eSpeak NG encontrado em 'C:\Program Files (x86)\eSpeak NG'.
        @REM Adiciona ao PATH temporariamente
        set PATH=%PATH%;C:\Program Files (x86)\eSpeak NG
    ) else (
        echo AVISO: eSpeak NG não encontrado. Este é um pré-requisito para o Kitten-TTS.
        echo Por favor, instale o eSpeak NG manualmente de:
        echo https://github.com/espeak-ng/espeak-ng/releases/latest
        echo Baixe e execute o instalador 'espeak-ng-X.XX-x64.msi'.
        echo Após a instalação, REINICIE O TERMINAL e execute este script novamente.
        pause
        exit /b 1
    )
) else (
    echo [OK] eSpeak NG está instalado e disponível no PATH.
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
