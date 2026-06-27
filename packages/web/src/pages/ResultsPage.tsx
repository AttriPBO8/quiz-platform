import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Grid,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';

export const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const results = location.state?.results;
  const isDarkMode = results?.darkMode || theme.palette.mode === 'dark';

  if (!results) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          No results found. Please complete a quiz first.
        </Alert>
      </Container>
    );
  }

  const { score, passed, correctCount, totalQuestions } = results;
  const wrongCount = totalQuestions - correctCount;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  // Determine colors based on result
  const getScoreColor = () => {
    if (score >= 80) return '#2e7d32'; // Dark green for excellent
    if (score >= 60) return '#f57c00'; // Orange for good
    return '#c62828'; // Red for fail
  };

  const getScoreEmoji = () => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    return '📚';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good Job!';
    return 'Keep Practicing!';
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            borderRadius: 3
          }}
        >
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: getScoreColor() }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Quiz Results
            </Typography>
          </Box>

          {/* Score Circle */}
          <Box 
            sx={{ 
              position: 'relative',
              width: 150,
              height: 150,
              margin: '0 auto',
              mb: 2
            }}
          >
            <Box
              sx={{
                width: 150,
                height: 150,
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#2d2d2d' : '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `6px solid ${getScoreColor()}`,
                boxShadow: `0 0 30px ${getScoreColor()}40`
              }}
            >
              <Typography variant="h2" sx={{ fontWeight: 700, color: getScoreColor(), lineHeight: 1 }}>
                {score}%
              </Typography>
              <Typography variant="caption" sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}>
                {getScoreLabel()}
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 40
              }}
            >
              {getScoreEmoji()}
            </Box>
          </Box>

          {/* Pass/Fail Badge */}
          <Chip 
            label={passed ? '✅ Passed!' : '❌ Failed'} 
            color={passed ? 'success' : 'error'}
            sx={{ 
              mb: 3,
              fontSize: '1rem',
              fontWeight: 600,
              py: 2,
              px: 2
            }}
          />

          {/* Stats Grid - Improved Colors */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  backgroundColor: isDarkMode ? '#1b5e20' : '#e8f5e9',
                  border: `1px solid ${isDarkMode ? '#2e7d32' : '#c8e6c9'}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="h5" sx={{ color: isDarkMode ? '#81c784' : '#2e7d32', fontWeight: 700 }}>
                  {correctCount}
                </Typography>
                <Typography variant="caption" sx={{ color: isDarkMode ? '#a5d6a7' : '#388e3c' }}>
                  ✅ Correct
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  backgroundColor: isDarkMode ? '#b71c1c' : '#ffebee',
                  border: `1px solid ${isDarkMode ? '#c62828' : '#ffcdd2'}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="h5" sx={{ color: isDarkMode ? '#ef9a9a' : '#c62828', fontWeight: 700 }}>
                  {wrongCount}
                </Typography>
                <Typography variant="caption" sx={{ color: isDarkMode ? '#ef9a9a' : '#d32f2f' }}>
                  ❌ Wrong
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  backgroundColor: isDarkMode ? '#0d47a1' : '#e3f2fd',
                  border: `1px solid ${isDarkMode ? '#1565c0' : '#bbdefb'}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="h5" sx={{ color: isDarkMode ? '#64b5f6' : '#1565c0', fontWeight: 700 }}>
                  {totalQuestions}
                </Typography>
                <Typography variant="caption" sx={{ color: isDarkMode ? '#90caf9' : '#1976d2' }}>
                  📝 Total
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}>
                Accuracy
              </Typography>
              <Typography variant="caption" sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}>
                {percentage}%
              </Typography>
            </Box>
            <Box 
              sx={{ 
                width: '100%', 
                height: 8, 
                backgroundColor: isDarkMode ? '#333333' : '#e0e0e0',
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: getScoreColor(),
                  borderRadius: 4,
                  transition: 'width 0.5s ease-in-out'
                }}
              />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button 
              variant="contained" 
              startIcon={<ReplayIcon />}
              onClick={() => navigate('/quiz')}
              sx={{ 
                backgroundColor: isDarkMode ? '#1976d2' : '#1976d2',
                '&:hover': {
                  backgroundColor: isDarkMode ? '#1565c0' : '#1565c0'
                }
              }}
            >
              Retry Quiz
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<HomeIcon />}
              onClick={() => navigate('/login')}
              sx={{ 
                color: isDarkMode ? '#ffffff' : 'inherit',
                borderColor: isDarkMode ? '#555555' : '#cccccc'
              }}
            >
              Home
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};