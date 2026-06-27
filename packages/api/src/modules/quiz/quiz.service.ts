import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QuizService {
  private questions: any[] = [];
  private attempts: Map<string, any> = new Map();
  private quizConfigs: Map<string, any> = new Map();

  constructor() {
    this.loadQuestions();
    this.loadQuizConfigs();
  }

  /**
   * Load questions from JSON file
   */
  private loadQuestions() {
    try {
      // Try multiple paths for the JSON file
      const possiblePaths = [
        path.join(__dirname, '../../seeders/questions-data.json'),
        path.join(__dirname, '../seeders/questions-data.json'),
        path.join(process.cwd(), 'src/seeders/questions-data.json'),
        path.join(process.cwd(), 'packages/api/src/seeders/questions-data.json')
      ];

      let data = null;
      let loadedPath = '';

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          data = fs.readFileSync(filePath, 'utf8');
          loadedPath = filePath;
          break;
        }
      }

      if (!data) {
        throw new Error('Questions file not found in any expected location');
      }

      this.questions = JSON.parse(data);
      console.log(`✅ Loaded ${this.questions.length} questions from: ${loadedPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load questions:', errorMessage);
      console.log('📚 Using fallback questions instead');
      this.loadFallbackQuestions();
    }
  }

  /**
   * Load quiz configurations
   */
  private loadQuizConfigs() {
    this.quizConfigs.set('sample-quiz', {
      id: 'sample-quiz',
      title: 'Sample Quiz',
      timeLimit: 15,
      passingScore: 60,
      maxAttempts: 2,
      cooldownPeriod: 24,
      difficultyDistribution: {
        easy: 10,
        medium: 10,
        hard: 10
      }
    });
    
    this.quizConfigs.set('default', {
      id: 'default',
      title: 'Sample Quiz',
      timeLimit: 15,
      passingScore: 60,
      maxAttempts: 2,
      cooldownPeriod: 24,
      difficultyDistribution: {
        easy: 10,
        medium: 10,
        hard: 10
      }
    });
  }

  /**
   * Get questions for display (WITHOUT correct answers)
   */
  async getQuestionsForDisplay(): Promise<any[]> {
    if (!this.questions || this.questions.length === 0) {
      console.warn('⚠️ No questions loaded, using fallback');
      this.loadFallbackQuestions();
    }
    
    return this.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty,
      category: q.category
    }));
  }

  /**
   * Get a single question for display (WITHOUT correct answer)
   */
  async getQuestionForDisplay(id: string): Promise<any | null> {
    const question = this.questions.find(q => q.id === id);
    if (!question) {
      return null;
    }
    return {
      id: question.id,
      text: question.text,
      options: question.options,
      difficulty: question.difficulty,
      category: question.category
    };
  }

  /**
   * Get quiz configuration
   */
  async getQuizConfig(quizId: string): Promise<any | null> {
    return this.quizConfigs.get(quizId) || this.quizConfigs.get('default') || null;
  }

  /**
   * Get questions for a quiz attempt
   */
  async getQuestionsForAttempt(quizId: string, attemptNumber: number): Promise<any[]> {
    const easy = this.questions.filter(q => q.difficulty === 'easy');
    const medium = this.questions.filter(q => q.difficulty === 'medium');
    const hard = this.questions.filter(q => q.difficulty === 'hard');

    if (easy.length < 10 || medium.length < 10 || hard.length < 10) {
      console.warn('⚠️ Not enough questions available, using fallback');
      this.loadFallbackQuestions();
      return this.getQuestionsForAttempt(quizId, attemptNumber);
    }

    let selected: any[] = [];

    if (attemptNumber === 1) {
      selected = [
        ...this.shuffleArray(easy).slice(0, 10),
        ...this.shuffleArray(medium).slice(0, 10),
        ...this.shuffleArray(hard).slice(0, 10)
      ];
    } else {
      const totalEasy = Math.min(easy.length, 15);
      const totalMedium = Math.min(medium.length, 15);
      selected = [
        ...this.shuffleArray(easy).slice(0, totalEasy),
        ...this.shuffleArray(medium).slice(0, totalMedium)
      ];
      while (selected.length < 30) {
        selected.push(this.createDummyQuestion());
      }
    }

    return selected;
  }

  /**
   * Save attempt
   */
  async saveAttempt(userId: string, quizId: string, questions: any[]): Promise<string> {
    const attemptId = `attempt_${Date.now()}`;
    
    const correctAnswers: Record<string, number> = {};
    questions.forEach(q => {
      correctAnswers[q.id] = q.correctAnswer;
    });

    this.attempts.set(attemptId, {
      id: attemptId,
      userId,
      quizId,
      questions,
      correctAnswers,
      answers: {},
      startTime: new Date(),
      endTime: null,
      score: null,
      passed: null,
      createdAt: new Date()
    });

    console.log(`💾 Saved attempt: ${attemptId} for user: ${userId}`);
    return attemptId;
  }

  /**
   * Update attempt with user's answer
   */
  async updateAttempt(attemptId: string, questionId: string, answer: number): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    attempt.answers[questionId] = answer;
    this.attempts.set(attemptId, attempt);
  }

  /**
   * Evaluate attempt
   */
  async evaluateAttempt(attemptId: string): Promise<any> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    let correctCount = 0;
    const questionPerformance: any[] = [];

    for (const question of attempt.questions) {
      const userAnswer = attempt.answers[question.id];
      const correctAnswer = attempt.correctAnswers[question.id];
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;
      
      questionPerformance.push({
        questionId: question.id,
        correct: isCorrect,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        timeSpent: 10
      });
    }

    const totalQuestions = attempt.questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;

    attempt.score = score;
    attempt.passed = passed;
    attempt.endTime = new Date();
    this.attempts.set(attemptId, attempt);

    return {
      attemptId: attempt.id,
      score,
      passed,
      correctCount,
      totalQuestions,
      timeSpent: Math.round((attempt.endTime.getTime() - attempt.startTime.getTime()) / 1000),
      questionPerformance
    };
  }

  /**
   * Get attempt by ID
   */
  async getAttempt(attemptId: string): Promise<any> {
    return this.attempts.get(attemptId);
  }

  /**
   * Fallback questions
   */
  private loadFallbackQuestions() {
    this.questions = Array.from({ length: 30 }, (_, i) => ({
      id: `q_${String(i + 1).padStart(3, '0')}`,
      text: `Sample Question ${i + 1}: What is the correct answer?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      difficulty: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard',
      category: i < 10 ? 'Basic' : i < 20 ? 'Intermediate' : 'Advanced'
    }));
    console.log(`📚 Loaded ${this.questions.length} fallback questions`);
  }

  /**
   * Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Create dummy question
   */
  private createDummyQuestion(): any {
    return {
      id: `dummy_${Date.now()}_${Math.random()}`,
      text: 'What is 1 + 1?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      difficulty: 'easy',
      category: 'Math'
    };
  }
}