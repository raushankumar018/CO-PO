/**
 * src/controllers/co.controller.js
 * Controller managing Course Outcomes (CO1 to CO6) generation, validation, and editing.
 */

import CourseOutcome from '../models/CourseOutcome.js';
import CourseOutcomeHistory from '../models/CourseOutcomeHistory.js';
import Subject from '../models/Subject.js';
import { generateCOs } from '../services/co/coGenerator.js';
import { validateCOs } from '../services/co/coValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Triggers LLM to auto-generate 6 Course Outcomes based on subject units/topics.
 */
export const generateSubjectCOs = async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      return sendError(res, 'Subject ID is required.', 400);
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendError(res, 'Subject not found.', 404);
    }

    // Call service to generate outcomes with subjectCode
    const generatedCOs = await generateCOs(subject.subjectName, subject.unitsAndTopics, subject.subjectCode);

    // Save or update in database
    let coRecord = await CourseOutcome.findOne({ subjectId });

    if (coRecord) {
      Object.assign(coRecord, generatedCOs);
      await coRecord.save();
    } else {
      coRecord = new CourseOutcome({
        subjectId,
        ...generatedCOs
      });
      await coRecord.save();
    }

    // Save to history as unverified generation
    await CourseOutcomeHistory.create({
      subjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      ...generatedCOs,
      unitsAndTopics: subject.unitsAndTopics,
      isVerified: false,
      source: 'generated'
    });

    return sendSuccess(res, 'Course Outcomes generated and saved successfully.', coRecord, 201);
  } catch (error) {
    console.error('[coController] Error generating COs:', error);
    next(error);
  }
};

/**
 * Fetches the Course Outcomes mapped to a specific Subject.
 */
export const getSubjectCOs = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const coRecord = await CourseOutcome.findOne({ subjectId });

    if (!coRecord) {
      return sendError(res, 'Course Outcomes not found for this subject.', 404);
    }

    return sendSuccess(res, 'Course Outcomes retrieved successfully.', coRecord);
  } catch (error) {
    next(error);
  }
};

/**
 * Validates outcomes using Bloom's Taxonomy criteria, reviews audit reports, and saves them.
 */
export const verifyAndSaveCOs = async (req, res, next) => {
  try {
    const { subjectId, CO1, CO2, CO3, CO4, CO5, CO6 } = req.body;

    if (!subjectId) {
      return sendError(res, 'Subject ID is required.', 400);
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendError(res, 'Subject not found.', 404);
    }

    const proposedCOs = { CO1, CO2, CO3, CO4, CO5, CO6 };

    // Run audit verification using Ollama
    const auditReport = await validateCOs(subject.subjectName, subject.unitsAndTopics, proposedCOs, subject.subjectCode);

    // Save proposed values in DB
    let coRecord = await CourseOutcome.findOne({ subjectId });

    if (coRecord) {
      Object.assign(coRecord, proposedCOs);
      await coRecord.save();
    } else {
      coRecord = new CourseOutcome({
        subjectId,
        ...proposedCOs
      });
      await coRecord.save();
    }

    // Save to history as user-verified
    await CourseOutcomeHistory.create({
      subjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      ...proposedCOs,
      unitsAndTopics: subject.unitsAndTopics,
      isVerified: true,
      source: 'user-updated'
    });

    return sendSuccess(res, 'Course Outcomes processed, audited and stored.', {
      coRecord,
      auditReport
    });
  } catch (error) {
    console.error('[coController] Error auditing/saving COs:', error);
    next(error);
  }
};

/**
 * Directly updates a Course Outcome record.
 */
export const updateCOs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { CO1, CO2, CO3, CO4, CO5, CO6 } = req.body;

    const coRecord = await CourseOutcome.findByIdAndUpdate(
      id,
      { CO1, CO2, CO3, CO4, CO5, CO6 },
      { new: true, runValidators: true }
    );

    if (!coRecord) {
      return sendError(res, 'Course Outcomes record not found.', 404);
    }

    // Retrieve subject details to record verified history
    const subject = await Subject.findById(coRecord.subjectId);
    if (subject) {
      await CourseOutcomeHistory.create({
        subjectId: coRecord.subjectId,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        CO1, CO2, CO3, CO4, CO5, CO6,
        unitsAndTopics: subject.unitsAndTopics,
        isVerified: true,
        source: 'user-updated'
      });
    }

    return sendSuccess(res, 'Course Outcomes updated successfully.', coRecord);
  } catch (error) {
    next(error);
  }
};
