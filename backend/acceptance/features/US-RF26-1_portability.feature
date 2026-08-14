Feature: US-RF26-1 Portability in an interoperable format
  As a DPO I want to handle portability requests
  so that I can deliver the data subject's data in an interoperable format.

  Scenario: The DPO registers, completes and exports a portability request
    Given I am authenticated as "dpo@datalegal.local"
    When I register a portability request for "Maria Torres"
    Then the response status is 201
    When I complete the portability request
    And I export the data subject's data
    Then the response status is 200
    And I receive the data in interoperable format "RFC8259"
