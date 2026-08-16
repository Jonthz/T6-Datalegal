Feature: US-RF13-1 Audit planning, findings and report
  As an auditor I want to plan audits and register findings
  so that I have full traceability in a report.

  Scenario: The auditor plans an audit and issues the report
    Given I am authenticated as "auditor@datalegal.local"
    When I create an audit plan "LOPDP Audit 2026"
    Then the response status is 201
    And the plan is in status "PLANNED"
    When I register a finding "Unencrypted backups" with severity "HIGH"
    Then the response status is 201
    When I download the audit report as PDF
    Then I get a PDF document
