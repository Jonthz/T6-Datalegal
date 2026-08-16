Feature: US-RF31-1 Consolidated ROPA report
  As a DPO I want to generate the ROPA
  so that I formally comply with the record of processing activities required by law.

  Scenario: The DPO generates and downloads the ROPA
    Given I am authenticated as "dpo@datalegal.local"
    And a treatment activity "Customer management"
    When I generate the ROPA report
    Then the ROPA report is generated successfully
    When I download the ROPA as PDF
    Then I get a PDF document
