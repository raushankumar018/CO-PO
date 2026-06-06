/**
 * src/controllers/mapping.controller.js
 * Controller managing Question-to-CO mapping, Weightage distribution tables, and CO-to-PO correlations.
 */

import COMapping from '../models/COMapping.js';
import CourseOutcome from '../models/CourseOutcome.js';
import QuestionPaper from '../models/QuestionPaper.js';
import { mapQuestionsToCOs } from '../services/mapping/coMapper.js';
import { mapCOsToPOs } from '../services/mapping/poMapper.js';
import { generateWeightageTable } from '../services/mapping/weightageGenerator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Automatically maps exam questions to Course Outcomes, generates weightages, and stores results.
 */
export const mapQuestionPaperToCOs = async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      return sendError(res, 'Subject ID is required.', 400);
    }

    // 1. Retrieve the course outcomes (COs)
    const coRecord = await CourseOutcome.findOne({ subjectId });
    if (!coRecord) {
      return sendError(res, 'Course Outcomes must be generated/saved before mapping.', 400);
    }

    // 2. Retrieve the uploaded question paper
    const paper = await QuestionPaper.findOne({ subjectId });
    if (!paper) {
      return sendError(res, 'Question paper must be uploaded and parsed before mapping.', 400);
    }

    // 3. Request LLM mapping of questions to COs
    const rawMappings = await mapQuestionsToCOs(coRecord, paper.extractedQuestions);

    // 4. Compute weightage stats
    const weightageData = generateWeightageTable(rawMappings);

    // 5. Store mapping details in the database
    let mappingRecord = await COMapping.findOne({ subjectId });

    if (mappingRecord) {
      mappingRecord.questionPaperId = paper._id;
      mappingRecord.mappings = rawMappings;
      mappingRecord.weightage = weightageData.weightage;
      await mappingRecord.save();
    } else {
      mappingRecord = new COMapping({
        subjectId,
        questionPaperId: paper._id,
        mappings: rawMappings,
        weightage: weightageData.weightage
      });
      await mappingRecord.save();
    }

    return sendSuccess(res, 'Question paper mapping to COs completed.', {
      mappingRecord,
      weightage: weightageData.weightage,
      percentages: weightageData.percentages,
      totalPaperMarks: weightageData.totalPaperMarks
    }, 201);
  } catch (error) {
    console.error('[mappingController] Error in mapQuestionPaperToCOs:', error);
    next(error);
  }
};

/**
 * Retrieves the question mappings and weightage table details.
 */
export const getCOMapping = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const mappingRecord = await COMapping.findOne({ subjectId })
      .populate('subjectId')
      .populate('questionPaperId');

    if (!mappingRecord) {
      return sendError(res, 'Question-to-CO mappings not found for this subject.', 404);
    }

    // Generate weightage and percentage coverage tables
    const weightageData = generateWeightageTable(mappingRecord.mappings);

    return sendSuccess(res, 'Mappings and weightage details retrieved.', {
      mappingRecord,
      weightage: weightageData.weightage,
      percentages: weightageData.percentages,
      totalPaperMarks: weightageData.totalPaperMarks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interacts with Ollama to map Course Outcomes to standard Program Outcomes (POs) and retrieve matrix.
 */
export const generateCOToPOMatrix = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const coRecord = await CourseOutcome.findOne({ subjectId });

    if (!coRecord) {
      return sendError(res, 'Course Outcomes must exist to generate CO-PO matrix.', 404);
    }

    // Call service to map COs to POs
    const coPoMatrix = await mapCOsToPOs(coRecord);

    return sendSuccess(res, 'CO-PO matrix generated successfully.', {
      subjectId,
      coPoMatrix
    });
  } catch (error) {
    console.error('[mappingController] Error generating CO-PO matrix:', error);
    next(error);
  }
};
