# Requerimientos No Funcionales (RNF)

> Fuente: PDF pp.144-157 (Cap.5). Incluye 5.1 producto (confiabilidad, eficiencia,
> seguridad, mantenibilidad, usabilidad, portabilidad), 5.2 externos (legal/regulatorio,
> estándares, ético) y 5.3 organizacionales.

```
CHAPTER 5​​
​
​
NON-FUNCTIONAL REQUIREMENTS 
5.1 Product Requirements 
5.1.1 Reliability Requirements 
RNF-01: Guaranteed Operational Uptime 
Characteristics: The service shall achieve a minimum monthly availability of 
99.0% at the application layer. 
Fit Criterion: Over a calendar month, measured via synthetic checks on the 
dashboard/main API every 1 minute, the percentage of successful checks is ≥ 
99.0%, excluding maintenance windows announced ≥ 48 hours in advance. 
Requirement Priority: High 
  
RNF-08: Disaster Recovery Metrics 
Characteristics: Define MTTR targets and appropriate recovery procedures. 
Fit Criterion: For a simulated loss of the primary database for a medium client, a 
restoration from the latest backup completes within RTO ≤ 4h with data loss ≤ 24h 
(RPO). Exercise performed at least once per semester with evidence. 
Requirement Priority: High 
  
 
 
 
 

 
5.1.2 Efficiency/Scalability Requirements 
RNF-02: Transactional Speed Requirements 
Characteristics: Dashboard response time at the 95th percentile must be ≤ 3 
seconds under normal load. 
Fit Criterion: Under a load test representing typical usage, the dashboard p95 
latency ≤ 3.0 s and 99th ≤ 5.0 s; generating a standard PDF report (10 pages) 
completes in ≤ 10 s on p95. 
Requirement Priority: High 
  
RNF-03: Multi-Client Load Resilience 
Characteristics: The system supports multiple client companies with 
representative operational volume without performance degradation. 
Fit Criterion: With ≥ N tenants, each with ≥ 20 departments and ≥ 100 activities, 
dashboard p95 remains ≤ 3.0 s and error rate ≤ 0.1% for 30 minutes of steady-state 
load. 
Requirement Priority: High 
 
 
 
 
 

 
5.1.3 Security/Integrity Requirements 
RNF-04: Security in Transit and at Rest 
Characteristics: All communications must use TLS 1.2+ and data at rest must be 
encrypted with AES‑256. 
Fit Criterion: External security scan confirms TLS 1.2+; database storage 
encryption reports AES‑256; keys stored/rotated per documented KMS policy 
aligned to NIST SP 800‑57. 
Requirement Priority: High 
  
RNF-15: Multi-Tenant Isolation 
Characteristics: Data, configurations, and evidence must be isolated by client 
company to prevent cross-access. 
Fit Criterion: Attempting to access resources with a different tenant_id yields 
HTTP 403 in automated tests; no SQL query without tenant filter passes code 
review CI rule. 
Requirement Priority: High 
  
RNF-16: Data Integrity 
Characteristics: Controls must prevent evidence corruption and ensure document 
verifiability. 
 
 
 

 
Fit Criterion: For each stored document, the system records a checksum; 
tampering detection rate is 100% in integrity tests; referential constraints prevent 
orphan records in 100% of CRUD test cases. 
Requirement Priority: High 
  
RNF-20: Endpoint Protection 
Characteristics: APIs and export mechanisms must apply access control and rate 
limiting. 
Fit Criterion: Rate limiter blocks sustained bursts over configured limits (e.g., 
100 req/min per IP) with <1% false positives in a 24h soak test; sensitive 
endpoints require valid JWT and return 401/403 on missing/invalid tokens. 
Requirement Priority: High 
  
RNF-23: Secure Suppression Method 
Characteristics: The data deletion function must permanently and securely 
eliminate, render illegible, or make personal data unrecognizable. 
Fit Criterion: A deleted record becomes irrecoverable via application UI/API and 
direct DB queries; backup retention honors suppression policies; verification 
scripts confirm no personal data remnants in 100% of sampled deletions. 
Requirement Priority: High 
  
 
 
 

 
RNF-25: Rationale Justification for Risk Inputs 
Characteristics: All input estimates for Probability/Frequency and Impact in risk 
assessment must include a recorded Rationale (supporting reasoning). 
Fit Criterion: Risk records cannot be saved unless a non‑empty rationale (≥ 20 
chars) is provided for Probability and Impact; audit report shows rationale fields 
for 100% of risk entries. 
Requirement Priority: High 
  
RNF-29: CID Score Traceability 
Characteristics: The Risk Engine must calculate, store, and make traceable the 
individual numerical scores for Confidentiality, Integrity, and Availability (CIA) 
for every asset. 
Fit Criterion: Given an asset with CIA inputs, the system displays the three 
component scores and the computed aggregate; exports include CIA columns; 
traceability verified in end‑to‑end tests. 
Evaluation Criterion (Metric): The UI and export show individual C, I, and A 
scores and the aggregated risk (1–25), and automated tests verify the mapping and 
persistence for 100% of asset types. 
Requirement Priority: High 
  
5.1.4 Maintainability/Support Requirements 
RNF-09: Development Lifecycle Standards 
 
 
 

 
Characteristics: Adopt modularity, maintain test coverage ≥ 80%, and provide 
technical documentation. 
Fit Criterion: CI pipeline fails if line or branch coverage < 80% for backend and 
frontend; architecture and API docs updated in the repository and pass a link 
check; modules compile independently. 
Requirement Priority: High 
  
RNF-18: System Health Monitoring 
Characteristics: Expose metrics, logs, and traces for observability. 
Fit Criterion: Prometheus/Datadog dashboards show CPU, memory, request rate, 
latency, and error rate for all services; log retention ≥ 30 days; a synthetic failure 
is detected and alerted within ≤ 5 minutes. 
Requirement Priority: High 
  
RNF-30: Standardized Risk Configuration 
Characteristics: Master data lists used for risk inputs must be standardized, 
non-editable by non‑administrators, and consistent across the system. 
Fit Criterion: Form submissions using values outside the master lists are rejected 
with a user error; non‑admin users cannot alter master catalogs; nightly check 
verifies referential consistency with 0 violations. 
Evaluation Criterion (Metric): Catalogs come from a controlled master table; 
only administrators can change them; all forms validate against these lists. 
 
 
 

 
Requirement Priority: High 
  
 
RNF-32: Architectural Decoupling Mandate 
Characteristics: The system architecture must be fundamentally modular 
(non‑monolithic). 
Fit Criterion: A change in one module can be deployed independently and does 
not break unrelated modules in integration tests; static analysis shows no 
forbidden cross‑module imports. 
Evaluation 
Criterion 
(Metric): 
Services/components 
communicate 
via 
interfaces; unit tests mock dependencies. 
Requirement Priority: High 
  
5.1.5 Usability/Localization Requirements 
RNF-07: Non‑Expert User Experience Standard 
Characteristics: The interface must be understandable to non‑expert users (e.g., 
legal or compliance officers, DPOs) with minimal training. 
Fit Criterion: In a usability test with ≥ 5 novice users, 80% complete the 'first 
registration' flow in < 15 minutes with ≤ 1 assistance request, and WCAG 2.1 AA 
checklist scores ≥ 95%. 
Requirement Priority: High 
 
 
 

 
  
RNF-12: Default Language Setting 
Characteristics: All interface text, reports, and documents must be in English by 
default. 
Fit Criterion: String audit across UI and generated PDFs reveals ≥ 99% English 
content with no Spanish strings; i18n scanner in CI blocks mixed‑language 
additions. 
Requirement Priority: High 
  
RNF-31: Contextual Risk Guidance  
Characteristics: The system must provide contextual help mechanisms (tooltips) 
within the Risk Assessment Questionnaire (RF-37) to clarify complex questions 
related to impact, probability, and legal sanctions.  
Fit Criterion: 100% of all questions in the Risk Assessment Questionnaire 
(RF-37/RF-07) must be accompanied by a dedicated tooltip that provides 
explanatory examples or definitions, tailored for users with Novice LOPDP 
experience. Example text must cover legal/economic terms (e.g., loss, fine, 
sanction). 
 Requirement Priority: High 
 
5.1.6 Portability/Interoperability Requirements 
RNF-10: Portability 
 
 
 

 
Characteristics: Automated deployment must utilize Infrastructure as Code and 
containers. 
Fit Criterion: A clean environment can be provisioned with IaC and deployed 
with Docker/Kubernetes manifests in ≤ 60 minutes without manual edits; build is 
reproducible producing identical image digests. 
Requirement Priority: High 
  
RNF-13: Browser Compatibility Score 
Characteristics: Ensure compatibility with major browsers. 
Fit Criterion: Automated UI tests pass on the latest two versions of Chrome, 
Edge, and Firefox with 0 critical visual regressions and 0 functional failures. 
Requirement Priority: High 
  
RNF-28: External Data Source Hook 
Characteristics: Design the system to potentially integrate with SRI data sources 
to automate company detail retrieval. 
Fit Criterion: Given a valid RUC PDF/XML upload, the parser pre‑fills company 
profile fields with ≥ 95% accuracy on a 50‑document sample; module is optional 
and can be disabled per tenant. 
Evaluation Criterion (Metric): Architecture allows adding an SRI intake module 
(file parsing or future API). 
 
 
 

 
Requirement Priority: Low 
  
5.2 External Requirements 
5.2.1 Legal/Regulatory/Residence Requirements 
RNF-05: Ecuadorian Data Sovereignty 
Characteristics: All data and evidence must be stored exclusively in Ecuador, 
including backups and logs. 
Fit Criterion: Cloud provider region is set to Ecuador (or certified local DC); 
data residency report shows 100% of storage buckets, databases, and backups in 
Ecuador; periodic audit evidence available. 
Requirement Priority: High 
  
RNF-11: Immutable Compliance Record 
Characteristics: Audit records must be immutable, retained, and exportable. 
Fit Criterion: Audit logs are append‑only, retained ≥ 1 year, and export to CSV 
on demand; penetration test confirms regular users cannot modify or delete audit 
entries. 
Requirement Priority: High 
  
RNF-14: Regulatory Compliance 
 
 
 

 
Characteristics: Facilitate LOPDP compliance in principles, rights, and 
technical/organizational measures with traceable evidence. 
Fit Criterion: A coverage matrix maps system functions to LOPDP articles; legal 
audit marks ≥ 95% of items as 'meets' with documented evidence and no 'critical 
gaps'. 
Requirement Priority: High 
  
RNF-19: Latency and Residency Optimization 
Characteristics: Deploy in an Ecuador region or the nearest geographic 
alternative to minimize latency while complying with residency constraints. 
Fit Criterion: From Ecuador last‑mile probes, median end‑user RTT to the app is 
< 100 ms over a 7‑day window; traceroute confirms packets terminate in Ecuador 
(or nearest LatAm region when residency permits). 
Requirement Priority: High 
  
RNF-21: Gratuity of Data Subject Rights 
Characteristics: The exercise of access, rectification, and deletion rights shall be 
free of charge for the data subject. 
Fit Criterion: User flows for ARCO requests have no payment screens or cost 
prompts; legal review checklist confirms $0 fees; attempts to charge are blocked 
in code review CI rule. 
Requirement Priority: High 
 
 
 

 
  
RNF-22: Gratuity of Training Service 
Characteristics: Access and participation in all digital training plans provided to 
system users must be free of charge. 
Fit Criterion: Training module URLs are accessible to authenticated users 
without paywalls; no payment gateway dependencies exist; audit confirms $0 cost 
across plans. 
Requirement Priority: High 
  
RNF-27: High Risk Identification and Alert 
Characteristics: Automatically identify and alert the controller if the calculated 
risk score corresponds to High Risk. 
Fit Criterion: For any risk with aggregate score in 17–25, an alert is sent to the 
DPO within ≤ 1 minute and the EIPD workflow is required before status can be 
set to 'approved'. 
Requirement Priority: High 
  
5.2.2 Standard Requirements 
RNF-24:  Risk Assessment Methodological Compliance 
Characteristics: EIPD workflow and the Risk Engine must align with recognized 
methodologies like ISO/IEC 27005:2022 or FAIR, adapted for rights protection. 
 
 
 

 
Fit Criterion: Independent review verifies the method mapping; configuration 
screens reflect the selected method; sample calculations reproduce standard 
method examples within ±1 scoring unit. 
Requirement Priority: High 
  
5.2.3 Legal/Ethical Requirements 
RNF-06: Privacy by Design 
Characteristics: Minimize data collection and anonymize where possible, 
recording only metadata necessary for compliance and audit. 
Fit Criterion: Static/dynamic analyses confirm no storage of real personal data of 
data subjects (IDs, emails, phone numbers); synthetic/pseudonymized data only; 
privacy review checklist passes 100%. 
Requirement Priority: High 
  
RNF-26: Rights and Vulnerability Focus in Impact 
Characteristics: Impact calculation must consider and distinguish amplified 
impact on especially vulnerable groups (e.g., minors, disabled persons). 
Fit Criterion: Risk engine UI includes a vulnerability selector; scenarios with 
'vulnerable groups' apply higher severity; unit tests verify the weighting and its 
propagation to the final score. 
Requirement Priority: High 
 
 
 

 
  
5.3 Organizational Requirements – Process/Safety 
RNF-17: Incident Management 
Characteristics: Define procedures for detection, response, and postmortem 
analysis. 
Fit Criterion: Incident runbooks exist; MTTR is recorded for 100% of incidents; 
a quarterly game‑day exercise validates detection, response within SLA, and 
documented postmortem publication. 
Requirement Priority: High
```
