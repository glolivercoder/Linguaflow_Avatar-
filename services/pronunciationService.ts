/**
 * PronunciationService - Service for pronunciation analysis and TTS
 */

const API_BASE_URL = 'http://localhost:8000';

import type { VoiceModelInfo } from '../types';

export interface PronunciationResult {
  overall_score: number;
  pitch_score: number;
  fluency_score: number;
  quality_score: number;
  text_accuracy: number;
  transcription: string;
  detailed_feedback: string;
  user_metrics: Record<string, number>;
  reference_metrics: Record<string, number>;
}

export interface ReferenceAudioResult {
  status: string;
  audio_path: string;
  audio_url?: string;
  text: string;
  voice_model?: string;
}

/**
 * Analyze pronunciation by sending audio to backend
 */
export async function analyzePronunciation(
  audioBlob: Blob,
  expectedText: string,
  referenceAudioPath?: string
): Promise<PronunciationResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('expected_text', expectedText);
  
  if (referenceAudioPath) {
    formData.append('reference_audio_path', referenceAudioPath);
  }

  const response = await fetch(`${API_BASE_URL}/analyze-pronunciation`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Pronunciation analysis failed');
  }

  return response.json();
}

/**
 * Generate reference audio using TTS
 */
export async function generateReferenceAudio(text: string, voiceModelPath?: string): Promise<ReferenceAudioResult> {
  const formData = new FormData();
  formData.append('text', text);
  if (voiceModelPath) {
    formData.append('voice_model', voiceModelPath);
  }

  const response = await fetch(`${API_BASE_URL}/generate-reference`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Reference generation failed');
  }

  const data: ReferenceAudioResult = await response.json();

  if (data.audio_url) {
    try {
      data.audio_url = new URL(data.audio_url, API_BASE_URL).toString();
    } catch (error) {
      console.warn('Failed to build audio URL from response.', error);
    }
  }

  return data;
}

/**
 * List available Piper voice models on the server
 */
export async function listVoiceModels(): Promise<VoiceModelInfo[]> {
  const response = await fetch(`${API_BASE_URL}/voice-models`);

  if (!response.ok) {
    throw new Error('Failed to load Piper voice models');
  }

  return response.json();
}

/**
 * Generate multiple reference audios for a lesson
 */
export async function generateLessonReferences(
  phrases: Record<string, string>
): Promise<{ status: string; references: Record<string, string> }> {
  const response = await fetch(`${API_BASE_URL}/generate-lesson-references`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(phrases),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lesson reference generation failed');
  }

  return response.json();
}

/**
 * List all available reference audio files
 */
export async function listReferences(): Promise<{ status: string; count: number; references: string[] }> {
  const response = await fetch(`${API_BASE_URL}/list-references`);

  if (!response.ok) {
    throw new Error('Failed to list references');
  }

  return response.json();
}

/**
 * Check if pronunciation API is available
 */
export async function checkHealth(): Promise<{ status: string; opensmile: string; models: string; tts: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}

/**
 * AudioRecorder - Record audio from microphone
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    this.audioChunks = [];
  }
}
