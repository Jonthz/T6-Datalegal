Feature: US-RF03-1 Initial company setup
  As an administrator I want to create departments
  so that I can organize the company's operation.

  Scenario: The administrator creates a new department
    Given I am authenticated as "admin@datalegal.local"
    When I create the department "Internal Audit"
    Then the response status is 201
    And the department "Internal Audit" appears in the department list
