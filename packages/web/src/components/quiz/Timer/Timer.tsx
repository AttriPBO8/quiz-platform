/**
 * Quiz Timer Module
 * Handles countdown with visual warnings at 15min and 5min marks
 * Implements blink animation for critical time
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Timer.css';

interface TimerProps {
  totalMinutes: number;
  onExpire: () => void;
  onWarning?: (timeLeft: number) => void;
}

export const QuizTimer: React.FC<TimerProps> = ({ 
  totalMinutes, 
  onExpire, 
  onWarning 
}) => {
  const [timeLeft, setTimeLeft] = useState(totalMinutes * 60);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Format time as MM:SS
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Start the timer countdown
   */
  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Check for warning thresholds
        if (newTime === 900) { // 15 minutes
          setIsWarning(true);
          onWarning?.(15);
        }
        
        if (newTime === 300) { // 5 minutes
          setIsCritical(true);
          setIsWarning(true);
        }

        // Time expired
        if (newTime <= 0) {
          clearInterval(intervalRef.current!);
          onExpire();
          return 0;
        }

        return newTime;
      });
    }, 1000);
  }, [onExpire, onWarning]);

  // Start timer on mount
  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTimer]);

  // CSS classes for visual warnings
  const timerClasses = [
    'quiz-timer',
    isCritical ? 'timer-critical' : '',
    isWarning && !isCritical ? 'timer-warning' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={timerClasses}>
      {/* Warning banner for 15 minutes */}
      {isWarning && !isCritical && (
        <div className="timer-warning-banner">
          ⚠️ 15 minutes remaining
        </div>
      )}
      
      {/* Critical banner for 5 minutes */}
      {isCritical && (
        <div className="timer-critical-banner">
          🔴 5 minutes remaining!
        </div>
      )}
      
      {/* Timer display */}
      <div className="timer-display">
        <span className="timer-icon">⏱️</span>
        <span className="timer-text">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
};