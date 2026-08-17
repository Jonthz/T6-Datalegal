Feature: US-RF32-1 Explicit and immutable consent revocation
  As a data subject I want to revoke my consent
  so that it is recorded immutably with a date and reason.

  Scenario: The revocation is recorded and cannot be repeated
    Given I am authenticated as "dpo@datalegal.local"
    And a registered consent
    When I revoke the consent with reason "The data subject withdrew consent"
    Then the response status is 200
    And the consent is revoked with a date
    When I try to revoke the same consent again
    Then the second revocation is rejected
