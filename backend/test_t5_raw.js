import 'dotenv/config';
import connectDB from './src/config/db.js';
import Subject from './src/models/Subject.js';
import CourseOutcome from './src/models/CourseOutcome.js';
import QuestionPaper from './src/models/QuestionPaper.js';
import { extractTextFromPDF } from './src/services/syllabus/pdfExtractor.js';
import { cleanSyllabusText } from './src/services/syllabus/syllabusParser.js';
import { extractQuestionsFromTextT5 } from './src/services/questionPaper/t5QuestionExtractor.js';

const test = async () => {
  await connectDB();
  
  // Find the T5 paper
  const paper = await QuestionPaper.findOne({ examType: 'T5' });
  if (!paper) {
    console.error("No T5 paper found in DB.");
    process.exit(1);
  }

  const subject = await Subject.findById(paper.subjectId);
  const coRecord = await CourseOutcome.findOne({ subjectId: paper.subjectId });

  console.log(`Subject: ${subject.subjectCode} - ${subject.subjectName}`);
  console.log("Units and topics:", JSON.stringify(subject.unitsAndTopics, null, 2));

  // Extract raw text from PDF
  const rawText = await extractTextFromPDF(paper.paperPath);
  const cleanedText = cleanSyllabusText(rawText);
  console.log("\n=== CLEANED T5 PAPER TEXT ===");
  console.log(cleanedText);
  console.log("==============================\n");

  try {
    const groups = await extractQuestionsFromTextT5(cleanedText, coRecord, subject.unitsAndTopics);
    console.log("\n=== FINAL EXTRACTED GROUPS ===");
    console.log(JSON.stringify(groups, null, 2));
  } catch (err) {
    console.error("Extraction failed:", err);
  }

  process.exit(0);
};

test();
