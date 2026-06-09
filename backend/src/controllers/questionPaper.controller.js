/**
 * src/controllers/questionPaper.controller.js
 * Controller managing the upload, extraction, classification, mapping, and reporting of Question Papers.
 */

import QuestionPaper from '../models/QuestionPaper.js';
import Subject from '../models/Subject.js';
import CourseOutcome from '../models/CourseOutcome.js';
import Question from '../models/Question.js';
import QuestionMapping from '../models/QuestionMapping.js';
import WeightageReport from '../models/WeightageReport.js';

import { extractTextFromPDF } from '../services/syllabus/pdfExtractor.js';
import { cleanSyllabusText } from '../services/syllabus/syllabusParser.js';
import { extractQuestionsFromText } from '../services/questionPaper/questionExtractor.js';
import { classifyQuestionText } from '../services/questionPaper/questionClassifier.js';
import { mapQuestionToCOs } from '../services/questionPaper/coMapper.js';
import { compileWeightageMatrix } from '../services/questionPaper/weightageGenerator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Helper to extract base question number (e.g. "1" from "1a", "Q1(b)", "1.1").
 */
const getBaseQuestionNumber = (qNo) => {
  if (!qNo) return '';
  const match = qNo.toString().match(/\d+/);
  return match ? match[0] : qNo.toString().trim();
};

/**
 * Handles uploaded exam paper PDF, parses text, classifies questions, maps them to COs, compiles weightage matrices, and stores all documents.
 */
export const uploadQuestionPaper = async (req, res, next) => {
  try {
    const subjectId = req.body.subjectId || req.query.subjectId || req.headers['subject-id'] || req.headers['subjectid'];
    if (!subjectId) {
      return sendError(res, 'Subject ID is required.', 400);
    }

    // Retrieve file dynamically (supports 'questionPaper', 'Question', or any other key name)
    const file = req.files && req.files[0];
    if (!file) {
      return sendError(res, 'Question paper PDF file is required.', 400);
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendError(res, 'Subject not found.', 404);
    }

    const coRecord = await CourseOutcome.findOne({ subjectId });
    if (!coRecord) {
      return sendError(res, 'Course Outcomes must be generated and verified before uploading a question paper.', 400);
    }

    // Normalize filepath separators
    const paperPath = file.path.replace(/\\/g, '/');

    // 1. Extract raw text from PDF
    const rawText = await extractTextFromPDF(paperPath);

    // 2. Clean the raw text
    const cleanedText = cleanSyllabusText(rawText);

    // 3. Extract structured questions grouped by module & tool type
    const extractedGroups = await extractQuestionsFromText(cleanedText);

    // 4. Save or overwrite the QuestionPaper record
    let questionPaper = await QuestionPaper.findOne({ subjectId });
    if (questionPaper) {
      questionPaper.paperPath = paperPath;
      await questionPaper.save();
    } else {
      questionPaper = new QuestionPaper({
        subjectId,
        paperPath
      });
      await questionPaper.save();
    }

    // 5. Clear previous questions and mappings for this paper to avoid stale duplicates
    await Question.deleteMany({ questionPaperId: questionPaper._id });
    await QuestionMapping.deleteMany({ questionPaperId: questionPaper._id });

    const savedQuestions = [];
    const savedMappings = [];
    let activeToolType = 'T1';

    // 6. Loop through groups, classify and map each base question
    for (const group of extractedGroups) {
      let module = group.module || 'MODULE_1';
      module = module.toUpperCase().replace('-', '_'); // Normalize "MODULE-1" to "MODULE_1"
      const toolType = group.toolType || 'T1';
      activeToolType = toolType;

      if (group.questions && Array.isArray(group.questions)) {
        // Group questions by base question number
        const baseGroups = {};
        const baseOrder = [];

        for (const qItem of group.questions) {
          const baseNo = getBaseQuestionNumber(qItem.questionNo);
          if (!baseGroups[baseNo]) {
            baseGroups[baseNo] = [];
            baseOrder.push(baseNo);
          }
          baseGroups[baseNo].push(qItem);
        }

        // Process aggregated base questions
        for (const baseNo of baseOrder) {
          const subQs = baseGroups[baseNo];

          // Combine text
          let combinedText = '';
          if (subQs.length === 1) {
            combinedText = subQs[0].questionText;
          } else {
            combinedText = subQs.map(subQ => {
              const cleanedSubQNo = subQ.questionNo.toString().trim();
              if (cleanedSubQNo === baseNo) {
                return subQ.questionText;
              }
              return `${subQ.questionNo}: ${subQ.questionText}`;
            }).join('\n');
          }

          // Sum marks
          const combinedMarks = subQs.reduce((sum, subQ) => sum + (Number(subQ.marks) || 0), 0);

          // Classify cognitive level and nature of aggregated question
          const classification = await classifyQuestionText(combinedText);

          // Save Question document in the 'questions' collection
          const questionDoc = await Question.create({
            questionPaperId: questionPaper._id,
            subjectId,
            module,
            toolType,
            questionNo: baseNo,
            questionText: combinedText,
            marks: combinedMarks,
            cognitiveLevel: classification.cognitiveLevel,
            nature: classification.nature
          });
          savedQuestions.push(questionDoc);

          // Map aggregated question to COs
          const mappingResult = await mapQuestionToCOs(
            { questionNo: baseNo, questionText: combinedText, marks: combinedMarks },
            coRecord,
            subject.unitsAndTopics
          );

          // Save QuestionMapping in the 'question_mappings' collection (excluding zero values)
          const mappingDoc = await QuestionMapping.create({
            questionId: questionDoc._id,
            questionPaperId: questionPaper._id,
            questionNo: baseNo,
            mappedCOs: mappingResult.mappedCOs,
            justification: mappingResult.justification
          });
          savedMappings.push(mappingDoc);
        }
      }
    }

    // Sort questions list naturally (numerically) before generating report & matrix
    savedQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    // 7. Compile and save the Weightage Report matrix (populating zero mappings dynamically)
    const compiled = compileWeightageMatrix(savedQuestions, savedMappings);
    await WeightageReport.deleteMany({ questionPaperId: questionPaper._id });
    
    const reportDoc = await WeightageReport.create({
      subjectId,
      questionPaperId: questionPaper._id,
      toolType: activeToolType,
      matrix: compiled.matrix,
      coTotals: compiled.coTotals
    });

    return sendSuccess(res, 'Question paper uploaded, classified, and mapped successfully.', {
      questionPaper,
      questionsCount: savedQuestions.length,
      mappingsCount: savedMappings.length,
      report: reportDoc
    }, 201);
  } catch (error) {
    console.error('[questionPaperController] Error uploading question paper:', error);
    next(error);
  }
};

