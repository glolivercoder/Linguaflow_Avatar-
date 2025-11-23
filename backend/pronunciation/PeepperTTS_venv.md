# PeepperTTS – Relatório do Ambiente Virtual (.venv)

Este relatório descreve a estrutura, dependências e componentes funcionais do ambiente virtual utilizado pelo projeto **PeepperTTS**. Foca-se nas partes executadas via `.venv`, destacando o fluxo das abas “Modelos” e “Teste de voz” da interface web.

---

## 1. Estrutura de Diretórios do `.venv`

A raiz do ambiente virtual contém os diretórios e arquivos padrão:

```
.venv/
├── Include/
├── Lib/
│   └── site-packages/
│       ├── flask/
│       ├── flask_cors/
│       ├── onnxruntime/
│       ├── piper/
│       ├── torch/
│       ├── ... (bibliotecas instaladas)
├── Scripts/
│   ├── activate
│   ├── python.exe
│   ├── pip.exe
│   └── ...
├── share/
│   └── man/
├── COPYING
└── pyvenv.cfg
```

- **Include/**: arquivos de cabeçalho usados por pacotes compilados.
- **Lib/site-packages/**: local das bibliotecas instaladas (`pip`). Contém os módulos usados pelo projeto, incluindo `piper`, `torch`, `Flask`, `requests`, etc.
- **Scripts/**: executáveis do ambiente virtual (por exemplo, `python.exe` e `pip.exe`).
- **pyvenv.cfg**: metadados do ambiente virtual (versão do Python, caminho do executável base, etc.).

> A listagem completa (`Get-ChildItem .venv -Recurse -Depth 2`) traz centenas de diretórios referentes às dependências; apenas os principais estão destacados acima.

---

## 2. Bibliotecas e Dependências Instaladas

O comando `pip freeze` dentro do `.venv` retorna as seguintes dependências principais (trecho):

```
audioop-lts==0.2.2
Flask==3.1.2
flask-cors==6.0.1
librosa==0.11.0
numpy==2.3.4
onnxruntime==1.23.2
piper-tts==1.3.0
torch==2.9.0
transformers==4.57.1
whisper==1.1.10
requests==2.32.5
safetensors==0.6.2
soundfile==0.13.1
SpeechRecognition==3.14.3
```

**Categorias principais:**
- **Backend Web**: `Flask`, `flask-cors`, `Werkzeug`.
- **TTS/ML**: `piper-tts`, `onnxruntime`, `torch`, `transformers`, `whisper`, `librosa`, `safetensors`.
- **Utilidades/Processamento**: `numpy`, `scipy`, `soundfile`, `dateparser`, `coloredlogs`, `requests`.

Essas bibliotecas sustentam tanto a execução da CLI do Piper (via `onnxruntime`) quanto recursos auxiliares (transcrição automática, monitoramento, exportação).

---

## 3. Estrutura e Funcionamento – Aba “Modelos”

A aba “Modelos” lista todas as vozes disponíveis no diretório `trained_models/`. A listagem é fornecida pelo endpoint `/models`, que consulta os arquivos `.onnx` e `.onnx.json` para cada subdiretório.

### Fluxo resumido
1. **Carregamento**: ao acessar a aba, a função `loadModels()` faz `fetch('/models')` e obtém um array com atributos como `name`, `has_onnx`, `has_json` e `language`.
2. **Renderização**: para cada modelo, é criado um card em HTML indicando status: “✓ ONNX” e “✓ Config” quando ambos arquivos existem.
3. **Ação**: se o modelo estiver completo, um botão “Testar” permite abrir diretamente a aba “Teste de voz” com o modelo selecionado.

### Trecho de código relevante
@static/js/script.js#170-233
```javascript
async function loadModels() {
    const response = await fetch('/models');
    const models = await response.json();
    const container = document.getElementById('modelsList');

    container.innerHTML = models.map(model => `
        <div class="model-card">
            <div class="model-name">${model.name}</div>
            <div class="model-status">
                <span class="status-badge ${model.has_onnx ? 'status-ready' : 'status-missing'}">
                    ${model.has_onnx ? '✓ ONNX' : '✗ ONNX'}
                </span>
                <span class="status-badge ${model.has_json ? 'status-ready' : 'status-missing'}">
                    ${model.has_json ? '✓ Config' : '✗ Config'}
                </span>
            </div>
            <div class="model-actions">
                ${model.has_onnx && model.has_json ? 
                    `<button class="btn btn-primary" onclick="testModel('${model.name}')">
                        <i class="fas fa-play"></i> Testar
                    </button>` : 
                    '<span class="text-muted">Modelo incompleto</span>'
                }
            </div>
        </div>
    `).join('');
}
```

Cada card mostra o nome do modelo e se os arquivos essenciais estão presentes. O botão “Testar” chama `testModel(model.name)`, que muda para a aba “Teste de voz” e pré-carrega o texto padrão no idioma correspondente.

---

## 4. Estrutura e Funcionamento – Aba “Teste de voz”

A aba “Teste de voz” permite selecionar um modelo treinado e sintetizar áudio com um texto de exemplo.

### Funcionalidades-chave
1. **Seleção de modelo**: o `<select>` é populado por `loadTrainedModels()`, que chama novamente `/models`, mas desta vez preenche `trainedModelsMap` com informações de idioma.
2. **Texto automático por idioma**: ao mudar de modelo, `handleTestModelChange()` detecta o idioma (`model.language`) e escolhe a frase apropriada em `SAMPLE_TEXTS`.
3. **Envio para síntese**: ao enviar o formulário, `handleTest()` faz POST para `/test_voice`, que executa o Piper CLI via subprocesso (wrapping em Python). O resultado fornece uma URL de áudio, exibida junto de um `<audio>` e link de download.

### Trechos de código importantes
- **Mapeamento de idiomas e textos** (@static/js/script.js#7-26):
```javascript
const SAMPLE_TEXTS = {
    'pt-br': 'Olá! ...',
    'en-us': 'Hello! ...',
    'es-mx': '¡Hola! ...',
    'fr-fr': 'Bonjour ! ...',
    'it-it': 'Ciao! ...',
    'ru-ru': 'Привет! ...',
    'sv-se': 'Hej! ...'
    // Outras variantes e fallback
};
```

- **Atualização automática do texto** (@static/js/script.js#39-62):
```javascript
function handleTestModelChange() {
    const select = document.getElementById('test_model');
    const textarea = document.getElementById('test_text');
    const selectedModel = select.value;
    const modelMeta = trainedModelsMap.get(selectedModel) || {};
    const languageKey = normalizeLanguageKey(modelMeta.language);
    const sampleText = SAMPLE_TEXTS[languageKey] || SAMPLE_TEXTS['pt-br'];

    textarea.value = sampleText;
    lastAutoFilledText = sampleText;
}
```
- **Envio do teste** (@static/js/script.js#256-301):
```javascript
async function handleTest(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());

    const response = await fetch('/test_voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.success) {
        document.getElementById('generatedAudio').src = result.audio_url;
        document.getElementById('downloadLink').href = result.audio_url;
        document.getElementById('audioResult').style.display = 'block';
    }
}
```
Nesse fluxo, o backend (`piper_inference_fixed.py`) chama o Piper CLI dentro do `.venv`, garantindo que a versão pré-compilada (com `espeakbridge`) seja utilizada.

---

## 5. Observações Adicionais

- O script `download_voices.py` (executado no `.venv`) consulta `voices.json` no Hugging Face e baixa vozes oficiais, com validação MD5 e filtros por idioma/qualidade. Esse processo é fundamental para abastecer a aba “Modelos”.
- O ambiente `.venv` foi configurado com dependências extras (`torch`, `safetensors`, `ffmpeg-python`, `num2words`) para suportar modelos alternativos (ex.: `firstpixel/F5-TTS-pt-br`), embora o pipeline principal use Piper ONNX.
- O arquivo `PeepperTTS_venv.md` documenta apenas a parte funcional garantida dentro do ambiente virtual. Recursos adicionais podem exigir integrações externas (ex.: ffmpeg no PATH do sistema operacional).

---

### Contato
Em caso de dúvidas ou necessidade de ajuste no ambiente virtual, consulte o arquivo `download_voices.py` para obtenção de novas vozes ou ajuste o script `piper_inference_fixed.py` para alterar parâmetros do Piper CLI.

---

*Relatório gerado automaticamente em 09/11/2025.*
