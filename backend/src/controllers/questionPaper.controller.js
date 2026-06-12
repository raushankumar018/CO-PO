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

// T4 services
import { extractQuestionsFromTextT4 } from '../services/questionPaper/t4QuestionExtractor.js';
import { mapQuestionToCOsT4 } from '../services/questionPaper/t4CoMapper.js';
import { compileT4WeightageMatrix } from '../services/questionPaper/t4WeightageGenerator.js';

// T5 services
import { extractQuestionsFromTextT5 } from '../services/questionPaper/t5QuestionExtractor.js';
import { compileT5WeightageMatrix } from '../services/questionPaper/t5WeightageGenerator.js';

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

    const examType = req.body.examType || req.query.examType || req.headers['exam-type'] || req.headers['examtype'] || 'T1';
    if (!['T1', 'T4', 'T5'].includes(examType)) {
      return sendError(res, 'Invalid exam type. Must be T1, T4, or T5.', 400);
    }

    const moduleParam = req.body.module || req.query.module || req.headers['module'] || 'MODULE_1';
    const normalizeModuleStr = (str) => str.toUpperCase().replace(/[\s\-]+/g, '_').replace(/MODULE(\d)/, 'MODULE_$1');
    const targetModuleNormalized = normalizeModuleStr(moduleParam);

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
      return sendError(res, `Course Outcomes must be generated and verified before uploading a ${examType} Exam PDF.`, 400);
    }

    // Normalize filepath separators
    const paperPath = file.path.replace(/\\/g, '/');

    // 1. Extract raw text from PDF
    const rawText = await extractTextFromPDF(paperPath);

    // 2. Clean the raw text
    const cleanedText = cleanSyllabusText(rawText);

    // 3. Extract structured questions grouped by module & tool type
    let extractedGroups;
    if (examType === 'T4') {
      extractedGroups = await extractQuestionsFromTextT4(cleanedText, coRecord, subject.unitsAndTopics);
    } else if (examType === 'T5') {
      extractedGroups = await extractQuestionsFromTextT5(cleanedText, coRecord, subject.unitsAndTopics);
    } else {
      extractedGroups = await extractQuestionsFromText(cleanedText);
    }

    if (!Array.isArray(extractedGroups)) {
      return sendError(res, `Extraction failed: Extracted groups must be an array.`, 400);
    }

    // Filter extracted groups to strictly keep only the target module questions
    // Normalize LLM output like "MODULE 2", "MODULE-2", "MODULE2" → "MODULE_2"
    console.log(`[questionPaperController] LLM returned ${extractedGroups.length} group(s). Modules found: ${extractedGroups.map(g => g.module).join(', ')}. Target: ${targetModuleNormalized}`);
    extractedGroups = extractedGroups.filter(group => {
      const raw = (group.module || 'MODULE_1');
      const groupModule = raw.toUpperCase().replace(/[\s\-]+/g, '_').replace(/MODULE(\d)/, 'MODULE_$1');
      console.log(`[questionPaperController] Group module: "${raw}" → normalized: "${groupModule}" — match: ${groupModule === targetModuleNormalized}`);
      return groupModule === targetModuleNormalized;
    });
    console.log(`[questionPaperController] After module filter: ${extractedGroups.length} group(s) remain.`);

    // 3.5. Validation Check: Verify parsed question counts strictly match requirements
    if (examType === 'T4') {
      let totalT4Count = 0;
      for (const group of extractedGroups) {
        if (group.questions && Array.isArray(group.questions)) {
          totalT4Count += group.questions.length;
        }
      }
      if (totalT4Count !== 13) {
        return sendError(res, `Extraction rejected: T4 Examination must produce exactly 13 questions for ${targetModuleNormalized}, but got ${totalT4Count}.`, 400);
      }
    } else if (examType === 'T5') {
      const baseQuestionSet = new Set();
      for (const group of extractedGroups) {
        if (group.questions && Array.isArray(group.questions)) {
          for (const qItem of group.questions) {
            const rawQNo = qItem.questionNo || qItem.question_no || qItem.qNo || qItem.no || '';
            const baseNo = getBaseQuestionNumber(rawQNo) || 'Unknown';
            baseQuestionSet.add(baseNo);
          }
        }
      }
      if (baseQuestionSet.size > 4) {
        return sendError(res, `Extraction rejected: T5 Assignment must produce at most 4 parent questions, but got ${baseQuestionSet.size}.`, 400);
      }
    } else {
      // T1 Exam
      const baseQuestionSet = new Set();
      for (const group of extractedGroups) {
        if (group.questions && Array.isArray(group.questions)) {
          for (const qItem of group.questions) {
            const baseNo = getBaseQuestionNumber(qItem.questionNo);
            baseQuestionSet.add(baseNo);
          }
        }
      }
      if (baseQuestionSet.size !== 13) {
        const found = [...baseQuestionSet].sort((a, b) => Number(a) - Number(b)).join(', ');
        return sendError(res, `Extraction rejected: T1 Examination must produce exactly 13 questions for ${targetModuleNormalized}, but got ${baseQuestionSet.size}. Found: [${found || 'none'}]. Ensure the PDF header says MODULE 2 and the paper has exactly 13 questions (Q1–Q13).`, 400);
      }
    }

    // 4. Save or overwrite the QuestionPaper record (isolated by module)
    let questionPaper = await QuestionPaper.findOne({ subjectId, examType, module: targetModuleNormalized });
    if (questionPaper) {
      questionPaper.paperPath = paperPath;
      await questionPaper.save();
    } else {
      questionPaper = new QuestionPaper({
        subjectId,
        examType,
        module: targetModuleNormalized,
        paperPath
      });
      await questionPaper.save();
    }

    // 5. Clear previous questions and mappings for this paper (isolated by module)
    await Question.deleteMany({ questionPaperId: questionPaper._id, examType, module: targetModuleNormalized });
    await QuestionMapping.deleteMany({ questionPaperId: questionPaper._id, examType, module: targetModuleNormalized });

    const savedQuestions = [];
    const savedMappings = [];
    let activeToolType = examType;

    if (examType === 'T4') {
      // 6a. T4 Flow: Loop through groups, map each question independently (no sub-question aggregation)
      for (const group of extractedGroups) {
        let module = group.module || 'MODULE_1';
        module = module.toUpperCase().replace(/[\s\-]+/g, '_').replace(/MODULE(\d)/, 'MODULE_$1');
        const toolType = group.toolType || examType;
        activeToolType = toolType;

        if (group.questions && Array.isArray(group.questions)) {
          for (const qItem of group.questions) {
            const rawQNo = qItem.questionNo || qItem.question_no || qItem.qNo || qItem.no || '';
            const questionNo = rawQNo ? rawQNo.toString().trim() : 'Unknown';
            const questionText = qItem.questionText || qItem.text || qItem.question || 'No question text provided.';

            // Cognitive level and nature are pre-classified in the optimized single-call flow
            const cognitiveLevel = qItem.cognitiveLevel || 'Understand';
            const nature = qItem.nature || 'Theory';

            // Save Question document
            const questionDoc = await Question.create({
              questionPaperId: questionPaper._id,
              subjectId,
              module,
              toolType,
              examType,
              questionNo: questionNo,
              questionText: questionText,
              marks: Number(qItem.marks) || 0,
              cognitiveLevel: cognitiveLevel,
              nature: nature
            });
            savedQuestions.push(questionDoc);

            // Filter mapped COs (enforcing T4 mapping rules: weight 2 or 3 only, max 2 COs)
            let mappedCOs = (qItem.mappedCOs || [])
              .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
              .map((m) => ({
                coCode: m.coCode,
                weightage: Number(m.weightage)
              }));

            if (mappedCOs.length > 2) {
              mappedCOs = mappedCOs.slice(0, 2);
            }
            if (mappedCOs.length === 0) {
              mappedCOs.push({ coCode: 'CO1', weightage: 2 });
            }

            const justification = qItem.justification || 'Aligned with syllabus outcomes.';

            // Save QuestionMapping (isolated by module)
            const mappingDoc = await QuestionMapping.create({
              questionId: questionDoc._id,
              questionPaperId: questionPaper._id,
              questionNo: questionNo,
              examType,
              module: targetModuleNormalized,
              mappedCOs: mappedCOs,
              justification: justification
            });
            savedMappings.push(mappingDoc);
          }
        }
      }
    } else if (examType === 'T5') {
      // 6b. T5 Assignment Flow: Group subparts under base question numbers (1 to 4)
      const processedBaseNos = new Set();
      for (const group of extractedGroups) {
        let module = group.module || 'MODULE_1';
        module = module.toUpperCase().replace(/[\s\-]+/g, '_').replace(/MODULE(\d)/, 'MODULE_$1');
        const toolType = group.toolType || examType;
        activeToolType = toolType;

        if (group.questions && Array.isArray(group.questions)) {
          // Group by base question number (e.g. 1a, 1b, 1-c -> 1)
          const baseGroups = {};
          const baseOrder = [];

          for (const qItem of group.questions) {
            const rawQNo = qItem.questionNo || qItem.question_no || qItem.qNo || qItem.no || '';
            const baseNo = getBaseQuestionNumber(rawQNo) || 'Unknown';
            if (!baseGroups[baseNo]) {
              baseGroups[baseNo] = [];
              baseOrder.push(baseNo);
            }
            baseGroups[baseNo].push(qItem);
          }

          // Process aggregated questions (representing parent Questions 1 to 4)
          for (const baseNo of baseOrder) {
            if (processedBaseNos.has(baseNo)) {
              continue; // Skip duplicate question numbers across groups
            }
            processedBaseNos.add(baseNo);

            const subQs = baseGroups[baseNo];

            // 1. Combine question texts
            let combinedText = '';
            if (subQs.length === 1) {
              combinedText = subQs[0].questionText || subQs[0].text || subQs[0].question || 'No question text provided.';
            } else {
              combinedText = subQs.map(sub => {
                const qNoStr = (sub.questionNo || '').toString().trim();
                const qTextStr = (sub.questionText || sub.text || sub.question || '').trim();
                return qNoStr ? `${qNoStr}: ${qTextStr}` : qTextStr;
              }).join('; ');
            }

            // 2. Set marks to 20 for T5 assignments
            const combinedMarks = 20;

            // 3. Classifications (take first or default)
            const cognitiveLevel = subQs[0].cognitiveLevel || 'Understand';
            const nature = subQs[0].nature || 'Theory';

            // Save Question document
            const questionDoc = await Question.create({
              questionPaperId: questionPaper._id,
              subjectId,
              module,
              toolType,
              examType,
              questionNo: baseNo,
              questionText: combinedText,
              marks: combinedMarks,
              cognitiveLevel,
              nature
            });
            savedQuestions.push(questionDoc);

            // 4. Merge and deduplicate mapped COs
            const coMap = new Map();
            subQs.forEach(sub => {
              const list = sub.mappedCOs || [];
              list.forEach(m => {
                if (['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage))) {
                  const currentWeight = coMap.get(m.coCode) || 0;
                  if (Number(m.weightage) > currentWeight) {
                    coMap.set(m.coCode, Number(m.weightage));
                  }
                }
              });
            });

            const mergedCOs = Array.from(coMap.entries()).map(([coCode, weightage]) => ({
              coCode,
              weightage
            }));

            let finalCOs = mergedCOs;
            if (finalCOs.length > 2) {
              finalCOs = finalCOs.slice(0, 2);
            }
            if (finalCOs.length === 0) {
              finalCOs.push({ coCode: 'CO1', weightage: 2 });
            }

            // 5. Combine justifications
            const combinedJustification = subQs
              .map(sub => sub.justification || '')
              .filter(Boolean)
              .join('; ') || 'Aligned with syllabus outcomes.';

            // Save QuestionMapping (isolated by module)
            const mappingDoc = await QuestionMapping.create({
              questionId: questionDoc._id,
              questionPaperId: questionPaper._id,
              questionNo: baseNo,
              examType,
              module: targetModuleNormalized,
              mappedCOs: finalCOs,
              justification: combinedJustification
            });
            savedMappings.push(mappingDoc);
          }
        }
      }
    } else {
      // 6b. Existing T1 Flow: Loop through groups, classify and map each base question (with sub-question aggregation)
      for (const group of extractedGroups) {
        let module = group.module || 'MODULE_1';
        // Normalize all LLM module variants: "MODULE 2", "MODULE-2", "MODULE2" → "MODULE_2"
        module = module.toUpperCase().replace(/[\s\-]+/g, '_').replace(/MODULE(\d)/, 'MODULE_$1');
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
              examType,
              questionNo: baseNo,
              questionText: combinedText,
              marks: combinedMarks,
              cognitiveLevel: classification.cognitiveLevel,
              nature: classification.nature
            });
            savedQuestions.push(questionDoc);

            // Map aggregated question to COs
            const mappingResult = await mapQuestionToCOs(
              { questionNo: baseNo, questionText: combinedText, marks: combinedMarks, module },
              coRecord,
              subject.unitsAndTopics
            );

            // Save QuestionMapping in the 'question_mappings' collection (isolated by module)
            const mappingDoc = await QuestionMapping.create({
              questionId: questionDoc._id,
              questionPaperId: questionPaper._id,
              questionNo: baseNo,
              examType,
              module: targetModuleNormalized,
              mappedCOs: mappingResult.mappedCOs,
              justification: mappingResult.justification
            });
            savedMappings.push(mappingDoc);
          }
        }
      }
    }

    // Sort questions list naturally (numerically) before generating report & matrix
    savedQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    // 7. Compile and save the Weightage Report matrix (populating zero mappings dynamically)
    let compiled;
    if (examType === 'T4') {
      compiled = compileT4WeightageMatrix(savedQuestions, savedMappings);
    } else if (examType === 'T5') {
      compiled = compileT5WeightageMatrix(savedQuestions, savedMappings);
    } else {
      compiled = compileWeightageMatrix(savedQuestions, savedMappings);
    }

    await WeightageReport.deleteMany({ questionPaperId: questionPaper._id, examType, module: targetModuleNormalized });
    
    const reportDoc = await WeightageReport.create({
      subjectId,
      questionPaperId: questionPaper._id,
      toolType: activeToolType,
      examType,
      module: targetModuleNormalized,
      matrix: compiled.matrix,
      coTotals: compiled.coTotals
    });

    return sendSuccess(res, `${examType} Exam Mapping: Uploaded, classified, and mapped successfully.`, {
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
 * Retrieves the question paper data associated with a Subject, isolated by module.
 */
export const getQuestionPaperBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const examType = req.query.examType || 'T1';
    const moduleParam = req.query.module || req.headers['module'] || 'MODULE_1';
    const targetModule = moduleParam.toUpperCase().replace('-', '_');

    const paper = await QuestionPaper.findOne({ subjectId, examType, module: targetModule });

    if (!paper) {
      return sendError(res, `${examType} Exam Mapping not found for this subject (${targetModule}).`, 404);
    }

    // Retrieve questions, mappings, and report — all filtered by module
    const questions = await Question.find({ questionPaperId: paper._id, examType, module: targetModule });
    // Sort questions list naturally (numerically)
    questions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    const mappings = await QuestionMapping.find({ questionPaperId: paper._id, examType, module: targetModule });
    const report = await WeightageReport.findOne({ questionPaperId: paper._id, examType, module: targetModule });

    return sendSuccess(res, `${examType} Exam Mapping retrieved successfully (${targetModule}).`, {
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
      return sendError(res, 'Exam Mapping not found.', 404);
    }

    const subjectId = paper.subjectId;
    const examType = paper.examType || 'T1';
    const targetModule = paper.module || 'MODULE_1'; // Use the module stored on the paper

    for (const item of mappings) {
      const { questionNo, mappedCOs, justification } = item;

      const qDoc = await Question.findOne({ questionPaperId, questionNo, examType, module: targetModule });
      if (!qDoc) {
        console.warn(`Question ${questionNo} not found for paper ${questionPaperId}, examType ${examType}, module ${targetModule}`);
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
        { questionPaperId, questionNo, examType, module: targetModule },
        {
          questionId: qDoc._id,
          questionPaperId,
          questionNo,
          examType,
          module: targetModule,
          mappedCOs: filteredCOs,
          justification: justification || 'Manually updated mapping.'
        },
        { upsert: true, new: true }
      );
    }

    // Load all questions and updated mappings for this specific module
    const allQuestions = await Question.find({ questionPaperId, examType, module: targetModule });
    allQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    const allMappings = await QuestionMapping.find({ questionPaperId, examType, module: targetModule });

    let compiled;
    if (examType === 'T4') {
      compiled = compileT4WeightageMatrix(allQuestions, allMappings);
    } else if (examType === 'T5') {
      compiled = compileT5WeightageMatrix(allQuestions, allMappings);
    } else {
      compiled = compileWeightageMatrix(allQuestions, allMappings);
    }

    // Save or update weightage report — isolated by module
    const existingReport = await WeightageReport.findOne({ questionPaperId, examType, module: targetModule });
    const toolType = existingReport ? existingReport.toolType : examType;

    const reportDoc = await WeightageReport.findOneAndUpdate(
      { questionPaperId, examType, module: targetModule },
      {
        subjectId,
        questionPaperId,
        toolType,
        examType,
        module: targetModule,
        matrix: compiled.matrix,
        coTotals: compiled.coTotals
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, `${examType} Exam Mapping and weightage matrix updated successfully (${targetModule}).`, {
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
