/**
 * src/controllers/syllabus.controller.js
 * Controller managing the Upload, Parsing, and Database Storage of Course Syllabi.
 */

import Subject from '../models/Subject.js';
import { extractTextFromPDF } from '../services/syllabus/pdfExtractor.js';
import { cleanSyllabusText } from '../services/syllabus/syllabusParser.js';
import { extractSubjectDetails } from '../services/syllabus/subjectExtractor.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Handles syllabus file upload and processes text extraction and structuring.
 */
export const uploadSyllabus = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Syllabus PDF file is required.', 400);
    }

    // Normalize filepath separators for cross-platform compatibility
    const syllabusPath = req.file.path.replace(/\\/g, '/');

    // 1. Extract text from uploaded PDF
    const rawText = await extractTextFromPDF(syllabusPath);

    // 2. Clean and preprocess the text
    const cleanedText = cleanSyllabusText(rawText);

    // 3. Extract metadata and course syllabus structure via Ollama
    const extractedDetails = await extractSubjectDetails(cleanedText);

    // 4. Save to Database (Create or overwrite existing subject based on subject code)
    const subjectFields = {
      department: extractedDetails.department || 'General',
      subjectName: extractedDetails.subjectName || 'Unknown Subject',
      subjectCode: extractedDetails.subjectCode || 'UNKNOWN',
      facultyName: extractedDetails.facultyName || 'Not Specified',
      semester: extractedDetails.semester || 'N/A',
      syllabusPath,
      extractedContent: cleanedText,
      unitsAndTopics: extractedDetails.unitsAndTopics || []
    };

    let subject = await Subject.findOne({ subjectCode: subjectFields.subjectCode });

    if (subject) {
      // Overwrite/update if it already exists
      subject = await Subject.findByIdAndUpdate(subject._id, subjectFields, { new: true });
    } else {
      // Create new Subject record
      subject = new Subject(subjectFields);
      await subject.save();
    }

    return sendSuccess(res, 'Syllabus uploaded and processed successfully.', subject, 201);
  } catch (error) {
    console.error('[syllabusController] Error in uploadSyllabus:', error);
    next(error);
  }
};

/**
 * Retrieves a list of all processed subjects in the system.
 */
export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Subjects list retrieved successfully.', subjects);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves detailed syllabus information for a single subject by ID.
 */
export const getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);

    if (!subject) {
      return sendError(res, 'Subject not found.', 404);
    }

    return sendSuccess(res, 'Subject details retrieved.', subject);
  } catch (error) {
    next(error);
  }
};
