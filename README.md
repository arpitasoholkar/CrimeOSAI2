# 🔍 TriNetra — AI-Powered Cybercrime Investigation Platform

> **Decoding the Unknown**

TriNetra is an AI-powered investigation and case-management platform designed to assist investigators in handling cybercrime cases from **complaint intake to investigation, evidence analysis, information requests, re-investigation, resolution, and archival**.

The platform combines case management, AI-assisted investigation, evidence handling, entity relationship analysis, geographical intelligence, legal intelligence, similar-case discovery, controlled collaboration, and investigation history into a single workspace.

---

## 🚨 Problem Statement

Cybercrime investigations often involve large amounts of fragmented information, including complaints, documents, digital evidence, financial transactions, phone numbers, UPI IDs, people, addresses, and information received from external organizations.

Investigators may need to manually:

* Process and organize complaints
* Identify important entities and relationships
* Determine what information is missing
* Research relevant legal provisions
* Decide the next investigation steps
* Prepare requests to banks, telecom operators, and other organizations
* Track responses and investigation progress
* Compare cases with previous investigations
* Re-analyze the case when new evidence becomes available

This fragmented workflow can increase investigation time and make it harder to maintain a clear, traceable investigation history.

### Our goal

**TriNetra brings these activities together into one intelligent, secure and investigator-controlled workspace.**

---

# 💡 Key Features

## 1. 🔐 Secure Authentication & Access Control

* Authenticated investigator login
* Restricted case visibility
* Case-level access control
* Access request workflow
* Approve/reject access requests
* Notifications for pending requests
* Email-based access notifications

Investigators can collaborate without automatically exposing restricted case information.

---

## 2. 📊 Investigation Dashboard

The dashboard provides a centralized overview of investigations.

It includes:

* Total cases
* Pending cases
* Cases under investigation
* Resolved cases
* Recent investigations
* Today's activity
* Quick actions
* Global case/entity search
* My Cases

---

## 3. 🗂️ Case Management

Investigators can create and manage cases using:

* Case name
* Case ID
* Complaint information
* Investigator assignment
* Case status
* Severity/risk information
* Evidence
* Investigation findings
* Recommendations
* Investigation history

Cases can be searched using case-related information through the central search interface.

---

## 4. 📥 Complaint & Evidence Ingestion

TriNetra allows investigators to add information to a case through:

* Pasted complaint text
* Uploaded files
* Multiple evidence items
* Additional evidence during an ongoing investigation

Evidence is linked to the relevant case and can support subsequent investigation findings and recommendations.

---

## 5. 🧠 AI Case Intelligence

TriNetra generates an AI-assisted overview of the current investigation.

The Case Intelligence section provides:

* Risk level
* AI confidence
* Evidence count
* Critical investigation gaps
* Recommended actions
* Investigation version
* Current AI assessment

The system helps investigators understand:

> **What do we know? What is missing? What should we investigate next?**

---

## 6. 🔎 Investigation Gap Detection

TriNetra separates available information from missing information.

For example:

### Known

* Complainant
* Transaction amount
* Phone number
* UPI ID

### Missing

* Account owner
* KYC information
* Device/IP attribution
* Other information required to establish attribution

Each identified gap can include:

* Why the information matters
* Suggested investigation method
* Supporting evidence

---

## 7. ✅ Investigator-Controlled Recommendations

AI-generated recommendations are presented for investigator review.

Investigators can:

* Approve a recommendation
* Reject a recommendation
* Review the reasoning behind an action
* Continue the investigation based on approved actions

### Human-in-the-loop principle

**AI recommends. Investigator decides.**

The platform is designed to assist investigators rather than replace investigative judgment.

---

## 8. 🏦 Targeted Information Requests

Approved investigation actions can lead to targeted information requests to external organizations such as:

* Banks
* Telecom operators
* Other relevant service providers

The system tracks request information and status.

A key design principle is:

> **Only information necessary for the recipient organization is included in the request, rather than exposing the entire case.**

---

## 9. 🕸️ Entity Relationship Graph

TriNetra visualizes relationships between important case entities.

Examples include:

* Persons
* Phone numbers
* UPI IDs
* Transactions
* Addresses
* Complainants
* Other extracted entities

The graph helps investigators identify connections that may not be obvious when information is viewed independently.

---

## 10. 📍 Geographical Intelligence

Locations mentioned in complaints and investigation data can be represented geographically.

The geographical intelligence interface provides:

* Location visualization
* Map-based investigation context
* Location-linked entities
* Geographical relationships between investigation information

This helps investigators incorporate **where** an event or entity is connected to the broader case.

---

## 11. ⚖️ Legal Intelligence

