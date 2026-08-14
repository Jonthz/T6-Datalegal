Feature: US-RF41-1 Tenant provisioning
  As a platform super-administrator I want to provision companies
  so that I can onboard new clients with their first administrator.

  Scenario: The platform owner provisions a new company
    Given I am authenticated as "owner@datalegal.local"
    When I provision a new tenant "New Corporation Inc."
    Then the response status is 201
    And the tenant is created with its administrator
