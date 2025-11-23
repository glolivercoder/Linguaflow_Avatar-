"""
PronunciationAnalyzer - Extract acoustic features using openSMILE
"""

import opensmile
import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PronunciationAnalyzer:
    """Extract pronunciation features from audio using openSMILE"""
    
    def __init__(self):
        """Initialize openSMILE feature extractors"""
        logger.info("Initializing PronunciationAnalyzer with openSMILE")
        
        # eGeMAPS feature set for prosody analysis
        self.smile_prosody = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.Functionals,
        )
        
        # ComParE feature set for detailed acoustic analysis
        self.smile_compare = opensmile.Smile(
            feature_set=opensmile.FeatureSet.ComParE_2016,
            feature_level=opensmile.FeatureLevel.Functionals,
        )
    
    def extract_features(self, audio_path: str) -> Dict[str, Any]:
        """
        Extract comprehensive acoustic features from audio file
        
        Args:
            audio_path: Path to audio file (WAV recommended)
        
        Returns:
            Dictionary with extracted features
        """
        try:
            logger.info(f"Extracting features from: {audio_path}")
            
            # Extract eGeMAPS features (prosody)
            prosody_features = self.smile_prosody.process_file(audio_path)
            
            # Extract ComParE features (detailed acoustics)
            compare_features = self.smile_compare.process_file(audio_path)
            
            # Extract key metrics
            metrics = {
                "pitch_mean": float(prosody_features["F0semitoneFrom27.5Hz_sma3nz_amean"].values[0]),
                "pitch_stddev": float(prosody_features["F0semitoneFrom27.5Hz_sma3nz_stddevNorm"].values[0]),
                "pitch_range": float(prosody_features["F0semitoneFrom27.5Hz_sma3nz_pctlrange0-2"].values[0]),
                
                "loudness_mean": float(prosody_features["loudness_sma3_amean"].values[0]),
                "loudness_stddev": float(prosody_features["loudness_sma3_stddevNorm"].values[0]),
                
                "jitter_local": float(prosody_features["jitterLocal_sma3nz_amean"].values[0]),
                "shimmer_local": float(prosody_features["shimmerLocaldB_sma3nz_amean"].values[0]),
                
                "voice_quality": float(prosody_features["HNRdBACF_sma3nz_amean"].values[0]),
                
                "duration": float(compare_features["pcm_fftMag_spectralRollOff25.0_sma_linregerrA"].values[0]),
                
                "spectral_flux": float(compare_features["pcm_fftMag_spectralFlux_sma_amean"].values[0]),
                "mfcc_mean": float(compare_features["mfcc_sma[1]_amean"].values[0]),
            }
            
            logger.info(f"Feature extraction complete. Pitch mean: {metrics['pitch_mean']:.2f} Hz")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            # Return default values on error
            return {
                "pitch_mean": 0.0,
                "pitch_stddev": 0.0,
                "pitch_range": 0.0,
                "loudness_mean": 0.0,
                "loudness_stddev": 0.0,
                "jitter_local": 0.0,
                "shimmer_local": 0.0,
                "voice_quality": 0.0,
                "duration": 0.0,
                "spectral_flux": 0.0,
                "mfcc_mean": 0.0,
            }
    
    def analyze_pronunciation(self, audio_path: str) -> Dict[str, Any]:
        """
        Convenience method: Extract features and return formatted analysis
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            Dictionary with analysis results
        """
        metrics = self.extract_features(audio_path)
        
        return {
            "metrics": metrics,
            "status": "success" if metrics["pitch_mean"] > 0 else "error"
        }
