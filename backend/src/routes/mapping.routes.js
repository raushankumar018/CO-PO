/**
 * src/routes/mapping.routes.js
 * Routing for Question-to-CO mapping and CO-to-PO matrix correlation APIs.
 */

import express from 'express';
import {
  mapQuestionPaperToCOs,
  getCOMapping,
  generateCOToPOMatrix,
  getCOPOMatrix
} from '../controllers/mapping.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/mappings/map
 * @desc    Execute Question-to-CO mapping and compute weightage tables
 * @access  Public
 */
router.post('/map', mapQuestionPaperToCOs);

/**
 * @route   GET /api/v1/mappings/:subjectId
 * @desc    Retrieve saved question mapping and weightage distribution
 * @access  Public
 */
router.get('/:subjectId', getCOMapping);

/**
 * @route   GET /api/v1/mappings/co-po/:subjectId
 * @desc    Map Course Outcomes to standard Program Outcomes and retrieve matrix
 * @access  Public
 */
router.get('/co-po/:subjectId', generateCOToPOMatrix);

/**
 * @route   GET /api/v1/mappings/co-po/:subjectId
 * @desc    Retrieve the CO-PO matrix for a subject.
 * @access  Public
 */
router.get('/co-po/retrieve/:subjectId', getCOPOMatrix);

export default router;
