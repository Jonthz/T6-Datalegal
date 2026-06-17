# Módulo 4.6 — Transversal and Support

> Fuente: PDF pp.140-143. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-17
- RF-18
- RF-20
- RF-21
- RF-22
- RF-23
- RF-27
- RF-28

## Contenido (texto crudo)

```
4.6 Transversal and Support Functional Requirements 
RF-17: Audit Log and Traceability 
Characteristics: The system must register all relevant actions in an immutable 
audit log. 
Description: Events include login, activity registration, risk changes, approvals, 
and document generation. Information captured includes user, timestamp, action, 
affected resource, and changes made. Immutability is ensured via an append-only 
store. Logs are exportable to CSV and queryable by authorized users. 
Related Non-Functional Requirements: RNF-11 (Auditability) 
Requirement Priority: High 
  
RF-18: Operational Notifications 
Characteristics: The system should send internal notifications for critical events. 
Description: Events include breach reported, ARCO close to deadline, action plan 
task assigned, and audit scheduled. Notifications are sent by email with subject, 
description, and link to details. Templates are editable by the DPO and notification 
delivery is tracked. 
Related Non-Functional Requirements: RNF-11 (Auditability) 
Requirement Priority: Medium 
  
RF-20: Configuration and Catalogs 
 
 
 

 
Characteristics: The system should expose catalogs editable by the DPO. 
Description: Predefined catalogs include legal bases, data types, threats, and 
controls. The DPO can add or modify values without affecting the system base. 
Versioning ensures catalog changes do not invalidate historical data. 
Related Non-Functional Requirements: RNF-09 (Maintainability) 
Requirement Priority: Medium 
  
RF-21: Basic Interoperability 
Characteristics: The system could offer import/export endpoints. 
Description: Import endpoint supports bulk upload of activities from CSV/JSON 
(without real personal data). Export endpoint allows downloading metadata, 
policies, and reports in a standard format. Documentation follows OpenAPI 3.0 
and excludes personal data transfers. 
Related Non-Functional Requirements: RNF-20 (Endpoint protection) 
Requirement Priority: Medium 
  
RF-22: English Language Support 
Characteristics: The system must present the interface and documents in English 
by default. 
 
 
 

 
Description: All labels, buttons, and messages are in English in the MVP. 
Generated documents (policies, reports) are in English. A centralized translation 
file facilitates future languages. 
Related Non-Functional Requirements: RNF-12 (Language) 
Requirement Priority: High 
  
RF-23: Backup and Restoration 
Characteristics: The system should allow scheduled backups with verifiable 
restoration. 
Description: Automatic daily backups with retention of at least 30 days. 
Verifiable restoration includes an integrity test with checksum. RPO is maximum 
24 hours of data loss and RTO is ≤ 4 hours, per client company. 
Related Non-Functional Requirements: RNF-08 (Reliability) 
Requirement Priority: Medium 
  
RF-27: Digital Training Content Administration 
Characteristics: The system must provide an administrative interface to create, 
edit, classify, and publish digital training plans and materials, including modules, 
didactic materials, and evaluations. 
Description: Managers can administer training programs, register and un-register 
users in training, and link user records with individual progress. The system must 
serve and ensure availability of training materials. 
 
 
 

 
Related Non-Functional Requirements: RNF-22 (Gratuity of Training), RNF-24 
(Usability/Simplicity) 
Requirement Priority: High 
  
RF-28: Training Compliance Tracking and Reporting 
Characteristics: The system must automatically register user progress and 
generate comprehensive reports on mandatory training compliance. 
Description: The system records the completion of each module and calculates 
each user's progress percentage. Administrators can generate reports, including 
lists of users who have or have not completed obligatory programs, supporting 
compliance with Art. 32 of the LOTDA. 
Related Non-Functional Requirements: RNF-11 (Auditability), RNF-7.3 
(Availability) 
Requirement Priority: High
```
