import React, { useState, useEffect, useCallback } from 'react';
import { QuizTimer } from '../Timer/QuizTimer';
import { QuestionRenderer } from '../QuestionRenderer/QuestionRenderer';
import { useQuizService } from '../../../services/quiz.service';

// Type definitions
export interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correctAnswer: number;
  category: string;
  timeSpent?: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  questions: Question[];
  answers: Map<string, number>;
  flagged: Set<string>;
  attempted: Set<string>;
  startTime: number;
  endTime?: number;
  score?: number;
  passed?: boolean;
}

export interface QuizConfig {
  title: string;
  totalQuestions: number;
  timeLimit: number;
  passingScore: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  maxAttempts: number;
  cooldownPeriod: number;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  questionPerformance: Array<{
    questionId: string;
    correct: boolean;
    timeSpent: number;
  }>;
}

interface QuizEngineProps {
  config: QuizConfig;
  onComplete?: (result: QuizResult) => void;
  onError?: (error: Error) => void;
}

// Helper functions
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('An unknown error occurred');
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ config, onComplete, onError }) => {
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const quizService = useQuizService();

  const loadQuestions = useCallback(async (attempt: number): Promise<Question[]> => {
    try {
      const { easy, medium, hard } = config.difficultyDistribution;
      
      if (attempt === 1) {
        // First attempt - load from all difficulties
        return await quizService.getQuestionsByDifficulty({
          easy: easy || 10,
          medium: medium || 10,
          hard: hard || 10
        });
      } else {
        // Reattempt - mix easy and medium only
        const total = easy + medium;
        const easyCount = Math.floor(total * 0.5);
        const mediumCount = total - easyCount;
        
        const questions = await quizService.getQuestionsByDifficulty({
          easy: easyCount,
          medium: mediumCount,
          hard: 0
        });
        
        return shuffleArray(questions);
      }
    } catch (err) {
      throw new Error(`Failed to load questions: ${getErrorMessage(err)}`);
    }
  }, [config.difficultyDistribution, quizService]);

  const initializeQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const attemptCount = await quizService.getAttemptCount();
      if (attemptCount >= config.maxAttempts) {
        throw new Error(`Maximum attempts (${config.maxAttempts}) exceeded`);
      }

      const lastAttempt = await quizService.getLastAttemptTime();
      if (lastAttempt) {
        const hoursSinceLast = (Date.now() - lastAttempt) / (1000 * 60 * 60);
        if (hoursSinceLast < config.cooldownPeriod) {
          throw new Error(`Please wait ${config.cooldownPeriod - hoursSinceLast} hours before retrying`);
        }
      }

      const questions = await loadQuestions(attemptCount + 1);
      
      setQuizState({
        currentQuestionIndex: 0,
        questions,
        answers: new Map(),
        flagged: new Set(),
        attempted: new Set(),
        startTime: Date.now()
      });
    } catch (err) {
      setError(getErrorMessage(err));
      onError?.(toError(err));
    } finally {
      setLoading(false);
    }
  }, [config, loadQuestions, quizService, onError]);

  useEffect(() => {
    initializeQuiz();
  }, [initializeQuiz]);

  const handleAnswer = useCallback((questionId: string, answerIndex: number) => {
    if (!quizState || isComplete) return;

    setQuizState(prev => {
      if (!prev) return prev;
      
      const newAnswers = new Map(prev.answers);
      newAnswers.set(questionId, answerIndex);
      
      const newAttempted = new Set(prev.attempted);
      newAttempted.add(questionId);

      return {
        ...prev,
        answers: newAnswers,
        attempted: newAttempted
      };
    });
  }, [quizState, isComplete]);

  const toggleFlag = useCallback((questionId: string) => {
    if (!quizState || isComplete) return;

    setQuizState(prev => {
      if (!prev) return prev;
      
      const newFlagged = new Set(prev.flagged);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }

      return {
        ...prev,
        flagged: newFlagged
      };
    });
  }, [quizState, isComplete]);

  const navigateQuestion = useCallback((direction: 'next' | 'prev') => {
    if (!quizState) return;

    setQuizState(prev => {
      if (!prev) return prev;
      
      const newIndex = direction === 'next' 
        ? Math.min(prev.currentQuestionIndex + 1, prev.questions.length - 1)
        : Math.max(prev.currentQuestionIndex - 1, 0);

      return {
        ...prev,
        currentQuestionIndex: newIndex
      };
    });
  }, [quizState]);

  const calculateResults = useCallback((): QuizResult => {
    if (!quizState) {
      throw new Error('Quiz not initialized');
    }

    const { questions, answers, startTime } = quizState;
    let correctCount = 0;
    const questionPerformance: QuizResult['questionPerformance'] = [];

    questions.forEach(question => {
      const userAnswer = answers.get(question.id);
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      
      questionPerformance.push({
        questionId: question.id,
        correct: isCorrect,
        timeSpent: question.timeSpent || 0
      });
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= config.passingScore;
    const timeSpent = Date.now() - startTime;

    return {
      score,
      passed,
      totalQuestions,
      correctAnswers: correctCount,
      timeSpent,
      questionPerformance
    };
  }, [quizState, config.passingScore]);

  const submitQuiz = useCallback(async () => {
    if (!quizState || isComplete) return;

    try {
      const results = calculateResults();
      
      await quizService.recordAttempt({
        quizId: config.title,
        ...results,
        timestamp: Date.now()
      });

      setQuizState(prev => ({
        ...prev!,
        endTime: Date.now(),
        score: results.score,
        passed: results.passed
      }));

      setIsComplete(true);
      onComplete?.(results);
    } catch (err) {
      setError(getErrorMessage(err));
      onError?.(toError(err));
    }
  }, [quizState, isComplete, calculateResults, quizService, config.title, onComplete, onError]);

  const handleTimerExpire = useCallback(async () => {
    await submitQuiz();
  }, [submitQuiz]);

  // Loading state
  if (loading) {
    return <div>Loading quiz questions...</div>;
  }

  // Error state
  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  // Complete state - show results
  if (isComplete && quizState) {
    return (
      <div className="quiz-results">
        <h2>Quiz Complete!</h2>
        <div>Score: {quizState.score}%</div>
        <div>Status: {quizState.passed ? '✅ Passed' : '❌ Failed'}</div>
        <div>Correct: {quizState.answers.size}/{quizState.questions.length}</div>
        <button onClick={() => window.location.reload()}>Retry Quiz</button>
      </div>
    );
  }

  // Active quiz state
  if (!quizState) return null;

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const isLastQuestion = quizState.currentQuestionIndex === quizState.questions.length - 1;

  return (
    <div className="quiz-engine">
      <div className="quiz-header">
        <h2>{config.title}</h2>
        <QuizTimer 
          totalMinutes={config.timeLimit}
          onExpire={handleTimerExpire}
        />
        <div className="progress">
          Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
        </div>
        <div className="status-badges">
          <span>Attempted: {quizState.attempted.size}</span>
          <span>Flagged: {quizState.flagged.size}</span>
        </div>
      </div>

      <QuestionRenderer
        question={currentQuestion}
        selectedAnswer={quizState.answers.get(currentQuestion.id) ?? -1}
        isFlagged={quizState.flagged.has(currentQuestion.id)}
        onAnswer={(answer: number) => handleAnswer(currentQuestion.id, answer)}
        onToggleFlag={() => toggleFlag(currentQuestion.id)}
        questionNumber={quizState.currentQuestionIndex + 1}
        totalQuestions={quizState.questions.length}
      />

      <div className="navigation-controls">
        <button 
          onClick={() => navigateQuestion('prev')}
          disabled={quizState.currentQuestionIndex === 0}
        >
          Previous
        </button>
        {isLastQuestion ? (
          <button onClick={submitQuiz} className="submit-btn">
            Submit Quiz
          </button>
        ) : (
          <button onClick={() => navigateQuestion('next')}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};