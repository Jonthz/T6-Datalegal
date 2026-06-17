# Módulo 4.3 — Risk Analysis

> Fuente: PDF pp.130-131. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-09
- RF-10
- RF-37
- RF-40

## Contenido (texto crudo)

```
Database, .pdf), and Conservation Medium (Physical, Digital), associated with the 
corresponding data treatment activity. 
Related Non-Functional Requirements: RNF-30 (Integrity of Master Catalogs), 
RNF-29 (CID Score Traceability) 
Requirement Priority: High 
  
RF-40: Master Catalog Referential Integrity 
Characteristics: The system must enforce referential integrity rules preventing 
the deletion of master catalog entries if they are currently linked to registered 
information assets. 
Description: When administering catalogs, the system must verify if a catalog 
option (e.g., 'Hardware' in Asset Type) is referenced by any Data Treatment 
Activity or Information Asset. If referenced, deletion must be prohibited and an 
appropriate error shown to the DPO/Administrator to maintain audit traceability. 
Related Non-Functional Requirements: RNF-16 (Data Integrity), RNF-30 
(Integrity of Master Catalogs) 
Requirement Priority: High 
  
4.3 Risk Analysis Module 
RF-09: Impact Assessment (EIPD) 
Characteristics: The system must offer a structured workflow for EIPD with risk 
identification, mitigation measures, and report generation. 
 
 
 

 
Description: A wizard with three mandatory sections—description, risk analysis, 
and mitigations—must generate a structured PDF upon completion, with signature 
date and responsible DPO, ensuring immutable and versioned storage. 
Related Non-Functional Requirements: RNF-14 (Regulatory compliance) 
Requirement Priority: High 
  
RF-10: Risk Engine and Scoring 
Characteristics: The system must calculate a risk score per activity and overall 
per company. 
Description: Formula: Score = Probability (1–5) × Impact (1–5), range 1–25. 
Visualization: green (1–8), yellow (9–16), red (17–25). Calculation must occur in 
under one second when registering or modifying an activity. Rules are 
configurable and must explicitly adhere to the chosen methodology (e.g., ISO/IEC 
27005 or FAIR). 
Related Non-Functional Requirements: RNF-02 (Performance) 
Requirement Priority: High 
  
RF-37: Risk Assessment Questionnaire Integration 
Characteristics: The system must implement the client’s mandatory guided 
'Yes/No' risk questionnaire to determine inputs for Probability and Impact. 
Description: The system presents a structured questionnaire with critical decision 
points (e.g., 'Contains personal data?' as gateway, 'Incur a monetary loss/sanction?'
```