/**
 * Retrieves the question paper data associated with a Subject.
 */
export const getQuestionPaperBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const paper = await QuestionPaper.findOne({ subjectId });

    if (!paper) {
      return sendError(res, 'Question paper not found for this subject.', 404);
    }

    // Retrieve questions, mappings, and report
    const questions = await Question.find({ questionPaperId: paper._id });
    // Sort questions list naturally (numerically)
    questions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    const mappings = await QuestionMapping.find({ questionPaperId: paper._id });
    const report = await WeightageReport.findOne({ questionPaperId: paper._id });

    return sendSuccess(res, 'Question paper retrieved successfully.', {
      paper,
      questions,
      mappings,
      report
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuestionMappings = async (req, res, next) => {
  try {
    const { questionPaperId } = req.params;
    const { mappings } = req.body; // Array of { questionNo, mappedCOs, justification }

    if (!mappings || !Array.isArray(mappings)) {
      return sendError(res, 'Mappings array is required.', 400);
    }

    const paper = await QuestionPaper.findById(questionPaperId);
    if (!paper) {
      return sendError(res, 'Question paper not found.', 404);
    }

    const subjectId = paper.subjectId;

    for (const item of mappings) {
      const { questionNo, mappedCOs, justification } = item;
      
      const qDoc = await Question.findOne({ questionPaperId, questionNo });
      if (!qDoc) {
        console.warn(`Question ${questionNo} not found for paper ${questionPaperId}`);
        continue;
      }

      // Filter out zero weightages and format mapping records
      const filteredCOs = (mappedCOs || [])
        .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
        .map((m) => ({
          coCode: m.coCode,
          weightage: Number(m.weightage)
        }));

      await QuestionMapping.findOneAndUpdate(
        { questionPaperId, questionNo },
        {
          questionId: qDoc._id,
          questionPaperId,
          questionNo,
          mappedCOs: filteredCOs,
          justification: justification || 'Manually updated mapping.'
        },
        { upsert: true, new: true }
      );
    }

    // Load all questions and updated mappings to recompile the report
    const allQuestions = await Question.find({ questionPaperId });
    allQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    const allMappings = await QuestionMapping.find({ questionPaperId });

    const compiled = compileWeightageMatrix(allQuestions, allMappings);

    // Save or update weightage report
    const existingReport = await WeightageReport.findOne({ questionPaperId });
    const toolType = existingReport ? existingReport.toolType : 'T1';

    const reportDoc = await WeightageReport.findOneAndUpdate(
      { questionPaperId },
      {
        subjectId,
        questionPaperId,
        toolType,
        matrix: compiled.matrix,
        coTotals: compiled.coTotals
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, 'Question mappings and weightage matrix updated successfully.', {
      questions: allQuestions.map((q) => {
        const mapping = allMappings.find((m) => m.questionNo.toString().trim() === q.questionNo.toString().trim());
        return {
          ...q.toObject(),
          mappedCOs: mapping ? mapping.mappedCOs : [],
          justification: mapping ? mapping.justification : 'No mapping recorded.',
        };
      }),
      report: reportDoc
    });
  } catch (error) {
    console.error('[questionPaperController] Error updating question mappings:', error);
    next(error);
  }
};
