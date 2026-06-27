import axios from 'axios';

// import { config } from '../config';
// const API_URL = config.apiUrl;

// Hardcode for testing (will work with backend on port 3000)
// const API_URL = 'http://localhost:3000/api';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class QuizService {
  async getQuestionsByDifficulty(filter: any): Promise<any[]> {
    // This will be replaced with actual API call
    console.log('Fetching questions with filter:', filter);
    return [];
  }

  async getAttemptCount(): Promise<number> {
    return 0; // Mock for testing
  }

  async getLastAttemptTime(): Promise<number | null> {
    return null; // Mock for testing
  }

  async recordAttempt(data: any): Promise<void> {
    console.log('Recording attempt:', data);
    // Mock - do nothing
  }
}

export const useQuizService = () => new QuizService();
