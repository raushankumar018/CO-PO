/**
 * src/routes/questionPaper.routes.js
 * Routing for Question Paper management APIs.
 */

import express from 'express';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadQuestionPaper, getQuestionPaperBySubject, updateQuestionMappings } from '../controllers/questionPaper.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/question-papers/upload
 * @desc    Upload question paper PDF and extract questions/marks
 * @access  Public
 */
router.post('/upload', upload.any(), uploadQuestionPaper);

/**
 * @route   GET /api/v1/question-papers/:subjectId
 * @desc    Get processed question paper for a subject
 * @access  Public
 */
router.get('/:subjectId', getQuestionPaperBySubject);

/**
 * @route   PUT /api/v1/question-papers/mappings/:questionPaperId
 * @desc    Update question-to-CO mappings manually
 * @access  Public
 */
router.put('/mappings/:questionPaperId', updateQuestionMappings);

export default router;
