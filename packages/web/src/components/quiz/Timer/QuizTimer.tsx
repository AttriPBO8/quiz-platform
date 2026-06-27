import React, { useState, useEffect } from 'react';

interface QuizTimerProps {
  totalMinutes: number;
  onExpire: () => void;
  onWarning?: (timeLeft: number) => void;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({ 
  totalMinutes, 
  onExpire, 
  onWarning 
}) => {
  const [timeLeft, setTimeLeft] = useState(totalMinutes * 60);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        if (newTime === 900) { // 15 minutes
          setIsWarning(true);
          onWarning?.(15);
        }
        
        if (newTime === 300) { // 5 minutes
          setIsCritical(true);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire, onWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      padding: '10px 20px',
      background: isCritical ? '#f8d7da' : isWarning ? '#fff3cd' : '#e3f2fd',
      border: `2px solid ${isCritical ? '#dc3545' : isWarning ? '#ffc107' : '#1976d2'}`,
      borderRadius: '8px',
      display: 'inline-block',
      animation: isCritical ? 'blink 0.5s ease-in-out infinite' : 'none'
    }}>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
      <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>
        ⏱️ {formatTime(timeLeft)}
      </span>
      {isWarning && !isCritical && (
        <div style={{ color: '#856404', fontSize: '0.9rem', marginTop: '4px' }}>
          ⚠️ 15 minutes remaining
        </div>
      )}
      {isCritical && (
        <div style={{ color: '#721c24', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>
          🔴 5 minutes remaining!
        </div>
      )}
    </div>
  );
};