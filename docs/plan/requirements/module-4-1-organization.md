# Módulo 4.1 — Organization Management

> Fuente: PDF pp.122-125. Pertenece al Cap.4 Functional Requirements.

## RFs detectados
- RF-01
- RF-02
- RF-03
- RF-19
- RF-24
- RF-34
- RF-39
- RF-41

## Contenido (texto crudo)

```
CHAPTER 4​​
​
​
FUNCTIONAL REQUIREMENTS 
4.1 Organization Management Module 
RF-01: User and Role Management 
Characteristics: The system must create, edit, deactivate, and reactivate accounts 
with the roles of DPO, Department Head, Auditor, and Administrator, supporting 
department assignment and granular permissions per module. 
Description: An Administrator can register a new user assigning them to 
department and role. The system must prevent cross-departmental access (except 
for DPO and Auditor). There must be an immutable record of creation and editing 
events. 
Related Non-Functional Requirements: RNF-15 (Multi-tenant isolation), 
RNF-24 (Access control) 
Requirement Priority: High 
  
RF-02: Authentication and Session 
Characteristics: The system must offer authentication with username and 
password and be architecturally capable of MFA and future corporate SSO 
(OIDC/SAML). 
Description: Includes lockout after failed attempts and session closure by 
inactivity. MFA is required for production but disabled for demo navigation 
environments; SSO remains a future feature. Lockout after 5 failed attempts for 15 
minutes. Auto-logout after 30 minutes of inactivity. Passwords must have ≥8 
characters, uppercase, lowercase, number, and symbol. 

 
Related 
Non-Functional 
Requirements: 
RNF-04 
(Security), 
RNF-12 
(Language) 
Requirement Priority: High 
  
RF-03: Company Profile and Units 
Characteristics: The system must register the client company profile, designated 
DPO, and departmental structure. 
Description: Initial configuration includes company name, RUC, address, country 
(Ecuador), and sector. DPO designation includes name, email, and phone. The 
system allows the creation of N departments with responsible parties. 
Related Non-Functional Requirements: RNF-05 (Data residency) 
Requirement Priority: High 
  
RF-19: Multi-Entity (Multi-Tenant) 
Characteristics: The system must logically isolate data by client company and 
prevent cross-access. 
Description: Each company has its own context (users, departments, activities, 
documents). SQL query and authorization logic implement a tenant_id filter. A 
user from Company A cannot access Company B data (error 403). Backup/restore 
is isolated per company. 
Related Non-Functional Requirements: RNF-15 (Multi-tenant isolation) 
 
 
 

 
Requirement Priority: High 
  
RF-24: Role-Based Access Control (RBAC) 
Characteristics: The system must apply role-based control per view and action, 
enforcing least privilege and the logical isolation defined by RNF-15. 
Description: Roles include: DPO (full access), Department Head (their 
department and tasks), Auditor (read), and Admin (configuration). A permission 
matrix defines create, read, update, and delete per role and module. A user without 
permission must receive error 403. 
Related Non-Functional Requirements: RNF-04 (Security) 
Requirement Priority: High 
  
RF-34: Company Profile and Sector Configuration 
Characteristics: The system must allow a client (tenant) to be profiled based on 
their economic sector (e.g., Clinic, Education, Marketing). 
Description: Upon setup, the system shall capture the client's economic sector 
and use it to pre-populate and suggest relevant data types, processing activities, 
and document templates. Correction: automatic integration with the SRI API to 
fetch company details is excluded from the MVP; RUC details must be input 
manually or via bulk upload. 
Related Non-Functional Requirements: RNF-28 (Interoperability (SRI Data)), 
RNF-03 (Capacity) 
 
 
 

 
Requirement Priority: High 
  
RF-39: Initial Master Catalog Configuration 
Characteristics: The system must provide a defined mechanism for bulk loading 
and standardizing initial master catalog values based on the client’s methodology. 
Description: A dedicated setup process (e.g., guided import or setup script) will 
populate the master catalogs to ensure standardized lists (such as Asset Type, 
Format, and Confidentiality Levels) are loaded prior to operation. The mechanism 
should depend on methodological structure rather than a specific file name. 
Related Non-Functional Requirements: RNF-30 (Integrity of Master Catalogs), 
RNF-09 (Maintainability) 
Requirement Priority: High 
  
RF-41: Tenant Provisioning Workflow 
Characteristics: The system must define the initial account creation flow for a 
new client (tenant) by the Super-Administrator role, enforcing Multi-Tenant 
Isolation (RNF-15). 
Description: The Super-Administrator creates the client company profile and 
provisions the initial DPO/Administrator account. That administrator will then 
create internal users (Department Heads, etc.). This workflow ensures proper 
multi-tenant setup.
```
