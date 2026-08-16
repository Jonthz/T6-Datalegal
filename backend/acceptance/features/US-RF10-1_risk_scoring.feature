Feature: US-RF10-1 Immediate risk level calculation
  As a DPO I want to see an activity's risk level
  so that I can prioritize controls.

  Scenario: The DPO assesses a high-risk activity
    Given I am authenticated as "dpo@datalegal.local"
    And a treatment activity "Health data processing"
    When I assess the risk with high-impact answers
    Then the response status is 201
    And the calculated risk level is "HIGH"
    And the response includes a risk score
