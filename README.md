# CO-PO: Outcome Based Education Automation System

An AI-assisted Outcome Based Education (OBE) platform for syllabus ingestion, Course Outcome generation, exam paper analysis, CO mapping, and CO-PO matrix reporting.

The repository contains:

- `frontend/`: React + Vite interface for uploading syllabi, managing COs, processing question papers, and viewing CO-PO matrices.
- `backend/`: Node.js + Express API that parses PDFs, calls local Ollama/Qwen models, stores data in MongoDB, and generates mapping reports.

---

## Features

### Frontend

- Syllabus upload workspace for creating or selecting a course.
- Course Outcome manager for generating, reviewing, and editing CO1-CO6.
- Question paper upload workflow for processing exam PDFs against a selected subject.
- CO-PO matrix view for reviewing outcome mappings and weightage reports.
- Built with React 19 and Vite.

### Backend

- Syllabus PDF upload and resilient text extraction.
- AI-powered subject metadata extraction, unit/topic parsing, and CO generation.
- Bloom's Taxonomy validation and refinement support.
- Question paper PDF extraction with sub-question aggregation.
- Bloom level and question nature classification.
- Question-to-CO mapping using weighted correlations of `2` and `3`.
- CO-PO matrix generation and printable report output.
- MongoDB persistence through Mongoose models.

---

## System Workflow

1. Upload a syllabus PDF from the frontend.
2. The backend extracts text, cleans it, and asks Ollama/Qwen to identify subject metadata, units, and topics.
3. Generate CO1-CO6 for the selected subject.
4. Review or edit generated COs.
5. Upload an exam question paper for that subject.
6. The backend extracts questions, aggregates sub-questions, classifies Bloom levels, and maps questions to COs.
7. Review CO weightage and CO-PO matrix reports in the frontend.

---

## Project Structure

```text
CO-PO/
|-- backend/
|   |-- src/
|   |   |-- config/          # MongoDB and Ollama configuration
|   |   |-- controllers/     # REST request handlers
|   |   |-- middlewares/     # Upload and error middleware
|   |   |-- models/          # Mongoose schemas
|   |   |-- prompts/         # LLM prompt templates
|   |   |-- routes/          # API route definitions
|   |   |-- services/        # PDF, CO, question, and mapping services
|   |   |-- utils/           # Response and report helpers
|   |   `-- app.js           # Express app setup
|   |-- uploads/             # Uploaded syllabus and question paper PDFs
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |   |-- COManager.jsx
|   |   |   |-- COPOMatrix.jsx
|   |   |   |-- QuestionPaperUpload.jsx
|   |   |   `-- SyllabusUpload.jsx
|   |   |-- App.jsx
|   |   |-- App.css
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- package.json
|   `-- vite.config.js
|-- README.md
|-- backend/README.md
`-- frontend/README.md
```

---

## Prerequisites

| Dependency | Version |
| --- | --- |
| Node.js | v18 or higher |
| MongoDB | v6 or higher, running locally |
| Ollama | Latest |
| Qwen model | `qwen3:8b` |

Install the local LLM model:

```bash
ollama pull qwen3:8b
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create or verify `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/obe
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

Start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

For production mode:

```bash
npm start
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server usually runs at:

```text
http://localhost:5173
```

Other frontend commands:

```bash
npm run build
npm run preview
npm run lint
```

---

## API Endpoints

### Health

- `GET /health` - Check backend status.

### Syllabus Processing

- `POST /api/v1/syllabus/upload` - Upload syllabus PDF.
  - Form-data field: `syllabus`
- `GET /api/v1/syllabus` - Fetch all processed courses.
- `GET /api/v1/syllabus/:id` - Fetch one processed syllabus by database ID.

### Course Outcomes

- `POST /api/v1/co/generate` - Generate CO1-CO6.
  - Body: `{ "subjectId": "SUBJECT_ID" }`
- `GET /api/v1/co/:subjectId` - Fetch COs for a subject.
- `POST /api/v1/co/verify` - Validate and store edited COs.
- `PUT /api/v1/co/:id` - Update COs by record ID.

### Question Papers

- `POST /api/v1/question-papers/upload` - Upload and process a question paper PDF.
  - File field can be any key, such as `questionPaper` or `Question`.
  - `subjectId` can be passed in form-data, query string, or headers as `subject-id` / `subjectid`.
- `GET /api/v1/question-papers/:subjectId` - Fetch processed questions, mappings, and cached reports.

### Outcome Mapping

- `POST /api/v1/mappings/map` - Generate question-to-CO weightage table.
  - Body: `{ "subjectId": "SUBJECT_ID" }`
- `GET /api/v1/mappings/:subjectId` - Fetch CO mappings and weightage percentages.
- `GET /api/v1/mappings/co-po/:subjectId` - Generate CO-PO correlation matrices.

---

## Testing Question Paper Upload

Using curl:

```bash
curl -X POST http://localhost:5000/api/v1/question-papers/upload \
  -H "subject-id: YOUR_SUBJECT_ID" \
  -F "questionPaper=@/path/to/your/exam.pdf"
```

Expected aggregation behavior:

- `1a`, `1b`, and `1c` are stored under parent question `1`.
- Marks are summed across sub-questions.
- Mapped COs are merged into one parent question mapping.
- Reports use natural numeric ordering such as `1, 2, 3, ..., 10, 11`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB, Mongoose |
| LLM Engine | Ollama with `qwen3:8b` |
| PDF Parsing | `pdf-parse`, custom extraction fallback |
| API Format | REST |
| Module System | ES Modules |

---

## Documentation

- [Frontend README](./frontend/README.md) - Frontend-specific Vite notes.
- [Backend README](./backend/README.md) - Backend architecture, API details, and testing notes.

---

## License

ISC
