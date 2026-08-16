Feature: US-RF02-1 User authentication
  As a user I want to authenticate with valid credentials
  so that I can access the platform securely.

  Scenario: A user with valid credentials logs in
    When I log in as "dpo@datalegal.local" with password "Admin123!"
    Then the response status is 200
    And I receive an access token with role "DPO"
