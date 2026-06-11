import 'dotenv/config';
import connectDB from './src/config/db.js';
import CourseOutcome from './src/models/CourseOutcome.js';
import Subject from './src/models/Subject.js';
import { extractTextFromPDF } from './src/services/syllabus/pdfExtractor.js';
import { cleanSyllabusText } from './src/services/syllabus/syllabusParser.js';
import { extractQuestionsFromTextT4 } from './src/services/questionPaper/t4QuestionExtractor.js';

const run = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Fetching Subject and Course Outcome records...');
    const coRecord = await CourseOutcome.findOne();
    if (!coRecord) {
      console.error('No CourseOutcome record found in database. Please run CO generation first.');
      process.exit(1);
    }
    const subject = await Subject.findById(coRecord.subjectId);
    if (!subject) {
      console.error(`Subject not found for subjectId: ${coRecord.subjectId}`);
      process.exit(1);
    }

    const pdfPath = 'd:/CO-PO/backend/uploads/questionPapers/questionPaper-1781199922105-714966926.pdf';
    console.log('Extracting text from PDF...');
    const rawText = await extractTextFromPDF(pdfPath);
    console.log('Cleaning text...');
    const cleanedText = cleanSyllabusText(rawText);
    console.log('Cleaned text excerpt:\n', cleanedText.slice(0, 1000));
    
    console.log('\nCalling extractQuestionsFromTextT4...');
    const result = await extractQuestionsFromTextT4(cleanedText, coRecord, subject.unitsAndTopics);
    console.log('\nParsed result:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error running test:', err);
    process.exit(1);
  }
};

run();
