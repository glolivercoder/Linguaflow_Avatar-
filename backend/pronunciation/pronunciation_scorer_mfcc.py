"""
MFCC-Based Pronunciation Scorer using librosa and FastDTW
Pure DSP approach - NO AI/Cloud dependencies
"""

import librosa
import numpy as np
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


class MFCCPronunciationScorer:
    """
    Score pronunciation by comparing MFCC features using Dynamic Time Warping (DTW)
    """
    
    def __init__(
        self,
        n_mfcc: int = 13,
        sample_rate: int = 16000,
        threshold_excellent: float = 2.0,
        threshold_good: float = 4.0
    ):
        """
        Initialize MFCC scorer
        
        Args:
            n_mfcc: Number of MFCC coefficients to extract
            sample_rate: Audio sample rate (Hz)
            threshold_excellent: DTW distance threshold for "excellent" (lower is better)
            threshold_good: DTW distance threshold for "good"
        """
        self.n_mfcc = n_mfcc
        self.sample_rate = sample_rate
        self.threshold_excellent = 1.5  # Stricter threshold for excellent
        self.threshold_good = 3.0       # Stricter threshold for good
        logger.info(f"MFCC Scorer initialized: n_mfcc={n_mfcc}, sr={sample_rate}")
    
    def extract_mfcc(self, audio_path: str) -> np.ndarray:
        """
        Extract MFCC features from audio file
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            MFCC matrix (n_mfcc x time_frames)
        """
        try:
            # Load audio
            y, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
            
            # Extract MFCCs
            mfccs = librosa.feature.mfcc(
                y=y,
                sr=sr,
                n_mfcc=self.n_mfcc,
                n_fft=2048,
                hop_length=512
            )
            
            # Normalize MFCCs (mean=0, std=1)
            mfccs = (mfccs - np.mean(mfccs, axis=1, keepdims=True)) / (
                np.std(mfccs, axis=1, keepdims=True) + 1e-8
            )
            
            logger.info(f"Extracted MFCCs: shape={mfccs.shape}")
            return mfccs
            
        except Exception as e:
            logger.error(f"MFCC extraction failed: {e}")
            raise
    
    def calculate_dtw_distance(
        self,
        user_mfcc: np.ndarray,
        reference_mfcc: np.ndarray
    ) -> Tuple[float, np.ndarray]:
        """
        Calculate Dynamic Time Warping distance between two MFCC sequences
        
        Args:
            user_mfcc: User's MFCC matrix
            reference_mfcc: Reference MFCC matrix
        
        Returns:
            (distance, path): DTW distance and alignment path
        """
        # Transpose to (time_frames x n_mfcc) for DTW
        user_seq = user_mfcc.T
        ref_seq = reference_mfcc.T
        
        # Calculate DTW distance
        distance, path = fastdtw(user_seq, ref_seq, dist=euclidean)
        
        # Normalize by sequence length
        normalized_distance = distance / max(len(user_seq), len(ref_seq))
        
        logger.info(f"DTW distance: {normalized_distance:.4f}")
        return normalized_distance, path
    
    def score_pronunciation(
        self,
        user_audio_path: str,
        reference_audio_path: str
    ) -> Dict[str, Any]:
        """
        Score user's pronunciation against reference
        
        Args:
            user_audio_path: Path to user's audio
            reference_audio_path: Path to reference audio
        
        Returns:
            Dict with scores and feedback
        """
        try:
            # Load audio to check for silence/energy
            y_user, sr_user = librosa.load(user_audio_path, sr=self.sample_rate, mono=True)
            
            # Check for silence/low energy
            rms = librosa.feature.rms(y=y_user)
            if np.mean(rms) < 0.005:  # Threshold for silence
                logger.warning("User audio is too silent/low energy. Skipping scoring.")
                return {
                    "overall_score": 0,
                    "dtw_distance": 999,
                    "quality_label": "poor",
                    "detailed_feedback": "⚠️ Não consegui ouvir você. Verifique seu microfone ou fale mais alto.",
                    "pronunciation_accuracy": 0,
                    "mfcc_shape_user": (0,0),
                    "mfcc_shape_reference": (0,0)
                }

            # Extract MFCCs
            user_mfcc = self.extract_mfcc(user_audio_path)
            reference_mfcc = self.extract_mfcc(reference_audio_path)
            
            # Calculate DTW distance
            dtw_distance, alignment_path = self.calculate_dtw_distance(
                user_mfcc, reference_mfcc
            )
            
            # Convert DTW distance to 0-100 score
            # Lower distance = higher score
            if dtw_distance <= self.threshold_excellent:
                overall_score = 100 - (dtw_distance / self.threshold_excellent) * 15
                quality_label = "excellent"
            elif dtw_distance <= self.threshold_good:
                overall_score = 85 - ((dtw_distance - self.threshold_excellent) / 
                                     (self.threshold_good - self.threshold_excellent)) * 15
                quality_label = "good"
            else:
                # Linear decay after "good" threshold
                overall_score = max(0, 70 - (dtw_distance - self.threshold_good) * 10)
                quality_label = "needs_improvement"
            
            overall_score = min(100, max(0, overall_score))
            
            # Generate feedback
            detailed_feedback = self._generate_feedback(
                overall_score, quality_label, dtw_distance
            )
            
            logger.info(f"Real-time MFCC Analysis Complete: Score={overall_score:.2f}, DTW={dtw_distance:.4f}")
            
            return {
                "overall_score": round(overall_score, 2),
                "dtw_distance": round(dtw_distance, 4),
                "quality_label": quality_label,
                "detailed_feedback": detailed_feedback,
                "pronunciation_accuracy": round(overall_score, 2),  # Alias for compatibility
                "mfcc_shape_user": user_mfcc.shape,
                "mfcc_shape_reference": reference_mfcc.shape
            }
            
        except Exception as e:
            logger.error(f"Pronunciation scoring failed: {e}")
            raise
    
    def _generate_feedback(
        self,
        score: float,
        quality: str,
        dtw_distance: float
    ) -> str:
        """Generate user-friendly feedback based on score"""
        
        if quality == "excellent":
            return f"🎉 Excelente! Sua entonação e ritmo estão muito próximos do nativo (Distância: {dtw_distance:.2f})."
        elif quality == "good":
            return f"✅ Muito bom! Score: {score:.0f}%. Tente focar na clareza das vogais para melhorar ainda mais."
        else:
            suggestions = []
            if dtw_distance > 5:
                suggestions.append("Tente falar um pouco mais devagar")
            if dtw_distance > 7:
                suggestions.append("Articule bem cada sílaba")
            if dtw_distance > 9:
                suggestions.append("O ritmo parece diferente do original")
            
            feedback = f"📚 Continue praticando! Score: {score:.0f}%. "
            if suggestions:
                feedback += " Dicas: " + "; ".join(suggestions)
            else:
                feedback += "Tente imitar a melodia da frase."
            
            return feedback
    
    def analyze_phoneme_alignment(
        self,
        user_mfcc: np.ndarray,
        reference_mfcc: np.ndarray,
        path: np.ndarray
    ) -> Dict[str, Any]:
        """
        Advanced: Analyze phoneme-level alignment (optional for detailed feedback)
        
        Returns:
            Dict with frame-by-frame alignment quality
        """
        # Calculate per-frame distance
        frame_distances = []
        for user_idx, ref_idx in path:
            distance = euclidean(
                user_mfcc[:, user_idx],
                reference_mfcc[:, ref_idx]
            )
            frame_distances.append(distance)
        
        frame_distances = np.array(frame_distances)
        
        return {
            "mean_frame_distance": float(np.mean(frame_distances)),
            "max_frame_distance": float(np.max(frame_distances)),
            "std_frame_distance": float(np.std(frame_distances)),
            "problematic_frames": int(np.sum(frame_distances > np.mean(frame_distances) + 2 * np.std(frame_distances)))
        }
