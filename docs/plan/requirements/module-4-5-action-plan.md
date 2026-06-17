# Módulo 4.5 — Action Plan

> Fuente: PDF pp.137-139. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-12
- RF-13
- RF-15
- RF-16
- RF-42
- RF-43

## Contenido (texto crudo)

```
4.5 Action Plan Module 
RF-12: Action Plans 
Characteristics: The system should allow creating remediation plans with tasks, 
responsible parties, target dates, and tracking. 
Description: Remediation impacts risk scoring when activities are closed. 
Creation captures task, description, responsible party, deadline, and priority. The 
assigned responsible party receives notifications. Tracking includes status 
(pending, in progress, completed). Upon completing all tasks, the risk score is 
recalculated and overdue plans are highlighted in the dashboard. 
Related Non-Functional Requirements: RNF-02 (Performance) 
Requirement Priority: Medium 
  
RF-13: Compliance Audits 
Characteristics: The system should plan audits, register findings with evidence, 
and issue reports. 
Description: Planning includes date, auditor, and areas to audit. Findings 
registration includes description, severity, and attached evidence (PDF or image). 
It allows assigning remediation plans with deadlines and generating a PDF report 
listing findings, statuses, and remediation dates. 
Related Non-Functional Requirements: RNF-11 (Auditability) 
Requirement Priority: Medium 
  
 
 
 

 
RF-15: Reports and Export 
Characteristics: The system must generate filterable reports exportable to PDF 
and CSV. 
Description: Reports include activities by department, risks by level, ARCO 
status, breaches by period, and audits. Filters include department, period, status, 
and risk level. Formats are PDF (formatted) and CSV (raw data). Metadata 
includes generation date, user, and covered period. 
Related Non-Functional Requirements: RNF-12 (Language) 
Requirement Priority: High 
  
RF-16: Executive Dashboard 
Characteristics: The system must show a panel with compliance KPIs, trends, 
and alerts. 
Description: KPIs include percentage of registered activities, average risk score, 
ARCO resolved on time, and breaches reported. Charts show risk trends over the 
last six months and distribution by department. Alerts include ARCO/action plan 
deadlines, unreported breaches, and upcoming audits. p95 load time is ≤ 3 seconds 
with links to evidence details. 
Related Non-Functional Requirements: RNF-02 (Performance) 
Requirement Priority: High 
  
RF-42: Consolidated Summary Report Generation 
 
 
 

 
Characteristics: The system must generate a single, unique report summarizing 
the general compliance status of the company for executive management. 
Description: Upon request by an authorized user (e.g., DPO), the system 
compiles a consolidated report summarizing multiple modules: identified risks, 
action plan status, audit status, and key DPO information. It is designed to 
facilitate presentation to high management or auditors. 
Related Non-Functional Requirements: RNF-02 (Performance), RNF-11 
(Auditability) 
Requirement Priority: High 
  
RF-43: Automated Action Plan Generation 
Characteristics: The system must be able to automatically suggest and generate 
pre-defined action plans based on risk outcomes. 
Description: When a risk assessment results in a score above a defined threshold 
(e.g., Medium or High), the system suggests and generates tailored action plans 
using templates associated with common risks, requiring DPO approval before 
transfer to manual tracking. 
Related Non-Functional Requirements: RNF-32 (Modularity and Architectural 
Scalability), RNF-09 (Maintainability) 
Requirement Priority: High
```
