Feature: US-RF24-1 Permission matrix by module (RBAC)
  As a compliance team we want each role to do only what it is allowed
  so that the principle of least privilege is respected.

  Scenario: The auditor cannot create treatment activities
    Given I am authenticated as "auditor@datalegal.local"
    When I try to create a treatment activity
    Then the system responds "403 Forbidden"
    And the activity is not created
