# LinguaFlow Avatar - Isolated Fork

Versão isolada do LinguaFlow contendo apenas as abas Conversa e Configurações.
Usada para desenvolver o sistema de avatar sem afetar o código principal.

## Funcionalidades

- ✅ Conversa com IA (Gemini)
- ✅ Configurações
- ✅ TTS (Piper)
- ✅ STT (Vosk)
- ✅ Tradução e Fonética
- ✅ Backup/Restore

## Funcionalidades Removidas

- ❌ Flashcards
- ❌ Integração Anki
- ❌ Smart Learn
- ❌ Lições

## Configuração

1. Instalar dependências:
```bash
npm install
```

2. Configurar arquivo `.env`:
```env
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_PIXABAY_API_KEY=sua_chave_aqui
```

3. Iniciar serviços backend:
```bash
# Terminal 1 - Pronunciation Service
cd backend/pronunciation
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Terminal 2 - Proxy Service
cd backend/proxy
npm install
npm start

# Terminal 3 - Vosk Service (opcional)
cd backend/vosk_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

4. Iniciar frontend:
```bash
npm run dev
```

## Estrutura

```
app/
├── backend/          # Serviços backend
├── components/       # Componentes React
├── services/         # Serviços frontend
├── data/            # Dados estáticos
├── App.tsx          # Componente principal
└── ...
```

## Desenvolvimento do Avatar

Este fork foi criado especificamente para desenvolver o sistema de avatar.
Modificações podem ser feitas livremente sem afetar o projeto principal.
