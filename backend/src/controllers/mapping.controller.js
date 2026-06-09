/**
 * src/controllers/mapping.controller.js
 * Controller managing Question-to-CO mapping, Weightage distribution tables, and CO-to-PO correlations.
 */

import COMapping from '../models/COMapping.js';
import CourseOutcome from '../models/CourseOutcome.js';
import COPOMapping from '../models/COPOMapping.js';
import QuestionPaper from '../models/QuestionPaper.js';
import Subject from '../models/Subject.js';
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
      return sendError(
        res,
        'Course Outcomes must exist to generate CO-PO matrix.',
        404
      );
    }

    // Generate matrix using LLM
    const subject = await Subject.findById(subjectId);
    const coPoMatrix = await mapCOsToPOs(coRecord, subject);

    // Save or Update matrix in MongoDB
    const savedMatrix = await COPOMapping.findOneAndUpdate(
      { subjectId },
      {
        subjectId,
        matrix: coPoMatrix
      },
      {
        upsert: true,
        new: true
      }
    );

    return sendSuccess(
      res,
      'CO-PO matrix generated and saved successfully.',
      {
        subjectId,
        coPoMatrix: savedMatrix
      }
    );
  } catch (error) {
    console.error(
      '[mappingController] Error generating CO-PO matrix:',
      error
    );
    next(error);
  }
};



export const getCOPOMatrix = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const matrix = await COPOMapping.findOne({
      subjectId
    });

    if (!matrix) {
      return sendError(
        res,
        'CO-PO matrix not found.',
        404
      );
    }

    return sendSuccess(
      res,
      'CO-PO matrix retrieved successfully.',
      matrix
    );
  } catch (error) {
    next(error);
  }
};

export const updateCOToPOMatrix = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { matrix } = req.body;

    if (!matrix || !Array.isArray(matrix)) {
      return sendError(res, 'Matrix array is required.', 400);
    }

    const savedMatrix = await COPOMapping.findOneAndUpdate(
      { subjectId },
      {
        subjectId,
        matrix
      },
      {
        upsert: true,
        new: true
      }
    );

    return sendSuccess(
      res,
      'CO-PO matrix updated successfully.',
      {
        subjectId,
        coPoMatrix: savedMatrix
      }
    );
  } catch (error) {
    console.error('[mappingController] Error updating CO-PO matrix:', error);
    next(error);
  }
};