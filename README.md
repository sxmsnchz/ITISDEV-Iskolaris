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

* Term GPA tracking
* Cumulative GPA tracking
* Scholarship retention monitoring
* Latin Honors calculator
* At-Risk Warning System
* Dean's List Certificate Repository

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

## 8. Notification System

Receive notifications regarding:

* Registration approval
* Renewal schedules
* Renewal decisions
* Appeal outcomes
* Stipend releases
* Scholarship announcements

---

## 9. Administrator Dashboard

Administrators can:

* Verify scholar registrations
* Review renewal applications
* Evaluate appeals
* Update stipend release statuses
* Manage scholar records
* Generate reports
* Publish announcements

---

## 10. Document Management

Securely store and manage:

* Scholarship Award Letters
* Enrollment Assessment Forms (EAF)
* Grade Reports
* Appeal Letters
* Medical Certificates
* Dean's List Certificates
* Supporting Documentation

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

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* Next.js API Routes
* Serverless Functions

## Database

* PostgreSQL

## ORM

* Prisma ORM

## Authentication

* Auth.js (NextAuth)
* JWT-Based Session Management
* Role-Based Access Control (RBAC)

## File Storage

* Supabase Storage

## Data Visualization

* Recharts

## PDF Generation

* React-PDF

## Notifications

* Resend Email API

## Deployment

* Vercel

---

# ☁️ Deployment Architecture

```text
┌───────────────────────┐
│       Scholars        │
│    Administrators     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│        Vercel         │
│       Next.js         │
│  Frontend + API Layer │
└───────┬───────┬───────┘
        │       │
        │       │
        ▼       ▼
┌───────────┐ ┌───────────────┐
│ PostgreSQL│ │ Supabase      │
│ Database  │ │ Storage       │
└───────────┘ └───────────────┘
        │
        ▼
┌───────────────────────┐
│      Prisma ORM       │
└───────────────────────┘
```

---

# 📂 Project Structure

```text
iskolaris/
│
├── src/
│   ├── app/
│   │   ├── scholar/
│   │   ├── admin/
│   │   ├── auth/
│   │   └── api/
│   │
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── lib/
│   └── utils/
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── docs/
│
├── .env
│
└── README.md
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

---

## Administrator (AdSO)

Permissions:

* Verify scholar registrations
* Review scholarship renewals
* Evaluate scholarship appeals
* Manage scholar records
* Generate reports
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

# 🌐 Deployment

The application is designed for deployment on **Vercel**, leveraging serverless architecture for scalability and simplified maintenance.

## Infrastructure Services

* Vercel Hosting Platform
* PostgreSQL Database
* Supabase Storage
* Resend Email Service

## Scalability Considerations

* Serverless API architecture
* Cloud-based document storage
* Role-based access control
* Modular system design
* Future-ready integration support

---

# 📚 References

* De La Salle University. Scholarships. https://www.dlsu.edu.ph/admission/scholarship/
* DOST Science Education Institute. Science Scholarships. https://science-scholarships.ph/

---

# 👨‍💻 Authors

**Business Application Development Project Proposal**

* Kien Patrick Zharvy A. Ong
* Juan Carlos R. Benito
* Samantha Breanne A. Sanchez

Department of Information Technology  |  College of Computer Studies   |  De La Salle University