TriNetra provides AI-assisted legal intelligence relevant to the investigation.

The interface can display:

* Relevant legal sections
* Legal descriptions
* Suggested legal provisions
* Legal request status
* Investigation-related legal actions

Investigators can review and approve/reject suggested investigation or legal actions.

> Legal suggestions are intended as investigator assistance and should be verified by authorized personnel.

---

## 12. 🔗 Similar Case Discovery

TriNetra identifies cases with similarities to the current investigation.

Similarity can be based on shared information such as:

* Phone numbers
* UPI IDs
* Transaction amounts
* Other relevant entities

This allows investigators to:

* Identify recurring patterns
* Connect related investigations
* Reuse investigative insights
* Discover potential links between cases

---

## 13. 🕒 Investigation Timeline

Major investigation activities are represented through a chronological timeline.

Examples include:

```text
Recommendation Approved
        ↓
Request Generated
        ↓
Request Approved
        ↓
Request Sent
        ↓
Response Received
        ↓
Evidence Added
        ↓
Re-investigation
```

This provides a traceable history of how an investigation progressed.

---

## 14. 🔄 Re-investigation & Versioning

Investigations can evolve when new evidence or external responses become available.

Investigators can trigger a fresh investigation analysis.

TriNetra maintains investigation versions such as:

```text
v1 — Initial Complaint
        ↓
v2 — New Evidence / Manual Re-investigation
        ↓
v3 — Updated Investigation
```

This allows investigators to understand how the AI assessment and recommendations changed over time.

---

## 15. 🗄️ Case Archive

Once an investigation is completed, it can be moved to the Cases Archive.

Archived cases can be used for:

* Historical reference
* Investigation study
* Similar-case discovery
* Pattern identification
* Future intelligence

---

# 🔄 Investigation Lifecycle

The overall TriNetra workflow can be summarized as:

```text
                 ┌──────────────┐
                 │     LOGIN    │
                 └──────┬───────┘
                        ↓
              ┌──────────────────┐
              │ CREATE / ACCESS  │
              │      CASE       │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ COMPLAINT +      │
              │ EVIDENCE         │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ AI CASE          │
              │ INTELLIGENCE     │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ INVESTIGATION    │
              │ GAPS             │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ RECOMMENDED      │
              │ ACTIONS          │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ INVESTIGATOR     │
              │ APPROVAL         │
              └────────┬─────────┘
                       ↓
          ┌──────────────────────────┐
          │ BANK / TELECOM / SERVICE │
          │ PROVIDER REQUEST         │
          └────────────┬─────────────┘
                       ↓
              ┌──────────────────┐
              │ RESPONSE / NEW   │
              │ EVIDENCE         │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ RE-INVESTIGATE   │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ RESOLVE & ARCHIVE│
              └──────────────────┘
```

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │     INVESTIGATOR    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │ Dashboard / Cases   │
                    │ Intelligence / Maps │
                    └──────────┬──────────┘
                               │
                              API
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Node.js + Express   │
                    │ Backend             │
                    └──────┬──────┬───────┘
                           │      │
               ┌───────────┘      └────────────┐
               ▼                               ▼
      ┌─────────────────┐             ┌─────────────────┐
      │    MongoDB      │             │   AI / RAG      │
      │ Cases           │             │ Investigation    │
      │ Evidence        │             │ Intelligence     │
      │ Requests        │             └─────────────────┘
      └─────────────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │ External Services │
                 │ Email / Maps etc. │
                 └───────────────────┘
