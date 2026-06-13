import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import CourseOutcome from './src/models/CourseOutcome.js';
import Subject from './src/models/Subject.js';
import { mapCOsToPOs } from './src/services/mapping/poMapper.js';
import { poMappingSystemPrompt, poMappingUserPrompt } from './src/prompts/poMapping.prompt.js';
import ollamaConfig from './src/config/ollama.js';

const run = async () => {
  try {
    await connectDB();
    const coRecord = await CourseOutcome.findOne({});
    if (!coRecord) {
      console.error('No CourseOutcome records found in DB');
      process.exit(1);
    }
    const subjectId = coRecord.subjectId;
    const subject = await Subject.findById(subjectId);

    if (!coRecord || !subject) {
      console.error('Record or Subject not found');
      process.exit(1);
    }

    console.log('Sending prompts to Ollama...');
    const userPrompt = poMappingUserPrompt(coRecord, subject);
    console.log('--- SYSTEM PROMPT ---');
    console.log(poMappingSystemPrompt);
    console.log('--- USER PROMPT ---');
    console.log(userPrompt);

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: poMappingSystemPrompt,
      prompt: userPrompt,
      stream: false,
      options: {
        temperature: 0.4
      }
    });

    console.log('--- OLLAMA RESPONSE ---');
    console.log(response.data.response);

    const result = await mapCOsToPOs(coRecord, subject);
    console.log('--- PARSED MATRIX RESULT ---');
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
};

run();
