Feature: US-RF07-1 ARCO request management with legal SLA
  As a DPO I want to register and track ARCO requests
  so that I meet the 30-day deadline required by the LOPDP.

  Scenario: The DPO registers an access request
    Given I am authenticated as "dpo@datalegal.local"
    When I register an ARCO request of type "ACCESS"
    Then the response status is 201
    And the request is created with ticket number "ARCO-"
    And the request is in status "RECEIVED"
    And the legal response deadline is 30 days
    And the SLA stoplight is "GREEN"