```

> The architecture diagram should be updated to match the exact implementation and deployment configuration of the final repository.

---

# 🛠️ Technology Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Frontend        | React                                     |
| Backend         | Node.js, Express.js                       |
| Database        | MongoDB, Mongoose                         |
| Authentication  | Google OAuth / Application Authentication |
| Maps            | Leaflet / Mapping Layer                   |
| AI              | AI/LLM-based investigation intelligence   |
| Communication   | Email automation                          |
| File Handling   | File upload and evidence processing       |
| Version Control | Git / GitHub                              |

---

# 📁 Project Structure

A typical project structure is:

```text
TriNetra/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── lib/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── README.md
└── ...
```

The exact structure may vary depending on the final integrated repository.

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB or a MongoDB Atlas database
* Git

---

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

---

## 2. Install Frontend Dependencies

```bash
cd client
npm install
```

---

## 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

---

## 4. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

CLIENT_URL=http://localhost:5173

EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

Use the actual environment variables required by the final implementation.

**Never commit credentials, API keys, OAuth secrets, or database passwords to GitHub.**

---

## 5. Start the Backend

```bash
cd server
npm run dev
```

or, depending on the configured scripts:

```bash
npm start
```

---

## 6. Start the Frontend

```bash
cd client
npm run dev
```

The frontend will typically be available at:

```text
http://localhost:5173
```

The backend URL depends on the configured server port.

---

# 🔑 Authentication

TriNetra uses authenticated investigator access.

The login interface provides:

**Continue with Google**

After successful authentication, authorized investigators can access the investigation workspace.

For production deployment, authentication and authorization should be configured with secure production credentials and HTTPS.

---

# 🧪 Demonstration Workflow

A typical demonstration can follow this sequence:

### 1. Login

Authenticate as an investigator.

### 2. Dashboard

Show case statistics and recent investigations.

### 3. Create a Case

Create a new case using complaint text or an uploaded file.

### 4. Case Intelligence

Open the case and show:

* Risk level
* AI confidence
* Evidence
* Critical gaps
* Current assessment

### 5. Investigation Gaps

Show what is known and what information is missing.

### 6. Recommendations

Review AI-suggested investigation actions.

### 7. Approval

Approve or reject selected recommendations.

### 8. External Request

Generate a targeted request for the relevant organization.

### 9. Intelligence

Show:

* Entity relationship graph
* Geographic intelligence
* Legal intelligence
* Similar cases

### 10. Re-investigation

Add new evidence or a response and trigger re-investigation.

### 11. Timeline

Show the investigation history and version changes.

### 12. Resolution

Mark the case complete and show it in the archive.

---

# 🔒 Security & Privacy Principles

TriNetra is designed around controlled access and investigator oversight.

Key principles include:

* Authenticated access
* Restricted case visibility
* Explicit access approval
* Controlled collaboration
* Minimum-necessary information in external requests
* Evidence-linked investigation findings
* Investigation history and traceability
* Separation of AI recommendations from investigator decisions

The prototype should use anonymized or synthetic investigation data for demonstrations.

---

# 🤖 AI Philosophy

TriNetra follows a **human-in-the-loop** approach.

```text
AI ANALYZES
     ↓
AI IDENTIFIES GAPS
     ↓
AI RECOMMENDS ACTION
     ↓
INVESTIGATOR REVIEWS
     ↓
APPROVE / REJECT
     ↓
ACTION EXECUTED
     ↓
NEW INFORMATION
     ↓
RE-INVESTIGATE
```

The objective is not to replace investigators.

The objective is to **reduce repetitive work, surface relevant intelligence, and help investigators make informed decisions faster.**

---

# 🌟 Unique Value Proposition

### TriNetra combines multiple investigation capabilities in one workflow:

**Case Management**
+
**AI Investigation Intelligence**
+
**Evidence Management**
+
**Entity Graphs**
+
**Geographical Intelligence**
+
**Legal Intelligence**
+
**Similar Case Discovery**
+
**Targeted Information Requests**
+
**Investigation Versioning**

### Result

> **A connected, investigator-controlled intelligence layer for the complete case lifecycle.**

---

# 🚀 Future Scope

Future versions of TriNetra can expand toward:

* Multimodal complaint ingestion
* Audio transcription
* OCR and image analysis
* Multilingual complaint processing
* Advanced graph-based investigation
* Automated response analysis
* More extensive legal knowledge retrieval
* Real-time intelligence feeds
* Advanced anomaly and fraud-pattern detection
* Inter-agency collaboration
* Offline/low-network operation
* Production-grade deployment and scalability

---

# ⚠️ Disclaimer

TriNetra is a hackathon prototype intended to demonstrate an AI-assisted investigation workflow.

AI-generated findings, recommendations, legal references, and risk assessments should be **reviewed and validated by authorized investigators and legal professionals** before being used for real-world decisions.

The demonstration should use synthetic or anonymized case information.

---

# 👥 Team

**Team:** `[TEAM NAME]`

**Members:**

* `[Member 1]`
* `[Member 2]`
* `[Member 3]`
* `[Member 4]`

**Hackathon:** E-Rakshak Hackathon 2026

**Problem Statement:** ERH26_PS_10 — Crime OS AI: Agentic AI Platform for Intelligence-led Investigations

---

# 📌 Project Status

**Current Status:** Hackathon Prototype / Working Demonstration

TriNetra currently demonstrates the core investigation workflow including case management, AI-assisted case intelligence, investigation gaps, recommendations, evidence handling, controlled access, entity relationships, geographical intelligence, legal intelligence, similar cases, investigation timelines, re-investigation and case archival.

---

# 🔭 Vision

> **TriNetra aims to transform investigations from fragmented, document-heavy workflows into connected, intelligence-led investigations.**

### **See the connections. Understand the case. Act with intelligence.**

---
