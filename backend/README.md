# CO-PO Analytica Backend

Node.js and Express backend for the CO-PO Analytica Outcome Based Education automation system. It handles syllabus parsing, Course Outcome generation and validation, assessment PDF extraction, question-to-CO mapping, CO weightage reports, and CO-PO/PSO matrix generation.

## Tech Stack

- Node.js with ES Modules
- Express.js
- MongoDB and Mongoose
- Multer for PDF uploads
- `pdf-parse` plus fallback parsing utilities
- Ollama with `qwen3:8b`
- Axios, CORS, Morgan, Dotenv

## Folder Structure

```text
backend/
|-- src/
|   |-- app.js
|   |-- config/
|   |   |-- db.js
|   |   `-- ollama.js
|   |-- controllers/
|   |   |-- co.controller.js
|   |   |-- mapping.controller.js
|   |   |-- questionPaper.controller.js
|   |   `-- syllabus.controller.js
|   |-- middlewares/
|   |   |-- error.middleware.js
|   |   `-- upload.middleware.js
|   |-- models/
|   |-- prompts/
|   |-- routes/
|   |   |-- co.routes.js
|   |   |-- mapping.routes.js
|   |   |-- questionPaper.routes.js
|   |   `-- syllabus.routes.js
|   |-- services/
|   |   |-- co/
|   |   |-- intelligence/
|   |   |-- mapping/
|   |   |-- prompts/
|   |   |-- questionPaper/
|   |   |-- reference/
|   |   |-- reports/
|   |   `-- syllabus/
|   `-- utils/
|-- uploads/
|-- package.json
`-- server.js
```

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally
- Ollama installed and running
- Qwen model:

```bash
ollama pull qwen3:8b
```

## Setup

Install dependencies:

```bash
npm install
```

Create or verify `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/obe
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

Start in development mode:

```bash
npm run dev
```

Start in production mode:

```bash
npm start
```

The API listens on:

```text
http://localhost:5000
```

## API Endpoints

### Health

- `GET /health` - Check backend status.

### Syllabus

- `POST /api/v1/syllabus/upload` - Upload and process a syllabus PDF.
  - Form-data file field: `syllabus`
- `GET /api/v1/syllabus` - List processed subjects.
- `GET /api/v1/syllabus/:id` - Fetch one subject by database ID.

### Course Outcomes

- `POST /api/v1/co/generate` - Generate CO1-CO6 for a subject.
  - Body: `{ "subjectId": "SUBJECT_ID" }`
- `POST /api/v1/co/generat` - Compatibility alias for generate.
- `GET /api/v1/co/:subjectId` - Fetch saved COs for a subject.
- `POST /api/v1/co/verify` - Audit and save proposed COs.
  - Body: `{ "subjectId": "...", "CO1": "...", "CO2": "...", "CO3": "...", "CO4": "...", "CO5": "...", "CO6": "..." }`
- `PUT /api/v1/co/:id` - Update a CO record by ID.

### Question Papers

- `POST /api/v1/question-papers/upload` - Upload and process an assessment PDF.
  - File field: any field name is accepted, for example `questionPaper` or `Question`.
  - `subjectId`: form-data, query string, or headers `subject-id` / `subjectid`.
  - `examType`: form-data, query string, or headers `exam-type` / `examtype`.
  - Supported `examType` values: `T1`, `T4`, `T5`, `SUMMATIVE_LAB`, `SUMMATIVE_EXAM`.
  - `module`: form-data, query string, or header `module`; defaults to `MODULE_1`.
- `GET /api/v1/question-papers/:subjectId` - Fetch a processed paper and report data.
  - Query: `examType=T1|T4|T5|SUMMATIVE_LAB|SUMMATIVE_EXAM`
  - Query/header for module-level flows: `module=MODULE_1`
- `PUT /api/v1/question-papers/mappings/:questionPaperId` - Manually update question-to-CO mappings and regenerate weightage data.

### Mapping

- `POST /api/v1/mappings/map` - Generate question-to-CO mapping and weightage data.
  - Body: `{ "subjectId": "SUBJECT_ID" }`
- `GET /api/v1/mappings/:subjectId` - Fetch saved CO mapping and weightage distribution.
- `GET /api/v1/mappings/co-po/:subjectId` - Generate a CO-PO/PSO correlation matrix.
- `GET /api/v1/mappings/co-po/retrieve/:subjectId` - Retrieve an existing CO-PO/PSO matrix.
- `PUT /api/v1/mappings/co-po/:subjectId` - Save manual CO-PO/PSO matrix edits.

## Assessment Processing Notes

- `T1` groups sub-questions under parent question numbers and sums marks.
- `T4` processes each extracted question independently, including MCQ-style items.
- `T5` combines assignment subparts under parent questions and aggregates marks.
- `SUMMATIVE_LAB` detects sets, groups A/B subparts, maps each set independently, and creates combined reports.
- `SUMMATIVE_EXAM` consolidates subparts under parent questions for the full subject-level exam.
- CO weights use `0`, `2`, and `3`, where `2` is moderate and `3` is strong.

## Curl Examples

Upload a syllabus:

```bash
curl -X POST http://localhost:5000/api/v1/syllabus/upload \
  -F "syllabus=@/path/to/syllabus.pdf"
```

Generate Course Outcomes:

```bash
curl -X POST http://localhost:5000/api/v1/co/generate \
  -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"SUBJECT_ID\"}"
```

Upload a T1 question paper:

```bash
curl -X POST http://localhost:5000/api/v1/question-papers/upload \
  -H "subject-id: SUBJECT_ID" \
  -H "exam-type: T1" \
  -H "module: MODULE_1" \
  -F "questionPaper=@/path/to/t1.pdf"
```

Fetch a processed paper:

```bash
curl "http://localhost:5000/api/v1/question-papers/SUBJECT_ID?examType=T1&module=MODULE_1"
```

## Development Notes

- `server.js` loads environment variables, connects to MongoDB, and starts Express.
- `src/app.js` configures CORS, request logging, JSON parsing, static uploads, routes, and error handling.
- Uploaded files are served from `/uploads`.
- The frontend dev server proxies `/api` and `/uploads` to this backend.
