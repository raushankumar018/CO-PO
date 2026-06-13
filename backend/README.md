# Outcome Based Education (OBE) Automation System Backend

This is a production-ready, high-performance Node.js & Express.js backend for the **Outcome Based Education (OBE) Automation System**. The system automates syllabus parsing, Course Outcomes (CO1-CO6) generation, Bloom's Taxonomy auditing, Exam Paper question extraction, and maps questions to Course Outcomes (COs) and Program Outcomes (POs) utilizing local LLMs via **Ollama (Qwen)**.

---

## Features

### Phase 1: Syllabus Processing
1. **Syllabus PDF Upload**: Processes uploaded course syllabi.
2. **Details Extraction**: Uses Ollama to extract metadata such as Department, Course Name, Course Code, Faculty Name, Semester, and structured Units & Topics.
3. **Course Outcomes (CO) Generation**: Generates 6 distinct Course Outcomes (CO1-CO6) aligned with Bloom's Taxonomy.
4. **Bloom's Taxonomy Validation**: Evaluates proposed outcomes against Bloom's guidelines and suggests improvements.
5. **Editing and Finalization**: Allows manual verification and editing of COs in the database.

### Phase 2: Question Paper Processing
1. **Question Paper PDF Upload**: Uploads final/mid-term exam papers via resilient key handling (supports any field name like `questionPaper` or `Question`).
2. **Sub-question Aggregation Engine**: Groups and merges sub-questions (e.g., `1a`, `1b`, `1c` or `Q1(c)`) under their base parent question (e.g., `1`). The engine consolidates the texts, sums the marks, and maps/saves only a single question per parent number in the database.
3. **Questions Classification**: Evaluates each aggregated question's cognitive level (Bloom's Taxonomy) and nature (Theory, Numerical, Programming, Design, Practical).
4. **Question-to-CO Mapping**: Automatically maps exam questions to Course Outcomes using strictly weightages `2` (Moderate) or `3` (Strong), omitting zeroes from Mongoose storage.
5. **Natural Numeric Sorting**: Automatically sorts all list rendering of questions naturally (e.g., `1, 2, 3, ..., 10, 11` instead of alphabetical sorting where `10` follows `1`).
6. **CO Weightage & Calculations**: Computes coverage matrices where unmapped outcomes are dynamically presented as `0`. Exports premium-styled printable HTML reports.

---

## Folder Structure

```
backend/
 ├── src/
 │    ├── config/
 │    │    ├── db.js                 # Database connection and retry configuration
 │    │    └── ollama.js             # Local Ollama Axios client client configuration
 │    ├── controllers/
 │    │    ├── syllabus.controller.js      # Handles syllabus uploads and details extraction
 │    │    ├── co.controller.js            # Handles Course Outcomes generation & validation
 │    │    ├── questionPaper.controller.js # Handles question paper extraction, aggregation & parsing
 │    │    └── mapping.controller.js       # Handles Question-to-CO & CO-PO matrix mapping
 │    ├── routes/
 │    │    ├── syllabus.routes.js          # Router for /api/v1/syllabus
 │    │    ├── co.routes.js                # Router for /api/v1/co
 │    │    ├── questionPaper.routes.js     # Router for /api/v1/question-papers
 │    │    └── mapping.routes.js           # Router for /api/v1/mappings
 │    ├── models/
 │    │    ├── Subject.js            # Subject MongoDB schema (includes syllabus & unit details)
 │    │    ├── CourseOutcome.js      # CO1-CO6 outcomes database schema
 │    │    ├── QuestionPaper.js      # Processed exam questions database schema
 │    │    └── COMapping.js          # Question-to-CO mappings & weightage table schema
 │    ├── services/
 │    │    ├── syllabus/
 │    │    │    ├── pdfExtractor.js    # Extracts raw text using pdf-parse
 │    │    │    ├── syllabusParser.js  # Clean and normalizes extracted text content
 │    │    │    └── subjectExtractor.js# Parses syllabus text into DB fields using Ollama
 │    │    ├── co/
 │    │    │    ├── coGenerator.js     # Generates CO1-CO6 outcomes using Ollama
 │    │    │    └── coValidator.js     # Validates COs against Bloom's Taxonomy using Ollama
 │    │    ├── questionPaper/
 │    │    │    ├── questionExtractor.js# Extracts questions list and marks using Ollama
 │    │    │    └── marksExtractor.js  # Auxiliary regex marks extraction fallback utility
 │    │    └── mapping/
 │    │         ├── coMapper.js        # Maps questions to Course Outcomes using Ollama
 │    │         ├── poMapper.js        # Maps COs to Program Outcomes matrix using Ollama
 │    │         └── weightageGenerator.js # Calculates marks coverage and percentages
 │    ├── prompts/
 │    │    ├── generateCO.prompt.js  # System/User prompt strings for CO generation
 │    │    ├── verifyCO.prompt.js    # System/User prompt strings for CO validation
 │    │    ├── coMapping.prompt.js   # System/User prompt strings for Question mapping
 │    │    └── poMapping.prompt.js   # System/User prompt strings for CO-PO mapping
 │    ├── middlewares/
 │    │    ├── upload.middleware.js  # Multer engine restricting upload types to PDFs
 │    │    └── error.middleware.js   # Centralized JSON error catcher and 404 handler
 │    ├── utils/
 │    │    ├── responseHandler.js    # Standardizes success/error REST layouts
 │    │    ├── pdfGenerator.js       # Generates print-ready HTML layouts for PDF reports
 │    │    └── excelGenerator.js     # Generates Excel-friendly CSV spreadsheet reports
 │    └── app.js                     # Express app initializations and routing setup
 │── uploads/
 │    ├── syllabus/                  # Storage directory for uploaded syllabi
 │    └── questionPapers/            # Storage directory for uploaded exam papers
 ├── server.js                       # Entry point starting Express and MongoDB connections
 ├── package.json                    # Dependencies setup and start scripts
 └── .env                            # Local configuration environment variables
```

