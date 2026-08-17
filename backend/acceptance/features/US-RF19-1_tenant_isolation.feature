Feature: US-RF19-1 Company isolation (multi-tenant)
  As an administrator I want data to be isolated per company
  so that segregation between clients is enforced.

  Scenario: A user from another company cannot see other tenants' data
    Given an ARCO request registered by "dpo@datalegal.local"
    When "dpo.b@empresab.local" tries to read that ARCO request
    Then access is denied
