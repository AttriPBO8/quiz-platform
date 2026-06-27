import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
  IconButton
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import QuizIcon from '@mui/icons-material/Quiz';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

// ============================================
// CONSTANTS
// ============================================
const FLAG_COLOR = '#ff9800';
const GREY_DEFAULT = '#9e9e9e';
const LIGHT_GREEN = '#a5d6a7';
const BLUE_SELECTED = '#1976d2';

// ============================================
// INTERFACES
// ============================================
interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
  category: string;
}

interface ApiResponse {
  success: boolean;
  data: Question[];
  total: number;
  timestamp: string;
}

interface QuizPageProps {
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================
export const QuizPage: React.FC<QuizPageProps> = ({ darkMode: propDarkMode, onToggleDarkMode }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Dark mode state
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const isDarkMode = propDarkMode !== undefined ? propDarkMode : localDarkMode;

  // Quiz state
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================
  const handleToggleDarkMode = useCallback(() => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const newMode = !localDarkMode;
      setLocalDarkMode(newMode);
      localStorage.setItem('darkMode', String(newMode));
    }
  }, [onToggleDarkMode, localDarkMode]);

  /**
   * ✅ FIXED: Randomly select exactly 10 Easy, 10 Medium, 10 Hard questions
   * Shuffles each difficulty pool first, then takes first 10
   */
  const selectQuestions = useCallback((allQ: Question[]): Question[] => {
    // Separate by difficulty
    const easy = allQ.filter(q => q.difficulty === 'easy');
    const medium = allQ.filter(q => q.difficulty === 'medium');
    const hard = allQ.filter(q => q.difficulty === 'hard');

    console.log(`📊 Available - Easy: ${easy.length}, Medium: ${medium.length}, Hard: ${hard.length}`);

    // ✅ Shuffle each difficulty pool
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Take first 10 from each shuffled pool
    const selectedEasy = shuffleArray(easy).slice(0, 10);
    const selectedMedium = shuffleArray(medium).slice(0, 10);
    const selectedHard = shuffleArray(hard).slice(0, 10);

    // Combine in order: Easy → Medium → Hard
    const selected = [...selectedEasy, ...selectedMedium, ...selectedHard];
    
    console.log(`✅ Selected ${selected.length} questions (10 Easy, 10 Medium, 10 Hard) - Randomized`);
    return selected;
  }, []);

  /**
   * Calculate score based on user answers
   */
  const calculateScore = useCallback(() => {
    let correctCount = 0;
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer === 0) { // Mock: assuming option 0 is correct
        correctCount++;
      }
    });
    return correctCount;
  }, [questions, answers]);

  // ============================================
  // API CALLS
  // ============================================
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch('/api/quiz/questions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          setAllQuestions(result.data);
          console.log(`📚 Loaded ${result.data.length} total questions`);
          
          // ✅ Select randomized questions
          const selected = selectQuestions(result.data);
          setQuestions(selected);
          setError(null);
        } else {
          throw new Error('No questions received from server');
        }
      } catch (err) {
        console.error('Error loading questions:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load questions: ${errorMessage}`);
        loadFallbackQuestions();
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [selectQuestions]);

  const loadFallbackQuestions = () => {
    const fallbackQuestions: Question[] = Array.from({ length: 30 }, (_, i) => ({
      id: `q_${String(i + 1).padStart(3, '0')}`,
      text: `Sample Question ${i + 1}: What is the correct answer?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      difficulty: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard',
      category: i < 10 ? 'Basic' : i < 20 ? 'Intermediate' : 'Advanced'
    }));
    setQuestions(fallbackQuestions);
    console.log('📚 Using fallback questions');
  };

  // ============================================
  // QUIZ SUBMISSION
  // ============================================
  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    const totalQuestions = questions.length;
    const correctCount = calculateScore();
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;
    
    navigate('/results', {
      state: {
        results: {
          score,
          passed,
          correctCount,
          totalQuestions,
          darkMode: isDarkMode
        }
      }
    });
  }, [questions.length, calculateScore, navigate, isDarkMode]);

  const handleConfirmSubmit = useCallback(() => {
    setShowSubmitDialog(false);
    handleSubmit();
  }, [handleSubmit]);

  const handleSubmitClick = useCallback(() => {
    setShowSubmitDialog(true);
  }, []);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const getQuestionStatus = useCallback((index: number) => {
    const questionId = questions[index]?.id;
    if (!questionId) return 'unattempted';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    if (answers[questionId] !== undefined) return 'attempted';
    return 'unattempted';
  }, [questions, flaggedQuestions, answers]);

  const getAttemptedCount = useCallback(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const getFlaggedCount = useCallback(() => {
    return flaggedQuestions.size;
  }, [flaggedQuestions]);

  const getUnattemptedCount = useCallback(() => {
    return questions.length - getAttemptedCount();
  }, [questions, getAttemptedCount]);

  const getDisplayQuestions = useCallback(() => {
    if (showOnlyFlagged) {
      return questions.filter(q => flaggedQuestions.has(q.id));
    }
    return questions;
  }, [questions, flaggedQuestions, showOnlyFlagged]);

  /**
   * Get fill color for question number box
   * - Blue for selected
   * - Light Green for attempted
   * - Grey for default (unattempted)
   */
  const getBoxColor = useCallback((status: string, isSelected: boolean, isAttempted: boolean) => {
    if (isSelected) return BLUE_SELECTED;
    if (isAttempted) return LIGHT_GREEN;
    return GREY_DEFAULT;
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // TIMER
  // ============================================
  useEffect(() => {
    if (timeLeft <= 0 && !submitted && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, submitted, questions, handleSubmit]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted && questions.length > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, submitted, questions]);

  // ============================================
  // USER ACTIONS
  // ============================================
  const handleAnswer = (questionId: string, answerIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const toggleFlag = (questionId: string) => {
    if (submitted) return;
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // ============================================
  // RENDER VARIABLES
  // ============================================
  const isTimerCritical = timeLeft <= 300 && timeLeft > 0;
  const displayQuestions = getDisplayQuestions();
  const displayIndex = displayQuestions.length > 0 ? 
    displayQuestions.findIndex(q => q.id === questions[currentIndex]?.id) : -1;
  const currentDisplayIndex = displayIndex !== -1 ? displayIndex : 0;
  const isLastQuestionInFullList = currentIndex === questions.length - 1;
  const isLastFlaggedQuestion = showOnlyFlagged && currentDisplayIndex === displayQuestions.length - 1;

  // ============================================
  // LOADING / ERROR STATES
  // ============================================
  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Loading questions...</Typography>
          <LinearProgress sx={{ width: '100%', maxWidth: 400, mt: 2 }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
          <Button variant="outlined" size="small" sx={{ ml: 2 }} onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  if (questions.length === 0) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          No questions available. Please contact support.
        </Alert>
      </Container>
    );
  }

  const currentQuestion = displayQuestions[currentDisplayIndex] || displayQuestions[0];
  const progress = displayQuestions.length > 0 ? ((currentDisplayIndex + 1) / displayQuestions.length) * 100 : 0;
  const isLastQuestion = currentDisplayIndex === displayQuestions.length - 1;

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 4, p: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ==========================================
          HEADER / APP BAR
          ========================================== */}
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 1100,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
        borderBottom: `1px solid ${isDarkMode ? '#333333' : '#e0e0e0'}`,
        p: 2
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center">
            <QuizIcon sx={{ mr: 2, color: '#1976d2', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Sample Quiz</Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <IconButton onClick={handleToggleDarkMode} color="inherit" size="small">
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: isTimerCritical ? '#dc3545' : 'transparent',
              color: isTimerCritical ? '#ffffff' : (isDarkMode ? '#ffffff' : 'inherit'),
              animation: isTimerCritical ? 'blinkBox 0.5s ease-in-out infinite' : 'none',
              minWidth: '80px',
              justifyContent: 'center'
            }}>
              <Typography variant="h6" sx={{ fontWeight: isTimerCritical ? 'bold' : 'normal' }}>
                ⏱️ {formatTime(timeLeft)}
              </Typography>
            </Box>

            <Chip 
              icon={<FlagIcon sx={{ color: FLAG_COLOR }} />}
              label={`Flagged: ${getFlaggedCount()}`}
              size="medium"
              onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
              sx={{
                backgroundColor: showOnlyFlagged ? FLAG_COLOR : (isDarkMode ? '#333333' : '#f5f5f5'),
                color: showOnlyFlagged ? '#ffffff' : (isDarkMode ? '#ffffff' : 'inherit'),
                borderColor: FLAG_COLOR,
                border: '1px solid',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: showOnlyFlagged ? '#e68a00' : (isDarkMode ? '#444444' : '#e0e0e0')
                },
                '& .MuiChip-icon': {
                  color: showOnlyFlagged ? '#ffffff' : FLAG_COLOR
                }
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Blink animation for timer */}
      <style>
        {`
          @keyframes blinkBox {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>

      {/* ==========================================
          STATS BAR
          ========================================== */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        px: 2, 
        py: 1,
        mb: 2,
        mt: 1,
        backgroundColor: isDarkMode ? '#2d2d2d' : '#f5f5f5',
        borderRadius: 1,
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip 
            icon={<CheckCircleIcon sx={{ color: '#4caf50' }} />}
            label={`Attempted: ${getAttemptedCount()}/${questions.length}`}
            size="small"
            variant="outlined"
            sx={{ color: isDarkMode ? '#ffffff' : 'inherit', borderColor: isDarkMode ? '#555555' : '#e0e0e0' }}
          />
          <Chip 
            icon={<FlagIcon sx={{ color: FLAG_COLOR }} />}
            label={`Flagged: ${getFlaggedCount()}`}
            size="small"
            variant="outlined"
            onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
            sx={{ 
              color: isDarkMode ? '#ffffff' : 'inherit',
              borderColor: FLAG_COLOR,
              cursor: 'pointer',
              backgroundColor: showOnlyFlagged ? `${FLAG_COLOR}30` : 'transparent',
              '&:hover': { backgroundColor: isDarkMode ? '#444444' : '#e0e0e0' },
              '& .MuiChip-icon': { color: FLAG_COLOR }
            }}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="textSecondary">
            {showOnlyFlagged ? 'Showing Flagged Questions' : `Progress: ${Math.round((getAttemptedCount() / questions.length) * 100)}%`}
          </Typography>
        </Box>
      </Box>

      {/* ==========================================
          MAIN GRID
          ========================================== */}
      <Grid container spacing={2} sx={{ flex: 1 }}>
        
        {/* ==========================================
            LEFT SIDEBAR - DESKTOP QUESTION NAVIGATOR
            ✅ HIDDEN ON MOBILE
            ========================================== */}
        {!isMobile && (
          <Grid item xs={12} md={3} lg={2}>
            <Paper elevation={2} sx={{ 
              p: 2, 
              position: 'sticky', 
              top: 16,
              backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
              color: isDarkMode ? '#ffffff' : 'inherit'
            }}>
              <Typography variant="subtitle2" gutterBottom>
                {showOnlyFlagged ? 'Flagged Questions' : 'All Questions'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {displayQuestions.map((q, idx) => {
                  const originalIndex = questions.findIndex(question => question.id === q.id);
                  const status = getQuestionStatus(originalIndex);
                  const isSelected = currentDisplayIndex === idx;
                  const isAttempted = answers[q.id] !== undefined;
                  const isFlagged = flaggedQuestions.has(q.id);
                  
                  const fillColor = getBoxColor(status, isSelected, isAttempted);
                  
                  return (
                    <Box key={q.id} sx={{ position: 'relative', display: 'inline-block' }}>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          minWidth: 32,
                          width: 32,
                          height: 32,
                          padding: 0,
                          fontSize: '0.7rem',
                          backgroundColor: fillColor,
                          color: isSelected ? 'white' : (isDarkMode ? '#ffffff' : '#000000'),
                          border: 'none',
                          boxShadow: 'none',
                          '&:hover': {
                            backgroundColor: fillColor,
                            opacity: 0.8,
                            boxShadow: 'none'
                          }
                        }}
                        onClick={() => {
                          const targetIndex = questions.findIndex(question => question.id === q.id);
                          if (targetIndex !== -1) {
                            setCurrentIndex(targetIndex);
                          }
                        }}
                      >
                        {originalIndex + 1}
                      </Button>
                      
                      {isFlagged && (
                        <Box sx={{ position: 'absolute', top: -4, right: -4 }}>
                          <FlagIcon sx={{ fontSize: 12, color: FLAG_COLOR }} />
                        </Box>
                      )}
                      
                      {isAttempted && !isSelected && (
                        <Box sx={{ position: 'absolute', top: '50%', right: -6, transform: 'translateY(-50%)' }}>
                          <CheckCircleIcon sx={{ fontSize: 12, color: '#4caf50' }} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {showOnlyFlagged && displayQuestions.length === 0 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="textSecondary">No flagged questions</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* ==========================================
            MAIN QUESTION AREA
            ========================================== */}
        <Grid item xs={12} md={9} lg={10}>
          <Paper elevation={2} sx={{ 
            p: 3,
            minHeight: '400px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            color: isDarkMode ? '#ffffff' : 'inherit'
          }}>
            
            {/* ==========================================
                MOBILE QUESTION NAVIGATOR (Top of question area)
                ========================================== */}
            {isMobile && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ mr: 1, color: isDarkMode ? '#ffffff' : 'inherit' }}>
                  {showOnlyFlagged ? 'Flagged:' : 'Questions:'}
                </Typography>
                {displayQuestions.map((q, idx) => {
                  const originalIndex = questions.findIndex(question => question.id === q.id);
                  const status = getQuestionStatus(originalIndex);
                  const isSelected = currentDisplayIndex === idx;
                  const isAttempted = answers[q.id] !== undefined;
                  const isFlagged = flaggedQuestions.has(q.id);
                  
                  const fillColor = getBoxColor(status, isSelected, isAttempted);
                  
                  return (
                    <Box key={q.id} sx={{ position: 'relative', display: 'inline-block' }}>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          minWidth: 28,
                          width: 28,
                          height: 28,
                          padding: 0,
                          fontSize: '0.6rem',
                          backgroundColor: fillColor,
                          color: isSelected ? 'white' : (isDarkMode ? '#ffffff' : '#000000'),
                          border: 'none',
                          boxShadow: 'none',
                          '&:hover': {
                            backgroundColor: fillColor,
                            opacity: 0.8,
                            boxShadow: 'none'
                          }
                        }}
                        onClick={() => {
                          const targetIndex = questions.findIndex(question => question.id === q.id);
                          if (targetIndex !== -1) {
                            setCurrentIndex(targetIndex);
                          }
                        }}
                      >
                        {originalIndex + 1}
                      </Button>
                      
                      {isFlagged && (
                        <Box sx={{ position: 'absolute', top: -3, right: -3 }}>
                          <FlagIcon sx={{ fontSize: 8, color: FLAG_COLOR }} />
                        </Box>
                      )}
                      
                      {isAttempted && !isSelected && (
                        <Box sx={{ position: 'absolute', bottom: -3, right: -3 }}>
                          <CheckCircleIcon sx={{ fontSize: 8, color: '#4caf50' }} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
                {showOnlyFlagged && displayQuestions.length === 0 && (
                  <Typography variant="caption" color="textSecondary">No flagged questions</Typography>
                )}
              </Box>
            )}

            {/* ==========================================
                QUESTION CONTENT
                ========================================== */}
            {displayQuestions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6">No flagged questions</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setShowOnlyFlagged(false)}>
                  Show All Questions
                </Button>
              </Box>
            ) : (
              <>
                {/* Progress Bar */}
                <Box sx={{ mb: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress}
                    sx={{
                      backgroundColor: isDarkMode ? '#333333' : '#e0e0e0',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#1976d2' }
                    }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: isDarkMode ? '#aaaaaa' : 'inherit' }}>
                    {showOnlyFlagged ? `Flagged Question ${currentDisplayIndex + 1} of ${displayQuestions.length}` : 
                      `Question ${currentDisplayIndex + 1} of ${displayQuestions.length}`}
                  </Typography>
                </Box>

                {/* Question Text & Options */}
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ mt: 1, color: isDarkMode ? '#ffffff' : 'inherit' }}>
                        {currentQuestion.text}
                      </Typography>
                    </Box>
                    <IconButton 
                      onClick={() => toggleFlag(currentQuestion.id)}
                      color={flaggedQuestions.has(currentQuestion.id) ? 'warning' : 'default'}
                      size="small"
                      sx={{ color: flaggedQuestions.has(currentQuestion.id) ? FLAG_COLOR : 'inherit' }}
                    >
                      {flaggedQuestions.has(currentQuestion.id) ? <FlagIcon /> : <FlagOutlinedIcon />}
                    </IconButton>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    {currentQuestion.options.map((option, index) => (
                      <Button
                        key={index}
                        fullWidth
                        variant={answers[currentQuestion.id] === index ? 'contained' : 'outlined'}
                        onClick={() => handleAnswer(currentQuestion.id, index)}
                        sx={{ 
                          mb: 1, 
                          justifyContent: 'flex-start', 
                          textTransform: 'none',
                          py: 1.5,
                          color: isDarkMode ? '#ffffff' : 'inherit',
                          borderColor: isDarkMode ? '#555555' : undefined,
                          '&:hover': {
                            backgroundColor: answers[currentQuestion.id] === index ? 'primary.dark' : (isDarkMode ? '#333333' : 'action.hover')
                          }
                        }}
                        disabled={submitted}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </Button>
                    ))}
                  </Box>
                </Box>

                {/* Navigation Buttons */}
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (currentDisplayIndex > 0) {
                        const prevQuestion = displayQuestions[currentDisplayIndex - 1];
                        const targetIndex = questions.findIndex(q => q.id === prevQuestion.id);
                        if (targetIndex !== -1) {
                          setCurrentIndex(targetIndex);
                        }
                      }
                    }}
                    disabled={currentDisplayIndex === 0 || submitted}
                    sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                  >
                    ← Previous
                  </Button>

                  <Box display="flex" gap={1}>
                    {!isLastQuestion && (
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (currentDisplayIndex < displayQuestions.length - 1) {
                            const nextQuestion = displayQuestions[currentDisplayIndex + 1];
                            const targetIndex = questions.findIndex(q => q.id === nextQuestion.id);
                            if (targetIndex !== -1) {
                              setCurrentIndex(targetIndex);
                            }
                          }
                        }}
                        disabled={submitted}
                      >
                        Next →
                      </Button>
                    )}
                    {isLastQuestion && (
                      isLastFlaggedQuestion ? (
                        <Button variant="contained" color="primary" onClick={() => setShowOnlyFlagged(false)} disabled={submitted}>
                          ↩️ Return
                        </Button>
                      ) : (
                        isLastQuestionInFullList ? (
                          <Button variant="contained" color="primary" onClick={handleSubmitClick} disabled={submitted}>
                            {submitted ? 'Submitting...' : 'Submit Quiz'}
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => {
                              if (currentDisplayIndex < displayQuestions.length - 1) {
                                const nextQuestion = displayQuestions[currentDisplayIndex + 1];
                                const targetIndex = questions.findIndex(q => q.id === nextQuestion.id);
                                if (targetIndex !== -1) {
                                  setCurrentIndex(targetIndex);
                                }
                              }
                            }}
                            disabled={submitted}
                          >
                            Next →
                          </Button>
                        )
                      )
                    )}
                  </Box>
                </Box>

                {/* Back to All Questions */}
                {showOnlyFlagged && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button variant="text" size="small" onClick={() => setShowOnlyFlagged(false)} sx={{ color: FLAG_COLOR }}>
                      ← Back to All Questions
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <Box sx={{ 
        mt: 3, 
        pt: 2, 
        pb: 2,
        textAlign: 'center',
        borderTop: `1px solid ${isDarkMode ? '#333333' : '#e0e0e0'}`,
        color: isDarkMode ? '#888888' : '#999999'
      }}>
        <Typography variant="caption">© Attrilium Technology</Typography>
      </Box>

      {/* ==========================================
          SUBMIT CONFIRMATION DIALOG
          ========================================== */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {getAttemptedCount() < questions.length ? (
              <>
                ⚠️ You have <strong>{getUnattemptedCount()}</strong> unanswered question(s) out of {questions.length}.
                <br /><br />
                {getFlaggedCount() > 0 && (
                  <>You have <strong>{getFlaggedCount()}</strong> flagged question(s) for review.</>
                )}
                <br /><br />
                Are you sure you want to submit?
              </>
            ) : (
              <>
                ✅ You have attempted all {questions.length} questions!
                <br /><br />
                {getFlaggedCount() > 0 && (
                  <>You have <strong>{getFlaggedCount()}</strong> flagged question(s) for review.</>
                )}
                <br /><br />
                Ready to submit your quiz?
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>Review Questions</Button>
          <Button onClick={handleConfirmSubmit} variant="contained" color="primary" autoFocus>
            Submit Quiz
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};