---

## Tech Stack
* **Runtime Environment**: Node.js (v18+)
* **Framework**: Express.js
* **Database**: MongoDB & Mongoose
* **Parser Engine**: `pdf-parse` & custom Regular Expressions
* **LLM Engine**: Local Ollama Instance (`qwen3:8b`)
* **Syntax**: Modern ES Modules

---

## API Endpoints

### 1. Health Checks
* `GET /health` - Checks backend connection and operational status.

### 2. Syllabus Processing
* `POST /api/v1/syllabus/upload` (Form-Data) - Uploads syllabus PDF and parses details.
  * Fields: `syllabus` (File)
* `GET /api/v1/syllabus` - Fetches all processed courses.
* `GET /api/v1/syllabus/:id` - Fetches a specific course syllabus by database ID.

### 3. Course Outcomes (CO) Management
* `POST /api/v1/co/generate` (JSON) - Auto-generates CO1-CO6.
  * Body: `{ "subjectId": "SUBJECT_ID" }`
* `GET /api/v1/co/:subjectId` - Fetches outcomes for a subject.
* `POST /api/v1/co/verify` (JSON) - Validates proposed COs against Bloom's and stores them.
  * Body: `{ "subjectId": "...", "CO1": "...", ... }`
* `PUT /api/v1/co/:id` (JSON) - Directly updates COs using database record ID.

### 4. Question Paper Processing
* `POST /api/v1/question-papers/upload` (Form-Data) - Uploads question paper PDF, aggregates sub-questions, classifies, maps to COs, and generates weightage report.
  * File Field Name: Can be any key (e.g., `questionPaper`, `Question`, etc.)
  * Payload / Headers: Requires `subjectId` (can be passed in Form-Data, Query String, or Headers as `subject-id`/`subjectid`).
* `GET /api/v1/question-papers/:subjectId` - Fetches the processed question paper, naturally sorted questions list, mappings, and cached weightage report.

### 5. Outcome Mapping & Analysis
* `POST /api/v1/mappings/map` (JSON) - Maps questions to COs and generates weightage table.
  * Body: `{ "subjectId": "SUBJECT_ID" }`
* `GET /api/v1/mappings/:subjectId` - Fetches Question-to-CO mappings & weightage percentages.
* `GET /api/v1/mappings/co-po/:subjectId` - Generates CO-PO correlation matrices.

---

## Testing Sub-question Aggregation

To test the sub-question aggregation end-to-end:

### Method 1: Using Postman
1. Open Postman and import the root collection: `OBE_Automation_System.postman_collection.json`.
2. Select the **Upload Question Paper** request (`POST /api/v1/question-papers/upload`).
3. Set the `subjectId` in the request body (form-data), query parameters, or headers.
4. Select a PDF question paper containing sub-questions (e.g., `1a`, `1b`, `1c`) under the file parameter (named `questionPaper`, `Question`, or any other key).
5. Send the request. The response will contain the `questionsCount` representing only the aggregated base questions, along with the weightage report matrix listing base question numbers (e.g., `1`, `2`, `3`) instead of sub-elements, with marks summed and mappings union-merged.

### Method 2: Using Curl
```bash
curl -X POST http://localhost:5000/api/v1/question-papers/upload \
  -H "subject-id: YOUR_SUBJECT_ID" \
  -F "questionPaper=@/path/to/your/exam.pdf"
```

### Expected Aggregation Layout
- If the PDF has questions `1a` (2M) and `1b` (3M):
  - Stored question number: `1`
  - Stored question text: `1a: [text]\n1b: [text]`
  - Stored marks: `5`
  - Mapped COs: Contains the union of mappings for both parts.
- All reports list clean base integers (`1`, `2`, ..., `13`) sorted in natural numeric order.
---


## Setup and Running

### Prerequisites
1. Install [Node.js](https://nodejs.org) (v18 or higher).
2. Install and run [MongoDB](https://www.mongodb.com/try/download/community) locally.
3. Install [Ollama](https://ollama.com) and pull the Qwen model:
   ```cmd
   ollama pull qwen3:8b
   ```

### Installation
1. Install dependencies:
   ```cmd
   npm install
   ```

2. Verify environment variables in the `.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/obe
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=qwen3:8b
   ```

### Start Server
* Start in Development Mode (using Nodemon):
  ```cmd
  npm run dev
  ```
* Start in Production Mode:
  ```cmd
  npm start
  ```

---

## Import to Postman
A pre-configured Postman Collection is provided at the root directory: [OBE_Automation_System.postman_collection.json](./OBE_Automation_System.postman_collection.json).

### How to Import:
1. Open the Postman application.
2. Click on the **Import** button in the top-left corner.
3. Drag and drop the `OBE_Automation_System.postman_collection.json` file.
4. The environment variable `{{base_url}}` is pre-set to `http://localhost:5000`. You can change this in the collection variables if your server is running on a different port.
