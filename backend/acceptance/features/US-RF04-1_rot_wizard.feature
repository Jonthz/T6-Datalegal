Feature: US-RF04-1 Guided RoT wizard for activity registration
  As a department head I want a step-by-step wizard
  so that I can correctly register each treatment activity.

  Scenario: The department head registers an activity with the wizard
    Given I am authenticated as "tech@datalegal.local"
    When I start the RoT wizard for the activity "Payroll management"
    And I complete the legal basis "CONSENT"
    And I finalize the wizard
    Then the response status is 200
    And the activity is in status "ACTIVE"
