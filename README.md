# CO-PO: Outcome Based Education (OBE) Automation System

An intelligent, AI-powered system that automates the complete **Outcome Based Education (OBE)** workflow — from syllabus parsing and Course Outcome (CO) generation to exam question analysis, CO-PO mapping, and comprehensive report generation.

---

## Overview

The CO-PO system eliminates the tedious, manual steps involved in OBE compliance by leveraging local Large Language Models (Ollama/Qwen) to:

1. **Parse uploaded syllabi** and extract structured metadata (department, units, topics).
2. **Generate domain-aware Course Outcomes (CO1-CO6)** aligned with Bloom's Taxonomy using intelligent subject detection and domain-specific prompt engineering.
3. **Validate and refine** generated outcomes through automated auditing and self-healing refinement loops.
4. **Process exam question papers** — extracting, aggregating sub-questions, classifying cognitive levels, and mapping questions to COs with weighted correlations.
5. **Compile CO-PO matrices** and export premium-styled, print-ready HTML reports.
6. **Synthesize new question papers** that preserve the original exam pattern, difficulty, and CO distribution.

---

## Input Ingestion & Processing Pipeline

The core strength of this system lies in how it digests complex input formats (such as non-standard PDFs, nested question formats, and unstructured syllabus structures) and translates them into structured database relationships.

### 1. Syllabus PDF Processing Flow

The syllabus processing workflow takes raw syllabus PDFs and parses them into structured database entities:

* **File Upload & Ingestion**:
  * Handled via `POST /api/v1/syllabus/upload` (`multipart/form-data`) using the `syllabus` file field.
  * Files are stored locally in the [uploads/syllabus/](file:///d:/CO-PO/backend/uploads/syllabus) directory.
* **Resilient Text Extraction**:
  * [pdfExtractor.js](file:///d:/CO-PO/backend/src/services/syllabus/pdfExtractor.js) reads the PDF file.
  * It employs a **two-tier parsing strategy**: First, it attempts a standard parse via `pdf-parse`. If that fails due to bad XRef entries or broken structures, it falls back to a **custom page-by-page renderer** to ensure resilience against corrupted files.
* **Text Sanitization**:
  * [syllabusParser.js](file:///d:/CO-PO/backend/src/services/syllabus/syllabusParser.js) normalizes line breaks, removes non-ASCII characters, reduces excessive whitespaces, and removes empty lines to generate a clean text block for LLM processing.
* **AI Metadata & Syllabus Structuring**:
  * [subjectExtractor.js](file:///d:/CO-PO/backend/src/services/syllabus/subjectExtractor.js) passes the cleaned text to the local Ollama instance (configured with the Qwen model) with a JSON-enforced output format.
  * Ollama extracts structured properties: `department`, `subjectName`, `subjectCode`, `facultyName`, `semester`, and a hierarchical array of `unitsAndTopics` (containing `unitNumber`, `unitTitle`, and an array of `topics`).
* **Database Upsert**:
  * The syllabus controller ([syllabus.controller.js](file:///d:/CO-PO/backend/src/controllers/syllabus.controller.js)) checks if a subject with the same `subjectCode` already exists. If it does, it overwrites/updates the existing record; otherwise, it creates a new record in the `subjects` collection.

### 2. Question Paper PDF Processing & Aggregation

Exam papers often contain mixed naming conventions, nested sub-questions, and varying layout schemas. The question paper ingestion pipeline standardizes these inputs:

* **Flexible File Upload**:
  * Handled via `POST /api/v1/question-papers/upload` (`multipart/form-data`).
  * The system is resilient to different input field names (e.g., `questionPaper`, `Question`, or any other key).
  * Requires a `subjectId` (which can be passed in form-data, query parameters, or request headers like `subject-id`/`subjectid`).
* **Raw Question Extraction**:
  * Text is extracted, cleaned, and processed. [questionExtractor.js](file:///d:/CO-PO/backend/src/services/questionPaper/questionExtractor.js) instructs Ollama to identify individual questions, their assessment tool type (e.g., `T1`-`T5`), modules (`MODULE_1` or `MODULE_2`), literal text, and marks.
* **Sub-question Aggregation Engine**:
  * To avoid duplicate database entries, the backend implements a grouping process in [questionPaper.controller.js](file:///d:/CO-PO/backend/src/controllers/questionPaper.controller.js) that maps nested sub-questions (e.g., `1a`, `1b`, `Q1(c)`) under their base parent question number (e.g., `1`).
  * It combines their question texts (e.g., `1a: [text]\n1b: [text]`), sums their individual marks, and merges their mapped Course Outcomes (COs) so they are stored as a single, consolidated parent question.
* **Bloom's Taxonomy Classification**:
  * [questionClassifier.js](file:///d:/CO-PO/backend/src/services/questionPaper/questionClassifier.js) determines the cognitive level (Remember, Understand, Apply, Analyze, Evaluate, Create) and nature (Theory, Numerical, Programming, Design, Practical) for each aggregated question.
* **Question-to-CO Weighted Mapping**:
  * [coMapper.js](file:///d:/CO-PO/backend/src/services/questionPaper/coMapper.js) semantically maps the question content against syllabus topics and generated Course Outcomes (CO1-CO6).
  * In compliance with mapping rules, it assigns strictly weightages `2` (Moderate correlation) or `3` (Strong correlation), omitting zero and weak mappings from the database to maintain storage cleanliness.
* **Report Generation & Natural Sorting**:
  * All lists are naturally sorted (e.g., `1, 2, ..., 10, 11` instead of alphabetical sorting where `10` follows `1`) and stored in MongoDB.
  * A final weightage matrix report is compiled, dynamically mapping unmapped outcomes as `0` for visual representation.

---

## Project Structure

```
CO-PO/
 └── backend/           # Node.js & Express REST API (see backend/README.md for full details)
```

---

## Quick Start

### Prerequisites

| Dependency | Version |
|---|---|
| [Node.js](https://nodejs.org) | v18+ |
| [MongoDB](https://www.mongodb.com/try/download/community) | v6+ (local) |
| [Ollama](https://ollama.com) | Latest |

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd CO-PO/backend

# 2. Install dependencies
npm install

# 3. Pull the Qwen LLM model
ollama pull qwen3:8b

# 4. Configure environment variables (edit .env as needed)
#    PORT=5000
#    MONGO_URI=mongodb://127.0.0.1:27017/obe
#    OLLAMA_BASE_URL=http://127.0.0.1:11434
#    OLLAMA_MODEL=qwen3:8b

# 5. Start the server
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+) |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| LLM Engine | Ollama (Qwen 3 8B) |
| PDF Parsing | pdf-parse + Custom Regex |
| Module System | ES Modules |

---

## Documentation

- [**Backend README**](./backend/README.md) — Full API documentation, folder structure, architecture details, and testing guides.

---

## License

ISC
