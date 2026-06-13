# CO-PO Analytica Frontend

React and Vite frontend for the CO-PO Analytica Outcome Based Education workspace. The UI supports syllabus ingestion, Course Outcome management, assessment PDF uploads, question-to-CO mapping review/editing, and CO-PO/PSO matrix management.

## Tech Stack

- React 19
- Vite 8
- ESLint
- Plain CSS modules/files in `src/App.css` and `src/index.css`
- Browser `fetch` API for backend communication

## Folder Structure

```text
frontend/
|-- src/
|   |-- assets/
|   |   |-- hero.png
|   |   |-- react.svg
|   |   `-- vite.svg
|   |-- components/
|   |   |-- COManager.jsx
|   |   |-- COPOMatrix.jsx
|   |   |-- QuestionPaperUpload.jsx
|   |   `-- SyllabusUpload.jsx
|   |-- App.jsx
|   |-- App.css
|   |-- index.css
|   `-- main.jsx
|-- package.json
`-- vite.config.js
```

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The Vite config uses port `3000` and proxies requests:

- `/api` -> `http://localhost:5000`
- `/uploads` -> `http://localhost:5000`

Make sure the backend is running before using upload, generation, or mapping features.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## App Workflow

### Syllabus Ingestion

Use `SyllabusUpload.jsx` to:

- Upload syllabus PDFs through `/api/v1/syllabus/upload`.
- Select existing processed courses from `/api/v1/syllabus`.
- View extracted subject metadata, units, and topics.

### Course Outcomes

Use `COManager.jsx` to:

- Generate CO1-CO6 for the selected subject.
- Edit generated outcomes.
- Audit outcomes against Bloom's Taxonomy and syllabus coverage.
- Save direct updates to the backend.

### Assessment Mapping

Use `QuestionPaperUpload.jsx` to:

- Upload module-level or subject-level assessment PDFs.
- Process `T1`, `T4`, `T5`, `SUMMATIVE_LAB`, and `SUMMATIVE_EXAM` flows.
- View extracted questions, marks, cognitive levels, question nature, mapped COs, and justification text.
- Edit mapping matrix values and save the updated report.

### CO-PO Matrix

Use `COPOMatrix.jsx` to:

- Generate CO-PO/PSO correlation matrices.
- Retrieve existing matrices.
- Manually edit and save matrix values.
- Review PO and PSO definitions beside the matrix.

## Backend Contract

The frontend expects the backend at `http://localhost:5000` in development. Important endpoints include:

- `GET /api/v1/syllabus`
- `POST /api/v1/syllabus/upload`
- `POST /api/v1/co/generate`
- `POST /api/v1/co/verify`
- `POST /api/v1/question-papers/upload`
- `GET /api/v1/question-papers/:subjectId`
- `PUT /api/v1/question-papers/mappings/:questionPaperId`
- `GET /api/v1/mappings/co-po/:subjectId`
- `GET /api/v1/mappings/co-po/retrieve/:subjectId`
- `PUT /api/v1/mappings/co-po/:subjectId`

See `../backend/README.md` for the full API reference.

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```
