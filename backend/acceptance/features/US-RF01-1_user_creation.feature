Feature: US-RF01-1 Account creation with role and department
  As an administrator I want to create users and assign them a role
  so that I can control access based on their responsibilities.

  Scenario: The administrator creates a user with a role
    Given I am authenticated as "admin@datalegal.local"
    When I create a user with role "DEPT_HEAD"
    Then the response status is 201
    And the created user has role "DEPT_HEAD"
