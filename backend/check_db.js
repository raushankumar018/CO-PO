import 'dotenv/config';
import connectDB from './src/config/db.js';
import QuestionPaper from './src/models/QuestionPaper.js';
import Question from './src/models/Question.js';

const check = async () => {
  await connectDB();
  
  const papers = await QuestionPaper.find({});
  console.log("=== DB QUESTION PAPERS ===");
  for (const paper of papers) {
    console.log(`ID: ${paper._id}, SubjectId: ${paper.subjectId}, ExamType: ${paper.examType}, Path: ${paper.paperPath}`);
  }

  const questions = await Question.find({ examType: 'T5' });
  console.log("\n=== DB T5 QUESTIONS ===");
  questions.forEach(q => {
    console.log(`ID: ${q._id}, No: ${q.questionNo}, Module: ${q.module}, Marks: ${q.marks}, Text: ${q.questionText.substring(0, 80)}...`);
  });
  process.exit(0);
};

check();
