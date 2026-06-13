# CO-PO Analytica

CO-PO Analytica is an Outcome Based Education (OBE) automation system for syllabus ingestion, Course Outcome generation, exam-paper analysis, question-to-CO mapping, and CO-PO matrix reporting.

The project is split into two apps:

- `backend/` - Node.js, Express, MongoDB, and Ollama/Qwen API for PDF processing, LLM-assisted extraction, CO generation, mappings, and reports.
- `frontend/` - React and Vite workspace for uploading syllabi, managing COs, processing assessment PDFs, editing mappings, and reviewing CO-PO matrices.

## Features

- Upload syllabus PDFs and extract subject metadata, units, and topics.
- Generate CO1-CO6 using a local Ollama model.
- Audit and manually edit Course Outcomes.
- Upload and process assessment PDFs for T1, T4, T5, Summative Lab, and Summative Exam flows.
- Classify questions by Bloom's level and question nature.
- Map questions to COs with editable 0, 2, and 3 correlation values.
- Generate CO weightage reports and CO-PO/PSO correlation matrices.
- Persist courses, COs, questions, mappings, and reports in MongoDB.

## Project Structure

```text
CO-PO/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middlewares/
|   |   |-- models/
|   |   |-- prompts/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- utils/
|   |-- uploads/
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
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

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally
- Ollama installed and running
- Qwen model pulled locally:

```bash
ollama pull qwen3:8b
```

## Quick Start

Start the backend:

```bash
cd backend
npm install
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

The backend runs at:

```text
http://localhost:5000
```

The frontend Vite server proxies `/api` and `/uploads` requests to the backend.

## Backend Environment

Create `backend/.env` if it does not already exist:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/obe
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

## Main Workflow

1. Upload or select a syllabus in the Syllabus Ingestion tab.
2. Generate CO1-CO6 for the selected subject.
3. Review, audit, edit, and save the generated COs.
4. Upload assessment PDFs for module-level exams or subject-level summative flows.
5. Review extracted questions, classifications, marks, and mapped COs.
6. Edit mappings where needed and save updated weightage reports.
7. Generate or edit the CO-PO matrix.

## API Summary

- `GET /health`
- `POST /api/v1/syllabus/upload`
- `GET /api/v1/syllabus`
- `GET /api/v1/syllabus/:id`
- `POST /api/v1/co/generate`
- `POST /api/v1/co/verify`
- `GET /api/v1/co/:subjectId`
- `PUT /api/v1/co/:id`
- `POST /api/v1/question-papers/upload`
- `GET /api/v1/question-papers/:subjectId`
- `PUT /api/v1/question-papers/mappings/:questionPaperId`
- `POST /api/v1/mappings/map`
- `GET /api/v1/mappings/:subjectId`
- `GET /api/v1/mappings/co-po/:subjectId`
- `GET /api/v1/mappings/co-po/retrieve/:subjectId`
- `PUT /api/v1/mappings/co-po/:subjectId`

See [backend/README.md](./backend/README.md) for detailed request fields and examples.

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## License

ISC
