const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const { attemptQuiz, getMyAttempt, clearQuizAttempt } = require('../controllers/quizController');

router.use(authenticateUser);

router.post('/:courseId/:quizId/attempt', authorizeRoles(['Student']), attemptQuiz);
router.get('/:quizId/my', authorizeRoles(['Student']), getMyAttempt);
router.delete('/:quizId/clear', authorizeRoles(['Student']), clearQuizAttempt);

module.exports = router;
