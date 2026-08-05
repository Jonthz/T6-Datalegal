"""Tests for tenant provisioning and tenant isolation."""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


class TestTenantProvisioning:
    """TestTenantProvisioning schema/model definition."""
    def test_provision_tenant_as_platform_owner(self, client: TestClient, platform_owner_token):
        """Test that provision tenant as platform owner behaves as expected."""
        resp = client.post(
            "/api/v1/tenants/provision",
            json={
                "tenant": {
                    "name": "New Corp",
                    "ruc": "1111111111001",
                    "country": "Ecuador",
                    "sector": "Tech",
                },
                "admin_user": {
                    "email": "firstdpo@newcorp.com",
                    "password": "Secure@Pass1!",
                    "full_name": "First DPO",
                    "role": "DPO",
                },
            },
            headers=auth_headers(platform_owner_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["tenant"]["name"] == "New Corp"
        assert data["admin_user"]["role"] == "DPO"
        assert data["admin_user"]["tenant_id"] == data["tenant"]["id"]

    def test_provision_tenant_duplicate_ruc(self, client: TestClient, platform_owner_token):
        """Test that provision tenant duplicate ruc behaves as expected."""
        client.post(
            "/api/v1/tenants/provision",
            json={
                "tenant": {"name": "First Corp", "ruc": "2222222222001"},
                "admin_user": {
                    "email": "adm1@first.com",
                    "password": "Secure@Pass1!",
                    "full_name": "Admin",
                    "role": "DPO",
                },
            },
            headers=auth_headers(platform_owner_token),
        )
        # Try same RUC again
        resp = client.post(
            "/api/v1/tenants/provision",
            json={
                "tenant": {"name": "Second Corp", "ruc": "2222222222001"},
                "admin_user": {
                    "email": "adm2@second.com",
                    "password": "Secure@Pass1!",
                    "full_name": "Admin2",
                    "role": "DPO",
                },
            },
            headers=auth_headers(platform_owner_token),
        )
        assert resp.status_code == 409

    def test_provision_tenant_tenant_admin_forbidden(self, client: TestClient, admin_token):
        """Test that tenant admin cannot provision tenants."""
        resp = client.post(
            "/api/v1/tenants/provision",
            json={
                "tenant": {"name": "Unauthorized", "ruc": "3333333333001"},
                "admin_user": {
                    "email": "unauth@test.com",
                    "password": "Secure@Pass1!",
                    "full_name": "Unauth",
                    "role": "DPO",
                },
            },
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 403

    def test_provision_tenant_super_admin_forbidden(self, client: TestClient, super_admin_token):
        """Tenant-scoped SUPER_ADMIN is not a platform owner."""
        resp = client.post(
            "/api/v1/tenants/provision",
            json={
                "tenant": {"name": "Unauthorized", "ruc": "4444444444001"},
                "admin_user": {
                    "email": "tenant-super@test.com",
                    "password": "Secure@Pass1!",
                    "full_name": "Tenant Super",
                    "role": "DPO",
                },
            },
            headers=auth_headers(super_admin_token),
        )
        assert resp.status_code == 403

    def test_list_tenants_as_platform_owner(self, client: TestClient, platform_owner_token, tenant_a):  # pylint: disable=unused-argument
        """Test that list tenants as platform owner behaves as expected."""
        resp = client.get("/api/v1/tenants", headers=auth_headers(platform_owner_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_list_tenants_tenant_super_admin_forbidden(self, client: TestClient, super_admin_token):
        """Tenant-scoped SUPER_ADMIN cannot list tenants."""
        resp = client.get("/api/v1/tenants", headers=auth_headers(super_admin_token))
        assert resp.status_code == 403

    def test_list_tenants_non_platform_forbidden(self, client: TestClient, admin_token):
        """Test that list tenants non platform forbidden behaves as expected."""
        resp = client.get("/api/v1/tenants", headers=auth_headers(admin_token))
        assert resp.status_code == 403


class TestTenantIsolation:
    """TestTenantIsolation schema/model definition."""
    def test_tenant_a_cannot_see_tenant_b_users(
        self, client: TestClient, admin_token, tenant_b_user, tenant_b_token, session  # pylint: disable=unused-argument
    ):
        """User from tenant A cannot access users from tenant B."""
        # tenant B user exists
        tb_id = tenant_b_user.id

        # Admin from tenant A tries to get tenant B's user directly
        resp = client.get(f"/api/v1/users/{tb_id}", headers=auth_headers(admin_token))
        assert resp.status_code == 404  # Not found in tenant A's scope

    def test_tenant_b_user_sees_only_own_users(
        self, client: TestClient, tenant_b_token, tenant_b, tenant_b_user, session  # pylint: disable=unused-argument
    ):
        """Tenant B admin lists users — should only see tenant B users."""
        resp = client.get("/api/v1/users", headers=auth_headers(tenant_b_token))
        assert resp.status_code == 200
        users = resp.json()
        # All returned users must belong to tenant B
        for u in users:
            assert u["tenant_id"] == tenant_b.id

    def test_super_admin_cannot_override_tenant_scope(
        self, client: TestClient, super_admin_token, tenant_b, tenant_b_user
    ):
        """Tenant-scoped SUPER_ADMIN cannot use ?tenant_id to access another tenant."""
        resp = client.get(
            f"/api/v1/users/{tenant_b_user.id}?tenant_id={tenant_b.id}",
            headers=auth_headers(super_admin_token),
        )
        assert resp.status_code == 403
