# ITISDEV-Iskolaris# ISKOLARIS: Scholarship Journey App for DLSU Undergraduate Scholars

> A web-based scholarship management and student success platform for **De La Salle University (DLSU)** scholars.

## 📖 Overview

**ISKOLARIS** is a centralized web application designed to simplify scholarship management for undergraduate scholars of **De La Salle University**. The platform addresses the fragmented nature of scholarship information and administrative processes by providing a single system where scholars can discover scholarship opportunities, manage renewals, monitor academic performance, track stipend releases, manage personal finances, and prepare for their future careers.

The system primarily supports scholarships administered by the **Admissions and Scholarships Office (AdSO)** and the **DOST Core Group under DLSU**, while providing dedicated portals for scholars and administrators. The proposal emphasizes manual verification of scholarship documents to ensure accuracy and accommodate multiple document formats. 

---

# 🎯 Project Objectives

The application aims to:

* Centralize scholarship information in one platform
* Streamline scholar registration and verification
* Simplify scholarship renewal and appeal processes
* Improve transparency through status tracking
* Help scholars monitor academic performance
* Track stipend disbursement schedules
* Assist students in budgeting their finances
* Generate ATS-friendly resumes using verified academic records
* Reduce administrative workload through organized workflows 

---

# 👥 Stakeholders

### Students / Scholars

* Register as scholars
* Submit renewal requirements
* Monitor scholarship status
* Track stipends
* Monitor GPA
* Build resumes
* Manage personal budget

### Admissions and Scholarships Office (AdSO)

* Verify scholar documents
* Review renewals
* Evaluate appeals
* Maintain scholar records

### DOST Core Group under DLSU

* Review scholar compliance
* Process scholarship renewals
* Monitor stipend releases

### Finance and Accounting Office (FAO)

* Manage tuition credits
* Update stipend disbursements
* Monitor financial reports 

---

# ✨ Features

## 1. Scholar Registration & Verification

* Student account creation
* Scholarship selection
* Upload scholarship award letter
* Manual verification by administrators
* Conditional access before approval

---

## 2. Scholarship Renewal

* Upload Enrollment Assessment Form (EAF)
* Upload Grade Report from ArchersHub
* Deadline-controlled submission
* Renewal status monitoring
* Administrator evaluation dashboard

---

## 3. Scholarship Appeals

* Submit Letter of Reconsideration
* Upload supporting documents
* Appeal tracking
* Administrator review
* Appeal decision notifications

---

## 4. Stipend Tracking

* Timeline-based stipend monitoring
* Monthly or term-based release tracking
* Automatic notifications
* Payment history

---

## 5. Academic Performance Analytics

* Term GPA Tracking
* Cumulative GPA Tracking
* Scholarship retention monitoring
* Latin Honors Calculator
* At-Risk Warning System
* Dean's List Certificate Repository

---

## 6. Budget Tracker

Track:

* Scholarship stipend
* Allowances
* Part-time income
* Daily expenses

Expense Categories:

* Food
* Transportation
* Dormitory
* School Supplies
* Others

Includes:

* Spending analytics
* Budget charts
* Financial summaries

---

## 7. Resume Builder

Generate professional resumes using:

* Verified student information
* Scholarship achievements
* Dean's List awards
* Leadership experiences
* Skills

Export to:

* PDF (ATS-friendly)

---

## 8. Notification System

Receive notifications for:

* Registration approval
* Renewal schedules
* Renewal status
* Appeal outcomes
* Stipend releases
* Scholarship announcements

---

## 9. Administrator Dashboard

Administrators can:

* Verify scholar registrations
* Review renewal submissions
* Evaluate appeals
* Update stipend status
* Generate reports
* Manage scholar records

---

## 10. Document Management

Securely store:

* Award Letters
* EAF
* Grade Reports
* Appeal Letters
* Medical Certificates
* Dean's List Certificates
* Supporting Documents 

---

# 🏗️ System Modules

## Scholar Onboarding and Access Management

* Scholar registration
* Manual authentication
* Conditional access control

---

## Scholarship Renewal, Evaluation & Disbursement

* Renewal submission
* Document validation
* Evaluation dashboard
* Status tracking
* Stipend timeline

---

## Academic Performance & Appeals

* GPA Analytics
* Latin Honors Calculator
* Appeals Pipeline
* Academic Document Vault

---

## Personal Finance & Professional Development

* Budget Tracking
* Expense Analytics
* Resume Builder
* Academic Portfolio 

---

# 🔄 Core Business Processes

The system supports complete workflows for:

* Scholar Registration & Verification
* Scholarship Renewal
* Scholarship Appeal
* Stipend Disbursement
* Academic Performance Tracking
* Budget Tracking
* Resume Generation

Each process includes automated notifications, administrator actions, and status monitoring for greater transparency. 

---

# 🛠️ Technology Stack (Proposed)

> *Suggested implementation based on the project proposal.*

### Frontend

* React.js
* Tailwind CSS
* HTML5
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MySQL

### Authentication

* JWT Authentication
* Role-Based Access Control (RBAC)

### File Storage

* Local Storage / Cloud Storage

### PDF Generation

* jsPDF / PDFKit

---

# 📂 Project Structure

```text
iskolaris/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── services/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── services/
│
├── database/
│   └── schema.sql
│
├── uploads/
│
├── docs/
│
└── README.md
```

---

# 🔐 User Roles

### Scholar

* Register
* Submit renewals
* Submit appeals
* View GPA
* Track stipends
* Manage finances
* Build resumes

### Administrator

* Verify scholars
* Approve registrations
* Review renewals
* Evaluate appeals
* Update stipend status
* Generate reports

---

# 🚀 Future Enhancements

Potential future improvements include:

* OCR-assisted document verification
* ArchersHub integration
* DLSU Single Sign-On (SSO)
* Email and SMS notifications
* Mobile application
* Scholarship recommendation engine
* AI-powered academic risk prediction
* Integration with external scholarship providers 

---

# 📚 References

* De La Salle University. *Scholarships*. [https://www.dlsu.edu.ph/admission/scholarship/](https://www.dlsu.edu.ph/admission/scholarship/)
* DOST Science Education Institute. *Science Scholarships*. [https://science-scholarships.ph/](https://science-scholarships.ph/) 

---

# 👨‍💻 Authors

**Business Application Development Proposal**

* Kien Patrick Zharvy A. Ong
* Juan Carlos R. Benito
* Samantha Breanne A. Sanchez

Department of Information Technology
College of Computer Studies
De La Salle University 
