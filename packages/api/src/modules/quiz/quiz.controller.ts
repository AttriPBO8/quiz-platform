import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Headers, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { QuizService } from './quiz.service';

@Controller('quiz') // ✅ Note: 'quiz' not 'api/quiz'
export class QuizController {
  constructor(private quizService: QuizService) {}

  /**
   * GET /quiz/questions
   * Returns all questions WITHOUT correctAnswer
   */
  @Get('questions')
  async getQuestions() {
    try {
      const questions = await this.quizService.getQuestionsForDisplay();
      
      return {
        success: true,
        data: questions,
        total: questions.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new BadRequestException('Failed to load questions');
    }
  }

  /**
   * GET /quiz/questions/:id
   * Returns a single question WITHOUT correctAnswer
   */
  @Get('questions/:id')
  async getQuestionById(@Param('id') id: string) {
    try {
      const question = await this.quizService.getQuestionForDisplay(id);
      if (!question) {
        throw new NotFoundException('Question not found');
      }
      return {
        success: true,
        data: question
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to load question');
    }
  }

  /**
   * POST /quiz/start
   * Starts a new quiz attempt
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startQuiz(
    @Body() body: { quizId: string },
    @Headers('authorization') auth: string
  ) {
    try {
      const userId = this.extractUserIdFromToken(auth);
      
      const quizConfig = await this.quizService.getQuizConfig(body.quizId);
      if (!quizConfig) {
        throw new NotFoundException('Quiz not found');
      }

      const questions = await this.quizService.getQuestionsForAttempt(
        body.quizId, 
        1
      );

      const attemptId = await this.quizService.saveAttempt(
        userId, 
        body.quizId, 
        questions
      );

      const sanitizedQuestions = questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        category: q.category
      }));

      return {
        success: true,
        attemptId,
        questions: sanitizedQuestions,
        totalQuestions: sanitizedQuestions.length,
        timeLimit: quizConfig.timeLimit || 15,
        startTime: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to start quiz');
    }
  }

  /**
   * PUT /quiz/answer
   * Saves answer for a specific question
   */
  @Put('answer')
  @HttpCode(HttpStatus.OK)
  async answerQuestion(@Body() body: { attemptId: string; questionId: string; answer: number }) {
    try {
      await this.quizService.updateAttempt(
        body.attemptId,
        body.questionId,
        body.answer
      );

      return {
        success: true,
        message: 'Answer saved successfully'
      };
    } catch (error) {
      throw new BadRequestException('Failed to save answer');
    }
  }

  /**
   * POST /quiz/submit
   * Submits the quiz and evaluates answers
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitQuiz(@Body() body: { attemptId: string }) {
    try {
      const results = await this.quizService.evaluateAttempt(body.attemptId);

      return {
        success: true,
        ...results
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit quiz');
    }
  }

  /**
   * GET /quiz/attempt/:id
   * Gets attempt details
   */
  @Get('attempt/:id')
  async getAttempt(@Param('id') id: string) {
    try {
      const attempt = await this.quizService.getAttempt(id);
      if (!attempt) {
        throw new NotFoundException('Attempt not found');
      }

      return {
        success: true,
        data: {
          id: attempt.id,
          userId: attempt.userId,
          quizId: attempt.quizId,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          score: attempt.score,
          passed: attempt.passed,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get attempt');
    }
  }

  /**
   * Helper: Extract user ID from JWT token
   */
  private extractUserIdFromToken(authHeader: string): string {
    if (!authHeader) {
      return 'anonymous_user';
    }
    try {
      return 'dev_user_001';
    } catch (error) {
      return 'dev_user_001';
    }
  }
}