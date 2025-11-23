# 🚀 Início Rápido - Piper TTS com Venv

## Setup Inicial (Uma Vez)

```batch
# Execute o script de setup
setup_piper_venv.bat
```

Isso vai:
- ✅ Criar ambiente virtual Python
- ✅ Instalar piper-tts e dependências
- ✅ Criar diretórios necessários

## Iniciar Servidor

```batch
# Opção 1: Script automático (recomendado)
INICIAR_PRONUNCIATION.bat

# Opção 2: Manual
venv\Scripts\activate
python main.py
```

## Testar

```batch
# Teste de integração
venv\Scripts\activate
python test_piper_integration.py

# Teste via API
curl http://localhost:8000/health
curl http://localhost:8000/voice-models
```

## Modelos

Os modelos do PipperTTS são detectados automaticamente em:
```
F:\Projetos2025BKP\PipperTTS\piper\trained_models\
```

Modelos disponíveis:
- ✅ `lessac_en_us` - Inglês (alta qualidade)
- ✅ `faber_pt_br` - Português Brasileiro

## Documentação Completa

- **Setup detalhado:** `SETUP_PIPER_VENV.md`
- **Migração completa:** `MIGRACAO_CONCLUIDA.md`
- **Documentação PipperTTS:** `PeepperTTS_venv.md`

## Problemas?

```batch
# Reinstalar dependências
venv\Scripts\activate
pip install -r requirements.txt --force-reinstall

# Testar integração
python test_piper_integration.py
```

---

**Status:** ✅ Sistema funcional e testado  
**Versão:** Piper TTS 1.3.0 via venv (sem Docker)
