import React from 'react';

interface PronunciationScoreDisplayProps {
    score: number;
    qualityLabel: 'excellent' | 'good' | 'needs_improvement';
    feedback: string;
    showDetails?: boolean;
}

export const PronunciationScoreDisplay: React.FC<PronunciationScoreDisplayProps> = ({
    score,
    qualityLabel,
    feedback,
    showDetails = false
}) => {
    // Determine color based on quality
    const getColor = () => {
        if (qualityLabel === 'excellent') return '#4CAF50'; // Green
        if (qualityLabel === 'good') return '#FFC107'; // Yellow
        return '#F44336'; // Red
    };

    // Calculate stars (1-5 based on score)
    const stars = Math.round((score / 100) * 5);
    const starArray = Array.from({ length: 5 }, (_, i) => i < stars);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: `2px solid ${getColor()}`,
        }}>
            {/* Score percentage */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: getColor()
                }}>
                    {score.toFixed(0)}%
                </div>

                {/* Star rating */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {starArray.map((filled, idx) => (
                        <span key={idx} style={{
                            fontSize: '18px',
                            color: filled ? getColor() : '#444'
                        }}>
                            {filled ? '⭐' : '☆'}
                        </span>
                    ))}
                </div>
            </div>

            {/* Quality label */}
            <div style={{
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: getColor(),
                letterSpacing: '0.5px'
            }}>
                {qualityLabel === 'excellent' && '🎉 Excelente'}
                {qualityLabel === 'good' && '✅ Bom'}
                {qualityLabel === 'needs_improvement' && '📚 Precisa Melhorar'}
            </div>

            {/* Detailed feedback (optional) */}
            {showDetails && (
                <div style={{
                    fontSize: '13px',
                    color: '#ccc',
                    lineHeight: '1.4',
                    marginTop: '4px',
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px'
                }}>
                    {feedback}
                </div>
            )}
        </div>
    );
};

export default PronunciationScoreDisplay;
