# Módulo 4.2 — Data Registry and Processing

> Fuente: PDF pp.126-129. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-04
- RF-05
- RF-06
- RF-11
- RF-29
- RF-32
- RF-35
- RF-36

## Contenido (texto crudo)

```
Related Non-Functional Requirements: RNF-15 (Multi-Tenant Isolation), 
RNF-04 (Security in Transit and at Rest) 
Requirement Priority: High 
  
4.2 Data Registry and Processing Module 
RF-04: Data Treatment Activity Registration 
Characteristics: The system must provide a guided wizard for registering data 
treatment activities. 
Description: Registration includes legal basis, purposes, data types (ordinary or 
sensitive), transfers, and responsible parties. The guided form validates each step 
and captures activity name, legal basis, purposes, classified personal data, and 
responsible party. Records are immutable with date/time and change traceability 
with audit. 
Related Non-Functional Requirements: RNF-11 (Auditability), RNF-17 
(Incident management) 
Requirement Priority: High 
  
RF-05: Data Inventory and Classification 
Characteristics: The system must consolidate a data category inventory and 
classify them by sensitivity and criticality. 
Description: A predefined catalog includes items like Passport/ID, Email, Phone, 
Credit Card, Health Data, etc. Automatic classification by type (ordinary or 
 
 
 

 
sensitive) follows LOPDP. Criticality (low, medium, high) is assigned per business 
impact and associated with treatment activities. 
Related Non-Functional Requirements: RNF-14 (Regulatory compliance) 
Requirement Priority: High 
  
RF-06: Consent Management 
Characteristics: The system must register consent by purpose and legal basis 
with timestamps and revocations. 
Description: Without storing unnecessary personal data, the system ensures 
traceability for audit. Records include grant date, legal basis, purpose, and a 
pseudonymized token for the data subject. It must support revocation with reason 
and date, keeping an immutable record and enabling export for audit. 
Related Non-Functional Requirements: RNF-06 (Privacy by design), RNF-11 
(Auditability) 
Requirement Priority: High 
  
RF-11: Policies and Retention 
Characteristics: The system must allow defining conservation, anonymization, 
and deletion policies by data category. 
Description: Scheduled processes execute with logs and justified exceptions. 
Policy definition includes data type, retention period, and action (deletion or 
anonymization). For justified exceptions, a mandatory DPO approval workflow 
 
 
 

 
and a recorded Rationale Justification are required for all exception creation and 
termination events. 
Related Non-Functional Requirements: RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-29: Periodic Retention Review Management 
Characteristics: The system should alert administrators when data identified as 
expired but marked for extended conservation requires periodic legal review and 
ensure audit traceability. 
Description: For records identified as lapsed but marked for periodic review, the 
system must generate a visible alert and an administrative report indicating 
whether to conserve, suppress, or anonymize/pseudonymize, handling the legal 
exception for conservation (Art. 10, literal i, LOPDP). 
Related Non-Functional Requirements: RNF-1.3 (Traceability of Retention), 
RNF-11 (Auditability) 
Requirement Priority: Medium 
  
RF-32: Consent and Revocation Management for Sensitive Data 
Characteristics: The system must allow the management and recording of 
consent revocation, especially for sensitive data. 
Description: The LOPDP establishes that consent must be explicit for sensitive 
data and revocable by data subjects at any time (Art. 8). The system must register 
 
 
 

 
the date and reason for revocation immutably for audit, applying this functionality 
to both sensitive and other data types. 
Related Non-Functional Requirements: RNF-06 (Privacy by Design), RNF-14 
(Regulatory Compliance) 
Requirement Priority: High 
  
RF-35: Data Ingestion via Questionnaire 
Characteristics: The system must use a questionnaire or wizard to capture initial 
data from new clients. 
Description: For initial setup, a dynamic form asks questions about the client's 
business, departments, and data handling to populate the Data Inventory and 
Activities modules. 
Related Non-Functional Requirements: RNF-07 (Usability and Accessibility), 
RNF-31 (Contextual Risk Guidance) 
Requirement Priority: High 
  
RF-36: Technical Asset Metadata Registration 
Characteristics: The system must capture detailed technical metadata for all 
information assets, beyond LOPDP classification, including asset type, format, 
and conservation medium. 
Description: It shall capture attributes necessary for CID risk assessment, such as 
Asset Type (Software, Hardware, Physical Infrastructure), Format (Spreadsheet,
```
