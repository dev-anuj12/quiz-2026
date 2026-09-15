const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/questions.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

router.get('/', questionsController.getQuestions);
router.post('/', requireAdmin, questionsController.createQuestion);
router.put('/:id', requireAdmin, questionsController.updateQuestion);
router.delete('/:id', requireAdmin, questionsController.deleteQuestion);

module.exports = router;
