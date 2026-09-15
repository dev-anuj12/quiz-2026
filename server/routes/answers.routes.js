const express = require('express');
const router = express.Router();
const answersController = require('../controllers/answers.controller');

router.post('/', answersController.submitAnswer);
router.get('/stats/:questionId', answersController.getStats);

module.exports = router;
