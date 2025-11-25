import os
import sys
import json
import base64
import subprocess
import tempfile
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from vosk import Model, KaldiRecognizer
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Load Vosk Models
class ModelManager:
    def __init__(self):
        self.models = {}
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.models_dir = os.path.join(os.path.dirname(self.base_path), 'vosk-models')
        
        # Define model paths
        self.model_paths = {
            'pt-BR': os.getenv('VOSK_MODEL_PATH', 'model'), # Default PT model in local dir
            'en-US': os.path.join(self.models_dir, 'vosk-model-small-en-us-0.15'),
            'en-US-graph': os.path.join(self.models_dir, 'vosk-model-en-us-0.22-lgraph')
        }

    def get_model(self, language: str):
        # Normalize language key
        if language not in self.model_paths:
            # Fallback for variations or default
            if language.startswith('en'):
                language = 'en-US'
            else:
                language = 'pt-BR'
        
        if language in self.models:
            return self.models[language]
            
        path = self.model_paths.get(language)
        if not path:
            logger.error(f'No model path configured for {language}')
            return None
            
        # Handle relative paths
        if not os.path.isabs(path):
            path = os.path.join(self.base_path, path)
            
        if not os.path.exists(path):
            logger.error(f'Model path does not exist: {path}')
            return None
            
        logger.info(f'Loading model for {language} from {path}')
        try:
            model = Model(path)
            self.models[language] = model
            return model
        except Exception as e:
            logger.error(f'Failed to load model for {language}: {e}')
            return None

model_manager = ModelManager()

# Piper Configuration
PIPER_VOICE_MODEL = os.getenv('PIPER_VOICE_MODEL', 'model.onnx')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

class AudioRequest(BaseModel):
    audioBase64: str
    model: str = 'google/gemma-2-9b-it'
    systemPrompt: str = 'You are a helpful assistant.'
    language: str = 'pt-BR'

@app.post('/chat/audio')
async def chat_audio(request: AudioRequest):
    logger.info(f"Received chat_audio request for language: {request.language}")
    model = model_manager.get_model(request.language)
    if not model:
        logger.warning(f"Model not found for {request.language}, trying fallback to pt-BR")
        # Try fallback to pt-BR if specific language fails
        model = model_manager.get_model('pt-BR')
        if not model:
             logger.error(f"Critical: Vosk model not loaded for {request.language} or pt-BR")
             raise HTTPException(status_code=500, detail=f'Vosk model not loaded for {request.language}')
    logger.info(f"Model loaded successfully for {request.language}")

    try:
        # 1. Decode Audio
        try:
            audio_data = base64.b64decode(request.audioBase64)
            logger.info(f"Audio decoded, length: {len(audio_data)} bytes")
        except Exception as e:
            logger.error(f"Audio decoding failed: {e}")
            raise HTTPException(status_code=400, detail=f'Invalid base64 audio: {e}')
        
        # 2. Transcribe with Vosk
        logger.info("Starting transcription...")
        rec = KaldiRecognizer(model, 16000)
        rec.AcceptWaveform(audio_data)
        result = json.loads(rec.FinalResult())
        transcription = result.get('text', '')
        logger.info(f'Transcription ({request.language}): {transcription}')

        if not transcription:
            logger.info("No transcription detected.")
            return {'transcription': '', 'llm_response': '', 'audio_base64': None}

        # 3. Call LLM (OpenRouter)
        logger.info("Calling LLM...")
        llm_response_text = ''
        if OPENROUTER_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        'https://openrouter.ai/api/v1/chat/completions',
                        headers={
                            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                            'Content-Type': 'application/json'
                        },
                        json={
                            'model': request.model,
                            'messages': [
                                {'role': 'system', 'content': request.systemPrompt},
                                {'role': 'user', 'content': transcription}
                            ]
                        },
                        timeout=30.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        llm_response_text = data['choices'][0]['message']['content']
                        logger.info("LLM response received.")
                    else:
                        logger.error(f'OpenRouter Error: {response.text}')
                        llm_response_text = 'Sorry, I could not connect to the AI.'
            except Exception as e:
                logger.error(f'OpenRouter connection failed: {e}')
                llm_response_text = 'Error connecting to AI service.'
        else:
            logger.warning("OPENROUTER_API_KEY not configured.")
            llm_response_text = 'OpenRouter API Key not configured.'

        # 4. Generate Audio (Piper TTS)
        logger.info("Generating TTS...")
        audio_out_base64 = None
        if llm_response_text:
            # Determine Piper Executable Path
            piper_exe = 'piper'
            if sys.platform == 'win32':
                # Try to find piper.exe in the same directory as the python executable (Scripts folder in venv)
                python_dir = os.path.dirname(sys.executable)
                candidate = os.path.join(python_dir, 'piper.exe')
                if os.path.exists(candidate):
                    piper_exe = candidate
            
            logger.info(f'Using Piper executable: {piper_exe}')
            
            # Create temp file for output
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                output_wav_path = temp_wav.name
            
            try:
                # Run Piper
                cmd = [
                    piper_exe,
                    '--model', PIPER_VOICE_MODEL,
                    '--output_file', output_wav_path
                ]
                
                logger.info(f'Running Piper command: {cmd}')
                
                process = subprocess.run(
                    cmd,
                    input=llm_response_text.encode('utf-8'),
                    capture_output=True
                )
                
                if process.returncode == 0 and os.path.exists(output_wav_path):
                    with open(output_wav_path, 'rb') as f:
                        audio_out_base64 = base64.b64encode(f.read()).decode('utf-8')
                    logger.info("TTS generation successful.")
                else:
                    logger.error(f'Piper failed: {process.stderr.decode()}')
                    logger.error(f'Piper stdout: {process.stdout.decode()}')

            except Exception as e:
                logger.error(f'Piper execution error: {e}')
            finally:
                if os.path.exists(output_wav_path):
                    try:
                        os.remove(output_wav_path)
                    except:
                        pass

        return {
            'transcription': transcription,
            'llm_response': llm_response_text,
            'audio_base64': audio_out_base64
        }

    except Exception as e:
        logger.error(f'Error processing request: {e}')
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/health')
async def health():
    # Check if at least one model can be loaded (e.g. pt-BR)
    pt_model = model_manager.get_model('pt-BR')
    return {'status': 'ok', 'vosk_loaded': pt_model is not None}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8200)
