# Módulo 4.4 — Document Generation

> Fuente: PDF pp.132-136. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-07
- RF-08
- RF-14
- RF-25
- RF-26
- RF-30
- RF-31
- RF-33
- RF-38

## Contenido (texto crudo)

```
for Impact, 'Affects process development?' for Availability) and uses responses to 
automatically calculate the Risk Score. 
Related 
Non-Functional 
Requirements: 
RNF-24 
(Risk 
Assessment 
Methodological Compliance), RNF-31 (Contextual Risk Guidance) 
Requirement Priority: High 
  
RF-38: Information Classification Level Management 
Characteristics: The system must manage and allow the assignment of 
standardized confidentiality levels derived from the client's master risk catalog. 
Description: Beyond LOPDP sensitivity, the system must allow users to assign 
explicit classification levels: 'Pública de Uso Interno', 'Pública Clasificada', and 
'Pública Reservada', required for the Categorization of Information. 
Related Non-Functional Requirements: RNF-30 (Integrity of Master Catalogs), 
RNF-29 (CID Score Traceability) 
Requirement Priority: High 
  
4.4 Document Generation Module 
RF-07: ARCO Rights 
Characteristics: The system must manage ARCO requests with manual reception 
logging, identity verification, response workflow, and legal deadline registration. 
 
 
 

 
Description: The DPO logs the request details received externally and the system 
generates a unique ticket ID. There is immediate notification (≤ 1 min) to the 
responsible party. The workflow includes verification, preparation, and 
notification to the data subject, ensuring compliance with the maximum 30-day 
legal deadline. An immutable ledger stores request, identity verification, response, 
and time stamps. 
Related Non-Functional Requirements: RNF-14 (Regulatory compliance), 
RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-08: Incidents and Breaches 
Characteristics: The system must register, classify, and manage security breaches 
within SPDP deadlines. 
Description: Incident registration covers type, date/time of knowledge, affected 
data, and quantity of data subjects. It includes impact classification 
(low/medium/high), automatic generation of SPDP notification (deadline: 5 days) 
and notification to data subjects (deadline: 3 days), visual deadline verification 
with a traffic-light scheme, and immutable ledgering. 
Related Non-Functional Requirements: RNF-14 (Regulatory compliance), 
RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-14: Legal Documents 
 
 
 

 
Characteristics: The system must generate compliance documents based on 
parameterized templates. 
Description: Predefined templates include Privacy Policy, Security Policy, and 
Cookie Notice. Parameterized generation uses company name, DPO, and 
departments. Output format is PDF, downloadable, with version control (v1.0, 
v1.1, etc.) and effective date. Generation time is under 10 seconds and the 
language is English. 
Related 
Non-Functional 
Requirements: 
RNF-12 
(Language), 
RNF-02 
(Performance) 
Requirement Priority: High 
  
RF-25: Cookie Consent Registration 
Characteristics: The system should generate and version privacy and cookie 
notices and register user acceptance. 
Description: A cookie banner appears on the public portal (if applicable). 
Acceptance records include timestamp and notice version. Versioned notices 
create a new version with effective date upon changes. 
Related Non-Functional Requirements: RNF-14 (Regulatory compliance) 
Requirement Priority: Medium 
  
RF-26: Portability Right Management 
 
 
 

 
Characteristics: The system must offer functionality allowing the data subject to 
request reception or transfer of their personal data to another controller. 
Description: Ensures compliance with Art. 17 LOPDP. The system must register 
the request, track processing and transfer, and record completion time. Resulting 
data must be provided in a technically viable, structured, common, interoperable, 
and machine-readable format. 
Related Non-Functional Requirements: RNF-21 (Gratuity of Rights), RNF-23 
(Portability Format) 
Requirement Priority: High 
  
RF-30: ARCO Request Management 
Characteristics: The system must allow the DPO to manage and monitor data 
subject rights requests (ARCO) with status tracking and metrics. 
Description: Although intended for internal users, ARCO management is 
fundamental under LOPDP. The system facilitates workflow handling, 
verification, and tracking (as detailed in ARCO Rights), ensuring legal deadlines 
are met. It provides reporting and metric visualization for management oversight. 
Related Non-Functional Requirements: RNF-14 (Regulatory Compliance), 
RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-31: Generation of Data Treatment Activity Register (RoPA) 
 
 
 

 
Characteristics: The system should generate the complete Record of Processing 
Activities as required by the LOPDP. 
Description: Even though the platform allows registering personal data and 
purposes, the explicit capability to generate the complete, legally required register 
is necessary. The output compiles captured information (legal basis, purposes, data 
types, transfers) into a structured report that fulfills the RoPA requirement. 
Related Non-Functional Requirements: RNF-14 (Regulatory Compliance), 
RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-33: Additional Legal Document Templates 
Characteristics: The system could include additional templates for generating 
specific contractual documents. 
Description: Document generation must be extendable to templates such as 
privacy notices for customers, contractual clauses for employees or data 
processors, and data processor contracts, ensuring comprehensive documentation 
compliance. 
Related 
Non-Functional 
Requirements: 
RNF-12 
(Language), 
RNF-02 
(Performance) 
Requirement Priority: Medium
```
