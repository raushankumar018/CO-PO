/**
 * src/routes/co.routes.js
 * Routing for Course Outcomes (CO) management APIs.
 */

import express from 'express';
import {
  generateSubjectCOs,
  getSubjectCOs,
  verifyAndSaveCOs,
  updateCOs
} from '../controllers/co.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/co/generate
 * @desc    Generate 6 Course Outcomes (CO1-CO6) using Ollama (Qwen)
 * @access  Public
 */
router.post('/generate', generateSubjectCOs);
router.post('/generat', generateSubjectCOs);

/**
 * @route   GET /api/v1/co/:subjectId
 * @desc    Retrieve Course Outcomes for a specific Subject
 * @access  Public
 */
router.get('/:subjectId', getSubjectCOs);

/**
 * @route   POST /api/v1/co/verify
 * @desc    Audit proposed/edited COs against bloom taxonomy and save them
 * @access  Public
 */
router.post('/verify', verifyAndSaveCOs);

/**
 * @route   PUT /api/v1/co/:id
 * @desc    Directly update Course Outcomes by record ID
 * @access  Public
 */
router.put('/:id', updateCOs);

export default router;
