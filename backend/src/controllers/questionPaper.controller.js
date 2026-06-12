/**
 * src/controllers/questionPaper.controller.js
 * Controller managing the upload, extraction, classification, mapping, and reporting of Question Papers.
 * Supports exam types: T1, T4, T5, SUMMATIVE_LAB
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

// Summative Lab services
import { extractQuestionsFromLabPaper } from '../services/questionPaper/labQuestionExtractor.js';
import { compileLabWeightageMatrix } from '../services/questionPaper/labWeightageGenerator.js';

// Summative Exam services
import { extractQuestionsFromTextSummativeExam } from '../services/questionPaper/summativeExamExtractor.js';
import { compileSummativeExamWeightageMatrix } from '../services/questionPaper/summativeExamWeightageGenerator.js';

/**
 * Helper to extract base question number (e.g. "1" from "1a", "Q1(b)", "1.1").
 */
const getBaseQuestionNumber = (qNo) => {
  if (!qNo) return '';
  const match = qNo.toString().match(/\d+/);
  return match ? match[0] : qNo.toString().trim();
};

/**
 * Handles uploaded exam paper PDF, parses text, classifies questions, maps them to COs,
 * compiles weightage matrices, and stores all documents.
 * Supports: T1, T4, T5, SUMMATIVE_LAB
 */
