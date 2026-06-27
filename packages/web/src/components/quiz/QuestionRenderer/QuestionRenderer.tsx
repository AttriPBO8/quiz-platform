import React from 'react';
import { Box, Typography, Radio, RadioGroup, FormControlLabel, Button } from '@mui/material';

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
  category: string;
}

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: number;
  isFlagged: boolean;
  onAnswer: (answer: number) => void;
  onToggleFlag: () => void;
  questionNumber: number;
  totalQuestions: number;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedAnswer,
  isFlagged,
  onAnswer,
  onToggleFlag,
  questionNumber,
  totalQuestions
}) => {
  return (
    <Box>
      <Box mb={2}>
        <Typography variant="overline" color="textSecondary">
          {question.difficulty.toUpperCase()} • {question.category}
        </Typography>
        <Typography variant="h6" sx={{ mt: 1 }}>
          {questionNumber}. {question.text}
        </Typography>
      </Box>

      <RadioGroup
        value={selectedAnswer !== -1 ? selectedAnswer : ''}
        onChange={(e) => onAnswer(parseInt(e.target.value))}
      >
        {question.options.map((option, index) => (
          <FormControlLabel
            key={index}
            value={index}
            control={<Radio />}
            label={option}
          />
        ))}
      </RadioGroup>

      <Box mt={2}>
        <Button
          variant={isFlagged ? 'contained' : 'outlined'}
          color={isFlagged ? 'warning' : 'primary'}
          onClick={onToggleFlag}
          size="small"
        >
          {isFlagged ? '⭐ Flagged' : 'Flag Question'}
        </Button>
      </Box>
    </Box>
  );
};