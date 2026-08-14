Feature: US-RF01-2 Department isolation
  As a department head I want to see only my department's information
  so that confidentiality between areas is preserved.

  Scenario: A department head only sees their department's activities
    Given an activity "Human Resources Activity" in the department "Human Resources"
    And an activity "Technology Activity" in the department "Technology"
    When "tech@datalegal.local" lists the treatment activities
    Then I see the activity "Technology Activity"
    And I do not see the activity "Human Resources Activity"