export const uploadQuestionPaper = async (req, res, next) => {
  try {
    const subjectId = req.body.subjectId || req.query.subjectId || req.headers['subject-id'] || req.headers['subjectid'];
    if (!subjectId) {
      return sendError(res, 'Subject ID is required.', 400);
    }

    const examType = req.body.examType || req.query.examType || req.headers['exam-type'] || req.headers['examtype'] || 'T1';
    if (!['T1', 'T4', 'T5', 'SUMMATIVE_LAB', 'SUMMATIVE_EXAM'].includes(examType)) {
      return sendError(res, 'Invalid exam type. Must be T1, T4, T5, SUMMATIVE_LAB, or SUMMATIVE_EXAM.', 400);
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

    // ══════════════════════════════════════════════════════════════════════
    // SUMMATIVE_LAB FLOW — independent branch, no interaction with T1/T4/T5
    // ══════════════════════════════════════════════════════════════════════
    if (examType === 'SUMMATIVE_LAB') {
      return await handleLabUpload({
        req, res, next,
        subjectId, subject, coRecord,
        paperPath, cleanedText
      });
    }

    if (examType === 'SUMMATIVE_EXAM') {
      return await handleSummativeExamUpload({
        req, res, next,
        subjectId, subject, coRecord,
        paperPath, cleanedText
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // T1 / T4 / T5 FLOW — unchanged from original implementation
    // ══════════════════════════════════════════════════════════════════════

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
      // 6c. Existing T1 Flow: Loop through groups, classify and map each base question (with sub-question aggregation)
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

// ══════════════════════════════════════════════════════════════════════════════
// SUMMATIVE LAB UPLOAD HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handles Summative Lab paper upload:
 * - Dynamically detects all Sets and parent questions (A+B aggregated by LLM)
 * - Stores one Question + one QuestionMapping per (setNo, questionNo)
 * - Stores one WeightageReport per Set + one combined WeightageReport
 */
const handleLabUpload = async ({ req, res, next, subjectId, subject, coRecord, paperPath, cleanedText }) => {
  try {
    // Step 1: Extract + aggregate + classify + map via single LLM call
    console.log('[questionPaperController] Starting SUMMATIVE_LAB extraction...');
    const labSets = await extractQuestionsFromLabPaper(cleanedText, coRecord, subject.unitsAndTopics);

    if (!Array.isArray(labSets) || labSets.length === 0) {
      return sendError(res, 'Extraction failed: No sets detected in the Summative Lab paper.', 400);
    }

    // Validate: each set must have at least one question
    for (const set of labSets) {
      if (!set.questions || !Array.isArray(set.questions) || set.questions.length === 0) {
        return sendError(res, `Extraction rejected: Set ${set.setNo} has no questions. Ensure the PDF contains valid lab questions.`, 400);
      }
    }

    console.log(`[questionPaperController] SUMMATIVE_LAB: Detected ${labSets.length} set(s).`);
    labSets.forEach(s => console.log(`[questionPaperController]   Set ${s.setNo}: ${s.questions.length} question(s)`));

    // Step 2: Save or overwrite the QuestionPaper record (one per subject per lab upload)
    let questionPaper = await QuestionPaper.findOne({ subjectId, examType: 'SUMMATIVE_LAB' });
    if (questionPaper) {
      questionPaper.paperPath = paperPath;
      await questionPaper.save();
    } else {
      questionPaper = new QuestionPaper({
        subjectId,
        examType: 'SUMMATIVE_LAB',
        module: 'MODULE_1', // Default; not semantically meaningful for lab
        paperPath
      });
      await questionPaper.save();
    }

    // Step 3: Clear all previous lab questions, mappings, and reports for this paper
    await Question.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_LAB' });
    await QuestionMapping.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_LAB' });
    await WeightageReport.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_LAB' });

    const savedQuestions = [];
    const savedMappings = [];

    // Step 4: Save each (setNo, questionNo) as a unique Question + QuestionMapping
    for (const setGroup of labSets) {
      const setNo = (setGroup.setNo || '1').toString().trim();

      for (const qItem of setGroup.questions) {
        const rawQNo = qItem.questionNo || qItem.question_no || qItem.qNo || qItem.no || '';
        const questionNo = rawQNo ? rawQNo.toString().trim() : 'Unknown';
        const questionText = qItem.questionText || qItem.text || qItem.question || 'No question text provided.';
        const cognitiveLevel = qItem.cognitiveLevel || 'Apply';
        const nature = qItem.nature || 'Practical';
        const marks = Number(qItem.marks) || 0;

        // Save Question document (setNo + questionNo together make it unique)
        const questionDoc = await Question.create({
          questionPaperId: questionPaper._id,
          subjectId,
          module: null,          // Not applicable for lab
          toolType: 'SUMMATIVE_LAB',
          examType: 'SUMMATIVE_LAB',
          setNo,
          questionNo,
          questionText,
          marks,
          cognitiveLevel,
          nature
        });
        savedQuestions.push(questionDoc);

        // Filter and enforce CO mapping rules (weightage 2 or 3 only, max 2 COs)
        let mappedCOs = (qItem.mappedCOs || [])
          .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
          .map((m) => ({ coCode: m.coCode, weightage: Number(m.weightage) }));

        if (mappedCOs.length > 2) mappedCOs = mappedCOs.slice(0, 2);
        if (mappedCOs.length === 0) mappedCOs.push({ coCode: 'CO1', weightage: 2 });

        const justification = qItem.justification || 'Aligned with lab syllabus outcomes.';

        // Save QuestionMapping document (scoped by setNo + questionNo)
        const mappingDoc = await QuestionMapping.create({
          questionId: questionDoc._id,
          questionPaperId: questionPaper._id,
          questionNo,
          examType: 'SUMMATIVE_LAB',
          module: null,          // Not applicable for lab
          setNo,
          mappedCOs,
          justification
        });
        savedMappings.push(mappingDoc);
      }
    }

    // Step 5: Compile per-set and combined weightage matrices
    const compiled = compileLabWeightageMatrix(savedQuestions, savedMappings);

    // Save per-set WeightageReport documents
    const savedReports = [];
    for (const setReport of compiled.perSet) {
      const reportDoc = await WeightageReport.create({
        subjectId,
        questionPaperId: questionPaper._id,
        toolType: 'SUMMATIVE_LAB',
        examType: 'SUMMATIVE_LAB',
        module: null,
        setNo: setReport.setNo,
        matrix: setReport.matrix,
        coTotals: setReport.coTotals
      });
      savedReports.push(reportDoc);
    }

    // Save combined WeightageReport document
    const combinedReportDoc = await WeightageReport.create({
      subjectId,
      questionPaperId: questionPaper._id,
      toolType: 'SUMMATIVE_LAB',
      examType: 'SUMMATIVE_LAB',
      module: null,
      setNo: 'COMBINED',
      matrix: compiled.combined.matrix,
      coTotals: compiled.combined.coTotals
    });

    return sendSuccess(res, 'Summative Lab Mapping: Uploaded, aggregated (A+B), classified, and mapped successfully.', {
      questionPaper,
      setsDetected: labSets.length,
      questionsCount: savedQuestions.length,
      mappingsCount: savedMappings.length,
      setReports: savedReports,
      combinedReport: combinedReportDoc
    }, 201);
  } catch (error) {
    console.error('[questionPaperController] Error uploading Summative Lab paper:', error);
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handles Summative Examination paper upload:
 * - Dynamically detects and aggregates all subparts under exactly 6 parent questions (Q1-Q6)
 * - Stores one Question + one QuestionMapping per parent question
 * - Stores one WeightageReport for the paper
 */
const handleSummativeExamUpload = async ({ req, res, next, subjectId, subject, coRecord, paperPath, cleanedText }) => {
  try {
    console.log('[questionPaperController] Starting SUMMATIVE_EXAM extraction...');
    const extractedQuestions = await extractQuestionsFromTextSummativeExam(cleanedText, coRecord, subject.unitsAndTopics);

    if (!Array.isArray(extractedQuestions)) {
      return sendError(res, 'Extraction failed: Extracted questions must be an array.', 400);
    }

    // Enforce validation:
    // Expected parent questions: Q1, Q2, Q3, Q4, Q5, Q6. Expected count: 6.
    // Reject extraction if parent questions are not detected, subparts are stored independently, or more than 6 parent questions are generated.
    const validNos = new Set(['1', '2', '3', '4', '5', '6']);
    const extractedNos = new Set(extractedQuestions.map(q => q.questionNo.toString().trim()));
    const isExactlySixParentQuestions = extractedQuestions.length === 6 &&
      [...validNos].every(no => extractedNos.has(no));

    if (!isExactlySixParentQuestions) {
      return sendError(res, `Extraction rejected: Summative Examination must produce exactly 6 parent questions (Q1–Q6) with combined subparts, but got ${extractedQuestions.length} questions.`, 400);
    }

    // Step 2: Save or overwrite the QuestionPaper record
    let questionPaper = await QuestionPaper.findOne({ subjectId, examType: 'SUMMATIVE_EXAM' });
    if (questionPaper) {
      questionPaper.paperPath = paperPath;
      await questionPaper.save();
    } else {
      questionPaper = new QuestionPaper({
        subjectId,
        examType: 'SUMMATIVE_EXAM',
        module: 'MODULE_1', // Default required value; scoping done via examType
        paperPath
      });
      await questionPaper.save();
    }

    // Step 3: Clear all previous exam questions, mappings, and reports for this paper
    await Question.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_EXAM' });
    await QuestionMapping.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_EXAM' });
    await WeightageReport.deleteMany({ questionPaperId: questionPaper._id, examType: 'SUMMATIVE_EXAM' });

    const savedQuestions = [];
    const savedMappings = [];

    // Step 4: Save each question and mapping
    for (const qItem of extractedQuestions) {
      const questionNo = qItem.questionNo.toString().trim();
      const questionText = qItem.questionText || qItem.text || qItem.question || 'No question text provided.';
      const cognitiveLevel = qItem.cognitiveLevel || 'Understand';
      const nature = qItem.nature || 'Theory';
      const marks = Number(qItem.marks) || 0;

      // Save Question document
      const questionDoc = await Question.create({
        questionPaperId: questionPaper._id,
        subjectId,
        module: null,          // Not applicable for summative exam
        toolType: 'SUMMATIVE_EXAM',
        examType: 'SUMMATIVE_EXAM',
        questionNo,
        questionText,
        marks,
        cognitiveLevel,
        nature
      });
      savedQuestions.push(questionDoc);

      // Filter and enforce CO mapping rules (weightage 2 or 3 only, max 2 COs)
      let mappedCOs = (qItem.mappedCOs || [])
        .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
        .map((m) => ({ coCode: m.coCode, weightage: Number(m.weightage) }));

      if (mappedCOs.length > 2) mappedCOs = mappedCOs.slice(0, 2);
      if (mappedCOs.length === 0) mappedCOs.push({ coCode: 'CO1', weightage: 2 });

      const justification = qItem.justification || 'Aligned with syllabus outcomes.';

      // Save QuestionMapping document
      const mappingDoc = await QuestionMapping.create({
        questionId: questionDoc._id,
        questionPaperId: questionPaper._id,
        questionNo,
        examType: 'SUMMATIVE_EXAM',
        module: null,          // Not applicable for summative exam
        mappedCOs,
        justification
      });
      savedMappings.push(mappingDoc);
    }

    // Sort questions numerically
    savedQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

    // Step 5: Compile weightage matrix report
    const compiled = compileSummativeExamWeightageMatrix(savedQuestions, savedMappings);

    // Save WeightageReport document
    const reportDoc = await WeightageReport.create({
      subjectId,
      questionPaperId: questionPaper._id,
      toolType: 'SUMMATIVE_EXAM',
      examType: 'SUMMATIVE_EXAM',
      module: null,
      matrix: compiled.matrix,
      coTotals: compiled.coTotals
    });

    return sendSuccess(res, 'Summative Examination Mapping: Uploaded, Consolidated (Q1-Q6), and mapped successfully.', {
      questionPaper,
      questionsCount: savedQuestions.length,
      mappingsCount: savedMappings.length,
      report: reportDoc
    }, 201);
  } catch (error) {
    console.error('[questionPaperController] Error uploading Summative Exam paper:', error);
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retrieves the question paper data associated with a Subject, isolated by module.
 * For SUMMATIVE_LAB: returns set-grouped questions and per-set + combined reports.
 */
export const getQuestionPaperBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const examType = req.query.examType || 'T1';

    // ── SUMMATIVE_LAB fetch path ─────────────────────────────────────────────
    if (examType === 'SUMMATIVE_LAB') {
      const paper = await QuestionPaper.findOne({ subjectId, examType: 'SUMMATIVE_LAB' });

      if (!paper) {
        return sendError(res, 'Summative Lab Mapping not found for this subject.', 404);
      }

      // Fetch all lab questions and sort by setNo then questionNo
      const questions = await Question.find({ questionPaperId: paper._id, examType: 'SUMMATIVE_LAB' });
      questions.sort((a, b) => {
        const setComp = (a.setNo || '').localeCompare(b.setNo || '', undefined, { numeric: true });
        if (setComp !== 0) return setComp;
        return a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' });
      });

      const mappings = await QuestionMapping.find({ questionPaperId: paper._id, examType: 'SUMMATIVE_LAB' });

      // Fetch per-set and combined reports
      const allReports = await WeightageReport.find({ questionPaperId: paper._id, examType: 'SUMMATIVE_LAB' });
      const setReports = allReports.filter(r => r.setNo !== 'COMBINED');
      const combinedReport = allReports.find(r => r.setNo === 'COMBINED') || null;

      // Build set-grouped structure for frontend consumption
      const setMap = new Map();
      const setOrder = [];
      questions.forEach(q => {
        const sNo = q.setNo || '1';
        if (!setMap.has(sNo)) {
          setMap.set(sNo, []);
          setOrder.push(sNo);
        }
        const mapping = mappings.find(
          m => m.setNo === sNo && m.questionNo.toString().trim() === q.questionNo.toString().trim()
        );
        setMap.get(sNo).push({
          ...q.toObject(),
          mappedCOs: mapping ? mapping.mappedCOs : [],
          justification: mapping ? mapping.justification : 'No mapping recorded.'
        });
      });

      const sets = setOrder.map(sNo => ({
        setNo: sNo,
        questions: setMap.get(sNo)
      }));

      return sendSuccess(res, 'Summative Lab Mapping retrieved successfully.', {
        paper,
        sets,
        questions,
        mappings,
        setReports,
        combinedReport
      });
    }

    // ── SUMMATIVE_EXAM fetch path ─────────────────────────────────────────────
    if (examType === 'SUMMATIVE_EXAM') {
      const paper = await QuestionPaper.findOne({ subjectId, examType: 'SUMMATIVE_EXAM' });

      if (!paper) {
        return sendError(res, 'Summative Examination Mapping not found for this subject.', 404);
      }

      const questions = await Question.find({ questionPaperId: paper._id, examType: 'SUMMATIVE_EXAM' });
      questions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

      const mappings = await QuestionMapping.find({ questionPaperId: paper._id, examType: 'SUMMATIVE_EXAM' });
      const report = await WeightageReport.findOne({ questionPaperId: paper._id, examType: 'SUMMATIVE_EXAM' });

      // Merge mappings details directly into questions array elements to replicate T1/T4/T5 formats
      const mergedQuestions = questions.map((q) => {
        const mapping = mappings.find(
          (m) => m.questionNo.toString().trim() === q.questionNo.toString().trim()
        );
        return {
          ...q.toObject(),
          mappedCOs: mapping ? mapping.mappedCOs : [],
          justification: mapping ? mapping.justification : 'No mapping recorded.',
        };
      });

      return sendSuccess(res, 'Summative Examination Mapping retrieved successfully.', {
        paper,
        questions: mergedQuestions,
        mappings,
        report
      });
    }

    // ── T1 / T4 / T5 fetch path (unchanged) ─────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════

export const updateQuestionMappings = async (req, res, next) => {
  try {
    const { questionPaperId } = req.params;
    const { mappings } = req.body; // Array of { questionNo, mappedCOs, justification } or { setNo, questionNo, ... } for lab

    if (!mappings || !Array.isArray(mappings)) {
      return sendError(res, 'Mappings array is required.', 400);
    }

    const paper = await QuestionPaper.findById(questionPaperId);
    if (!paper) {
      return sendError(res, 'Exam Mapping not found.', 404);
    }

    const subjectId = paper.subjectId;
    const examType = paper.examType || 'T1';
    const targetModule = paper.module || 'MODULE_1';

    // ── SUMMATIVE_LAB update path ────────────────────────────────────────────
    if (examType === 'SUMMATIVE_LAB') {
      for (const item of mappings) {
        const { setNo, questionNo, mappedCOs, justification } = item;

        // Find the corresponding Question document (scoped by setNo + questionNo)
        const qDoc = await Question.findOne({ questionPaperId, examType: 'SUMMATIVE_LAB', setNo, questionNo });
        if (!qDoc) {
          console.warn(`[updateQuestionMappings] Lab question Set ${setNo} Q${questionNo} not found.`);
          continue;
        }

        const filteredCOs = (mappedCOs || [])
          .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
          .map((m) => ({ coCode: m.coCode, weightage: Number(m.weightage) }));

        await QuestionMapping.findOneAndUpdate(
          { questionPaperId, examType: 'SUMMATIVE_LAB', setNo, questionNo },
          {
            questionId: qDoc._id,
            questionPaperId,
            questionNo,
            examType: 'SUMMATIVE_LAB',
            module: null,
            setNo,
            mappedCOs: filteredCOs,
            justification: justification || 'Manually updated lab mapping.'
          },
          { upsert: true, new: true }
        );
      }

      // Recompile all lab reports after update
      const allQuestions = await Question.find({ questionPaperId, examType: 'SUMMATIVE_LAB' });
      const allMappings = await QuestionMapping.find({ questionPaperId, examType: 'SUMMATIVE_LAB' });

      const compiled = compileLabWeightageMatrix(allQuestions, allMappings);

      // Delete and recreate all lab reports
      await WeightageReport.deleteMany({ questionPaperId, examType: 'SUMMATIVE_LAB' });

      const updatedSetReports = [];
      for (const setReport of compiled.perSet) {
        const doc = await WeightageReport.create({
          subjectId,
          questionPaperId,
          toolType: 'SUMMATIVE_LAB',
          examType: 'SUMMATIVE_LAB',
          module: null,
          setNo: setReport.setNo,
          matrix: setReport.matrix,
          coTotals: setReport.coTotals
        });
        updatedSetReports.push(doc);
      }

      const combinedReportDoc = await WeightageReport.create({
        subjectId,
        questionPaperId,
        toolType: 'SUMMATIVE_LAB',
        examType: 'SUMMATIVE_LAB',
        module: null,
        setNo: 'COMBINED',
        matrix: compiled.combined.matrix,
        coTotals: compiled.combined.coTotals
      });

      // Build response with set-merged questions + updated mappings
      const finalQuestions = allQuestions.map(q => {
        const mapping = allMappings.find(
          m => m.setNo === q.setNo && m.questionNo.toString().trim() === q.questionNo.toString().trim()
        );
        return {
          ...q.toObject(),
          mappedCOs: mapping ? mapping.mappedCOs : [],
          justification: mapping ? mapping.justification : 'No mapping recorded.'
        };
      });

      return sendSuccess(res, 'Summative Lab mappings and weightage matrices updated successfully.', {
        questions: finalQuestions,
        setReports: updatedSetReports,
        combinedReport: combinedReportDoc
      });
    }

    // ── SUMMATIVE_EXAM update path ───────────────────────────────────────────
    if (examType === 'SUMMATIVE_EXAM') {
      for (const item of mappings) {
        const { questionNo, mappedCOs, justification } = item;

        const qDoc = await Question.findOne({ questionPaperId, questionNo, examType: 'SUMMATIVE_EXAM' });
        if (!qDoc) {
          console.warn(`[updateQuestionMappings] Exam question Q${questionNo} not found.`);
          continue;
        }

        const filteredCOs = (mappedCOs || [])
          .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode) && [2, 3].includes(Number(m.weightage)))
          .map((m) => ({ coCode: m.coCode, weightage: Number(m.weightage) }));

        await QuestionMapping.findOneAndUpdate(
          { questionPaperId, examType: 'SUMMATIVE_EXAM', questionNo },
          {
            questionId: qDoc._id,
            questionPaperId,
            questionNo,
            examType: 'SUMMATIVE_EXAM',
            module: null,
            mappedCOs: filteredCOs,
            justification: justification || 'Manually updated exam mapping.'
          },
          { upsert: true, new: true }
        );
      }

      // Recompile report
      const allQuestions = await Question.find({ questionPaperId, examType: 'SUMMATIVE_EXAM' });
      allQuestions.sort((a, b) => a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' }));

      const allMappings = await QuestionMapping.find({ questionPaperId, examType: 'SUMMATIVE_EXAM' });
      const compiled = compileSummativeExamWeightageMatrix(allQuestions, allMappings);

      const reportDoc = await WeightageReport.findOneAndUpdate(
        { questionPaperId, examType: 'SUMMATIVE_EXAM' },
        {
          subjectId,
          questionPaperId,
          toolType: 'SUMMATIVE_EXAM',
          examType: 'SUMMATIVE_EXAM',
          module: null,
          matrix: compiled.matrix,
          coTotals: compiled.coTotals
        },
        { upsert: true, new: true }
      );

      // Merge and return
      const finalQuestions = allQuestions.map(q => {
        const mapping = allMappings.find(
          m => m.questionNo.toString().trim() === q.questionNo.toString().trim()
        );
        return {
          ...q.toObject(),
          mappedCOs: mapping ? mapping.mappedCOs : [],
          justification: mapping ? mapping.justification : 'No mapping recorded.'
        };
      });

      return sendSuccess(res, 'Summative Examination mappings and weightage matrix updated successfully.', {
        questions: finalQuestions,
        report: reportDoc
      });
    }

    // ── T1 / T4 / T5 update path (unchanged) ────────────────────────────────
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
