import React, { useState, useEffect } from 'react';
import { quizService } from '../../services/quizService.ts';
import './QuizAttempt.css';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface QuizAttemptProps {
  courseId: string;
  quizContent: {
    _id: string;
    title: string;
    quizData: {
      questions?: QuizQuestion[];
      passingScore: number;
    };
  };
  onQuizPassed?: () => void; // Callback for passing the quiz
  onPreviousSubmissionChecked?: (hasPassed: boolean) => void; // Callback for checking previous submission
}

const QuizAttempt: React.FC<QuizAttemptProps> = ({ courseId, quizContent, onQuizPassed, onPreviousSubmissionChecked }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);

  useEffect(() => {
    // Reset state when quizContent._id changes
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setMaxScore(null);
    setError(null);
    setPreviousAttempt(null);

    // Fetch previous attempt for the specific quiz
    const checkPreviousAttempt = async () => {
      try {
        const response = await quizService.getQuizAttempt(quizContent._id);
        if (response.data && response.data.quizId === quizContent._id) {
          const attempt = response.data;
          const hasPassed = attempt.score !== undefined && attempt.maxScore !== undefined &&
            (attempt.score / attempt.maxScore) * 100 >= quizContent.quizData.passingScore;

          setPreviousAttempt(attempt);
          onPreviousSubmissionChecked?.(hasPassed); // Notify parent component
        } else {
          setPreviousAttempt(null);
          onPreviousSubmissionChecked?.(false); // Notify parent component
        }
      } catch (err) {
        console.error('Error fetching previous attempt:', err);
        setPreviousAttempt(null);
        onPreviousSubmissionChecked?.(false); // Notify parent component
      }
    };

    checkPreviousAttempt();
  }, [quizContent._id]);

  const handleOptionChange = (questionIndex: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const handleSubmit = async () => {
    if (!quizContent.quizData.questions) return;

    setLoading(true);
    setError(null);

    try {
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index),
        selectedAnswer: answer,
      }));

      const response = await quizService.submitQuizAttempt(
        courseId,
        quizContent._id,
        formattedAnswers
      );

      setScore(response.data.score);
      setMaxScore(response.data.maxScore);
      setSubmitted(true);

      // Check if the user passed the quiz
      if (
        response.data.score !== null &&
        response.data.maxScore !== null &&
        (response.data.score / response.data.maxScore) * 100 >= quizContent.quizData.passingScore
      ) {
        onQuizPassed?.(); // Call the callback if passed
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleReattempt = async () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setMaxScore(null);
    setError(null);
    setLoading(true);

    try {
      // Clear previous attempt data
      await quizService.clearQuizAttempt(quizContent._id);
      setPreviousAttempt(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset quiz attempt');
    } finally {
      setLoading(false);
    }
  };

  if (!quizContent?.quizData?.questions?.length) {
    return <p>No quiz data available.</p>;
  }

  if (previousAttempt) {
    const hasFailed = previousAttempt.failed ||
      (previousAttempt.score !== undefined && previousAttempt.maxScore !== undefined &&
      (previousAttempt.score / previousAttempt.maxScore) * 100 < quizContent.quizData.passingScore);

    return (
      <div className="quiz-previous-submission">
        <h3 className="quiz-previous-submission-title">Previous Quiz Attempt</h3>
        <p className="quiz-previous-submission-metadata">
          <strong>Score:</strong> {previousAttempt.score} / {previousAttempt.maxScore}
        </p>
        <p className="quiz-previous-submission-metadata">
          <strong>Attempted on:</strong> {new Date(previousAttempt.attemptedAt).toLocaleString()}
        </p>
        <div className="quiz-previous-answers-review">
          {previousAttempt.answers.map((answer: any, idx: number) => {
            const question = quizContent.quizData.questions?.[answer.questionIndex];
            if (!question) {
              return (
                <div key={idx} className="quiz-previous-answer unavailable">
                  <p><strong>Q{answer.questionIndex + 1}:</strong> Question data unavailable.</p>
                  <p>Your answer: {answer.selectedAnswer}</p>
                </div>
              );
            }
            return (
              <div key={idx} className={`quiz-previous-answer ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                <p className="quiz-previous-question-text">
                  <strong>Q{answer.questionIndex + 1}:</strong> {question.question}
                </p>
                <p className="quiz-previous-selected-answer">
                  <strong>Your answer:</strong> {answer.selectedAnswer}
                </p>
                {!answer.isCorrect && (
                  <p className="quiz-previous-correct-answer">
                    <strong>Correct answer:</strong> {question.correctAnswer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {hasFailed && (
          <button
            onClick={handleReattempt}
            className="quiz-previous-reattempt-button mt-3"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reattempt Quiz'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-attempt-preview">
      <h3>{quizContent.title}</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      {quizContent.quizData.questions.map((q, idx) => (
        <div key={idx} className="quiz-attempt-question">
          <p className="quiz-attempt-question-text">
            <strong>Q{idx + 1}:</strong> {q.question}
            <span className="quiz-attempt-points-display">({q.points} points)</span>
          </p>
          <ul className="quiz-attempt-options-list">
            {q.options.map((opt, i) => (
              <li key={i} className="quiz-attempt-option-item">
                <label className="quiz-attempt-option-label">
                  <input
                    type="radio"
                    className="quiz-attempt-radio-button"
                    name={`question-${idx}`}
                    value={opt}
                    checked={answers[idx] === opt}
                    onChange={() => handleOptionChange(idx, opt)}
                    disabled={submitted || loading}
                  />
                  {opt}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={
            loading || Object.keys(answers).length !== quizContent.quizData.questions.length
          } // Disable if not all questions are answered
          className="quiz-attempt-submit-button mt-3"
        >
          {loading ? 'Submitting...' : 'Submit Quiz'}
        </button>
      ) : (
        <div className="quiz-attempt-result-container mt-3">
          <h4>Quiz Results</h4>
          <p>Your Score: {score} / {maxScore}</p>
          <p>Passing Score: {quizContent.quizData.passingScore}%</p>
          {score !== null && maxScore !== null && (
            <p>
              {(score / maxScore * 100) >= quizContent.quizData.passingScore
                ? '🎉 Congratulations! You passed the quiz!'
                : '😔 Unfortunately, you did not pass the quiz. Keep practicing!'}
            </p>
          )}
          {score !== null && maxScore !== null && (score / maxScore * 100) < quizContent.quizData.passingScore && (
            <button
              onClick={handleReattempt}
              className="quiz-attempt-reattempt-button mt-3"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reattempt Quiz'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizAttempt;