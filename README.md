# ISKOLARIS: Integrated Scholarship Journey and Management System for DLSU Scholars

> A web-based scholarship management and student success platform designed for **De La Salle University (DLSU)** undergraduate scholars.

---

# 📖 Overview

**ISKOLARIS** is a centralized scholarship management and student success platform developed to simplify the administration and monitoring of scholarship programs within **De La Salle University (DLSU)**. The system addresses the fragmented nature of scholarship information, document submissions, renewal processes, and stipend monitoring by providing a unified digital platform for both scholars and administrators.

The platform supports scholarship programs administered by the **Admissions and Scholarships Office (AdSO)** and the **DOST Core Group under DLSU**, while also providing tools that help scholars monitor academic performance, manage finances, track stipend releases, and prepare for future career opportunities.

To ensure flexibility and accuracy, scholarship documents undergo **manual verification by authorized administrators**, accommodating varying document formats and scholarship-specific requirements.

---

# 🎯 Project Objectives

The application aims to:

* Centralize scholarship information within a single platform
* Streamline scholar registration and verification
* Simplify scholarship renewal and appeal processes
* Improve transparency through application and status tracking
* Help scholars monitor academic performance and retention requirements
* Track stipend disbursement schedules and histories
* Assist scholars in budgeting and financial management
* Generate ATS-friendly resumes using verified academic achievements
* Reduce administrative workload through organized workflows and reporting

---

# 👥 Stakeholders

## Students / Scholars

* Register as scholars
* Submit renewal requirements
* Monitor scholarship status
* Track stipend releases
* Monitor GPA and retention eligibility
* Build professional resumes
* Manage personal budgets

## Admissions and Scholarships Office (AdSO)

* Verify scholar registrations
* Review renewal submissions
* Evaluate appeals
* Manage scholar records
* Publish scholarship announcements

## DOST Core Group under DLSU

* Review scholar compliance
* Process scholarship renewals
* Monitor stipend disbursements
* Maintain scholarship records

## Finance and Accounting Office (FAO)

* Manage tuition credit records
* Update stipend disbursement information
* Generate financial reports

---

# ✨ Features

## 1. Scholar Registration and Verification

* Student account creation
* Scholarship selection during registration
* Award letter upload
* Manual verification by administrators
* Conditional access before approval

---

## 2. Scholarship Renewal Management

* Upload Enrollment Assessment Form (EAF)
* Upload Grade Reports
* Deadline-controlled submissions
* Renewal status tracking
* Administrator review dashboard
* Renewal decision notifications

---

## 3. Scholarship Appeals

* Submission of Letters of Reconsideration
* Upload supporting documents
* Appeal progress tracking
* Administrative review workflow
* Appeal outcome notifications

---

## 4. Stipend Tracking

* Timeline-based stipend monitoring
* Term-based or monthly release tracking
* Payment history records
* Automated release notifications

---

## 5. Academic Performance Analytics

* Term and cumulative GPA tracking via interactive chart
* Scholarship retention threshold monitoring with visual alerts
* At-Risk warning banner when CGPA approaches the retention limit
* Predictive Target Grade Calculator — computes the required GPA across remaining units to reach a chosen goal (Latin Honors tiers, scholarship targets, or custom GPA)
* Dean's List Certificate Vault — upload and archive honors certificates per academic term

---

## 6. Budget Tracker

Track income sources such as:

* Scholarship stipends
* Allowances
* Part-time employment income

Track expenses including:

* Food
* Transportation
* Dormitory and housing
* School supplies
* Miscellaneous expenses

Features include:

* Spending analytics
* Budget summaries
* Financial reports
* Expense visualization charts

---

## 7. Resume Builder

Generate professional ATS-friendly resumes using:

* Verified student information
* Scholarship achievements
* Dean's List awards
* Leadership experiences
* Skills and competencies

Export formats:

* PDF

---

## 8. AI-Powered Scholarship Assistant (RAG Chatbot)

Scholars can ask natural-language questions about scholarship guidelines, renewal policies, and requirements. The assistant is powered by a **Retrieval-Augmented Generation (RAG)** pipeline using Google Gemini — see the [RAG System](#-rag-system) section below for full details.

---

## 9. Notification System

Receive in-app notifications for key events:

* Registration approval / verification
* Renewal submission window opening
* Renewal decisions (verified, probation, resubmission)
* Appeal outcomes
* Stipend disbursements

---

## 10. Administrator Dashboard

Administrators can:

* Verify and approve or reject scholar registrations
* Review and act on renewal submissions
* Evaluate and resolve scholarship appeals
* Update term grades for scholars
* Disburse and track stipend releases
* View dashboard statistics and scholar records

---

## 11. Document Management

Securely store and manage uploaded files:

* Scholarship Award Letters (submitted during registration)
* Enrollment Assessment Forms (EAF) and Grade Reports (submitted for renewal)
* Appeal Letters and supporting documents
* Dean's List Certificates (stored in the Academic Vault)

---

# 🏗️ System Modules

## Scholar Onboarding and Access Management

* Scholar registration
* Manual verification
* Role-based access control
* Conditional platform access

---

## Scholarship Renewal, Evaluation, and Disbursement

* Renewal submission
* Document validation
* Evaluation dashboard
* Status monitoring
* Stipend release tracking

---

## Academic Performance and Appeals

* GPA analytics
* Latin Honors calculator
* Appeals management pipeline
* Academic document repository

---

## Personal Finance and Professional Development

* Budget tracking
* Expense analytics
* Resume generation
* Academic portfolio management

---

# 🔄 Core Business Processes

The system supports complete workflows for:

* Scholar Registration and Verification
* Scholarship Renewal Processing
* Scholarship Appeals Management
* Stipend Disbursement Tracking
* Academic Performance Monitoring
* Budget Management
* Resume Generation

Each workflow includes notifications, administrator actions, document handling, and status tracking to improve transparency and efficiency.

---

# 🛠️ Technology Stack

## Backend

* **Node.js** with **Express.js** — core server and REST API
* **MySQL2** — relational database driver

## Frontend

* Vanilla **HTML**, **CSS**, and **JavaScript** — served as static files from `/public`

## Database

* **MySQL** — relational database for all application data
* Schema defined in `database/schema.sql`

## File Handling

* **Multer** — multipart/form-data file upload middleware

## AI & Machine Learning

* **Google Gemini API** (`@google/genai`) — generative AI for the scholarship assistant chatbot and document embeddings
* **Gemini Embedding Model** (`gemini-embedding-001`) — semantic vector embeddings for RAG

## Document Processing

* **Adobe PDF Services API** (`@adobe/pdfservices-node-sdk`) — structured text and table extraction from PDF submissions
* **pdf-parse** — lightweight PDF text extraction for RAG indexing

## Environment & Configuration

* **dotenv** — loads environment variables from `.env`

---

# 🔑 External APIs

ISKOLARIS integrates two external APIs that require credentials to be configured before the application can run.

## 1. Google Gemini API

Used for:
- **AI Chatbot** — answers scholar questions using the scholarship guidelines knowledge base
- **RAG Embeddings** — converts document chunks and user queries into semantic vectors (`gemini-embedding-001`)

**Setup:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate an API key.
2. Add it to your `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## 2. Adobe PDF Services API

Used for:
- **Document Extraction** — extracts structured text and table data from uploaded PDFs (e.g., grade reports, EAFs) for administrator review

**Setup:**
1. Register at [Adobe PDF Services](https://developer.adobe.com/document-services/apis/pdf-extract/) and create a new project to get credentials.
2. Add them to your `.env` file:
   ```env
   PDF_SERVICES_CLIENT_ID=your_client_id_here
   PDF_SERVICES_CLIENT_SECRET=your_client_secret_here
   ```
   > Alternatively, place your downloaded `pdfservices-api-credentials.json` in the project root — the application will automatically fall back to this file if the environment variables are not set.

---

# 🤖 RAG System

ISKOLARIS includes a **Retrieval-Augmented Generation (RAG)** pipeline that powers the AI Scholarship Assistant. The chatbot can accurately answer questions about scholarship policies by grounding its responses in official guidelines documents rather than relying on the model's general knowledge alone.

## How It Works

```
  Scholar Question
        │
        ▼
  ┌─────────────────────────┐
  │  Query Embedding        │  ← Gemini embedding-001
  │  (semantic vector)      │
  └────────────┬────────────┘
               │ cosine similarity search
               ▼
  ┌─────────────────────────┐
  │  RAG Index              │  ← database/rag-index.json
  │  (pre-computed chunks)  │
  └────────────┬────────────┘
               │ top-K relevant chunks
               ▼
  ┌─────────────────────────┐
  │  Gemini Chat Model      │  ← context + question
  │  (generates answer)     │
  └─────────────────────────┘
```

1. **Indexing (one-time setup):** PDF files from the `/guidelines` folder are parsed, split into overlapping text chunks, and embedded using `gemini-embedding-001`. The resulting vectors are stored in `database/rag-index.json`.
2. **Retrieval:** When a scholar asks a question, it is also embedded. Cosine similarity is computed against every indexed chunk to find the most relevant passages.
3. **Generation:** The top relevant chunks are injected into a Gemini prompt as context, and the model generates a grounded, accurate answer.

## Key Files

| File | Description |
|---|---|
| `rag-service.js` | Core RAG logic: chunking, embedding, cosine similarity, index I/O |
| `build-rag-index.js` | One-time script to build/rebuild the RAG index from PDFs in `/guidelines` |
| `guidelines/` | Place scholarship guideline PDFs here for indexing |
| `database/rag-index.json` | Auto-generated vector index (do **not** edit manually) |

## Rebuilding the Index

Whenever new or updated guideline PDFs are added to `/guidelines`, re-run:

```bash
node build-rag-index.js
```

> ⚠️ This requires a valid `GEMINI_API_KEY` in your `.env` file and at least one PDF in the `/guidelines` folder.

---

# 🚀 Getting Started (For New Developers)

Follow these steps to run ISKOLARIS locally from scratch.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | v18 or higher |
| MySQL | v8.0 or higher |
| Git | any recent version |

## 1. Clone the Repository

```bash
git clone <repository-url>
cd iskolaris
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up the Database

1. Start your MySQL server.
2. Create the database and run the schema:
   ```sql
   CREATE DATABASE iskolaris;
   USE iskolaris;
   SOURCE database/schema.sql;
   ```
   Or using the MySQL CLI:
   ```bash
   mysql -u root -p -e "CREATE DATABASE iskolaris;"
   mysql -u root -p iskolaris < database/schema.sql
   ```

## 4. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example` if available):

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=iskolaris

# Google Gemini API (required for AI assistant and RAG)
GEMINI_API_KEY=your_gemini_api_key_here

# Adobe PDF Services API (required for PDF extraction)
PDF_SERVICES_CLIENT_ID=your_client_id_here
PDF_SERVICES_CLIENT_SECRET=your_client_secret_here

# Server
PORT=3000
SESSION_SECRET=your_session_secret_here
```

> See the [External APIs](#-external-apis) section above for how to obtain API keys.

## 5. Build the RAG Index

Place any scholarship guideline PDFs into the `/guidelines` folder, then run:

```bash
node build-rag-index.js
```

This only needs to be run once (or whenever guideline PDFs are updated). The index is saved to `database/rag-index.json`.

## 6. Start the Server

```bash
npm start
```

The application will be available at **http://localhost:3000** (or the `PORT` specified in your `.env`).

## Summary of Commands

```bash
# 1. Install dependencies
npm install

# 2. Build RAG index (one-time, requires guideline PDFs in /guidelines)
node build-rag-index.js

# 3. Start the server
npm start
```

---

# 📂 Project Structure

```text
iskolaris/
│
├── .env                          # Environment variables (not committed)
├── .gitignore
├── package.json
├── package-lock.json
│
├── server.js                     # Main Express server and all API routes
├── rag-service.js                # RAG pipeline: chunking, embedding, retrieval
├── build-rag-index.js            # One-time script to build the RAG vector index
├── adobe-helper.js               # Adobe PDF Services integration helper
│
├── database/
│   ├── schema.sql                # MySQL database schema
│   ├── db.json                   # (legacy / seed data)
│   └── rag-index.json            # Auto-generated RAG vector index
│
├── guidelines/                   # Place scholarship guideline PDFs here for RAG indexing
│
├── public/                       # Static frontend assets
│   ├── index.html
│   ├── css/
│   ├── images/
│   ├── js/
│   └── views/
│
├── standard_submissions/         # Standard document templates
└── uploads/                      # Uploaded scholar documents
```

---

# 🔐 User Roles

## Scholar

Permissions:

* Register as a scholar
* Submit renewal requirements
* Submit scholarship appeals
* View scholarship status
* Monitor academic performance
* Track stipend releases
* Manage personal finances
* Generate ATS-friendly resumes
* Chat with the AI Scholarship Assistant

---

## Administrator (AdSO)

Permissions:

* Verify scholar registrations
* Review scholarship renewals
* Evaluate scholarship appeals
* Manage scholar records
* Publish announcements

---

## DOST Core Group

Permissions:

* Monitor scholar compliance
* Review renewal submissions
* Manage stipend release updates
* Maintain scholar records

---

## Finance and Accounting Office (FAO)

Permissions:

* Update tuition credit records
* Record stipend disbursements
* Generate financial reports

---

# 🚀 Future Enhancements

Potential future improvements include:

* DLSU Single Sign-On (SSO) Integration
* ArchersHub Integration
* OCR-Assisted Document Verification
* Mobile Application Support
* SMS Notifications
* Scholarship Recommendation Engine
* AI-Based Academic Risk Prediction
* Integration with External Scholarship Providers
* Automated Scholarship Eligibility Checker
* Advanced Analytics Dashboard

---

# ⚙️ Core Calculation and System Logic Updates

To ensure robustness, scheduling flexibility, and clarity for scholars, the following system mechanics are implemented:

### 📅 Dynamic Academic Term Calculation
The system dynamically calculates the academic term and year based on the current date, regardless of the calendar year:
- **Term 1**: September 1 - January 4 (e.g. Sept 1, 2025 starts A.Y. 2025-2026 Term 1)
- **Term 2**: January 5 - May 3
- **Term 3**: May 4 - August 31

### 🎓 Student-Specific Term Indices
To keep evaluations in sync with each student's duration of stay:
- The scholar's current term index (Terms 1 to 12 over a 4-year stay) is dynamically calculated by comparing the current academic year against their student **batch year** (e.g., Batch 124 started in 2024, resolving to Term 6 in A.Y. 2025-2026 Term 3).

### 📋 Scholarship Renewal Mechanics
- **Evaluation Source**: The renewal requirements are prominently flagged stating that scholarship status is evaluated based on the **previous term's grades** (GPA verification) while the EAF specifies the **current/incoming term** (active enrollment verification).
- **Status Locks**: Submission uploads are restricted and locked for non-actionable states (e.g. `Not Scheduled`, `No Records`, `In Probation`, `Renewed`, `Reconsidered`, `Terminated`). Submission is only allowed if the term status is **No Submission** or **Invalid Submission**.

---

# 👨‍💻 Developers

**Business Application Development Project Proposal**

* Kien Patrick Zharvy A. Ong
* Juan Carlos R. Benito
* Samantha Breanne A. Sanchez

Department of Information Technology  |  College of Computer Studies   |  De La Salle University
