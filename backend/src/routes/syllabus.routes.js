/**
 * src/routes/syllabus.routes.js
 * Routing for Syllabus management APIs.
 */

import express from 'express';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadSyllabus, getSubjects, getSubjectById } from '../controllers/syllabus.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/syllabus/upload
 * @desc    Upload course syllabus PDF and extract structured details
 * @access  Public
 */
router.post('/upload', upload.single('syllabus'), uploadSyllabus);

/**
 * @route   GET /api/v1/syllabus
 * @desc    Get all processed subjects/courses
 * @access  Public
 */
router.get('/', getSubjects);

/**
 * @route   GET /api/v1/syllabus/:id
 * @desc    Get detailed subject information by ID
 * @access  Public
 */
router.get('/:id', getSubjectById);

export default router;
