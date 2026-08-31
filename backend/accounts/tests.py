"""
Section 28/29 of the Phase 9 spec: this is where "no automated test
suite" starts getting fixed. Tests hit the actual DRF API endpoints
directly (never through a mocked permission check) — the same rule the
rest of this project follows: the backend is the real security boundary,
so that's what gets tested.
"""
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User, Role, Permission


def make_role(name, codenames, is_system_role=True):
    role = Role.objects.create(name=name, is_system_role=is_system_role)
    perms = []
    for code in codenames:
        perm, _ = Permission.objects.get_or_create(codename=code)
        perms.append(perm)
    role.permissions.set(perms)
    return role


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.role = make_role("TestRole", ["VIEW_CUSTOMER"])
        self.user = User.objects.create_user(username="bob", password="StrongPass123!", role=self.role)

    def test_login_success(self):
        res = self.client.post("/api/auth/login/", {"username": "bob", "password": "StrongPass123!"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["username"], "bob")

    def test_login_wrong_password(self):
        res = self.client.post("/api/auth/login/", {"username": "bob", "password": "WrongPassword"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_login(self):
        """Section 20/29: a deactivated user must never be able to authenticate."""
        self.user.is_active = False
        self.user.save()
        res = self.client.post("/api/auth/login/", {"username": "bob", "password": "StrongPass123!"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_rotation_blacklists_old_token(self):
        """Regression test for a real bug found during the Phase 9 audit:
        BLACKLIST_AFTER_ROTATION was set but rest_framework_simplejwt.token_blacklist
        wasn't installed, so rotated refresh tokens never actually got
        invalidated. Fixed; this test guards against it silently breaking again."""
        login = self.client.post("/api/auth/login/", {"username": "bob", "password": "StrongPass123!"})
        old_refresh = login.data["refresh"]

        first = self.client.post("/api/auth/refresh/", {"refresh": old_refresh})
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        reuse = self.client.post("/api/auth/refresh/", {"refresh": old_refresh})
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)


class PermissionEnforcementTests(APITestCase):
    """Section 29: verify these through the API directly, not through React."""

    def setUp(self):
        self.admin_role = make_role("Owner/Admin", ["MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SETTINGS", "VIEW_AUDIT_LOG"])
        self.staff_role = make_role("Staff", ["VIEW_CUSTOMER"])
        self.admin = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.admin_role)
        self.staff = User.objects.create_user(username="staff1", password="StrongPass123!", role=self.staff_role)

    def _login(self, username, password="StrongPass123!"):
        res = self.client.post("/api/auth/login/", {"username": username, "password": password})
        return res.data["access"]

    def test_staff_cannot_access_user_management(self):
        token = self._login("staff1")
        res = self.client.get("/api/users/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_roles(self):
        token = self._login("staff1")
        res = self.client.get("/api/roles/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_view_audit_logs(self):
        token = self._login("staff1")
        res = self.client.get("/api/audit-logs/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_update_business_settings(self):
        token = self._login("staff1")
        res = self.client.patch("/api/settings/business/", {"name": "Hacked"}, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_user_management(self):
        token = self._login("admin1")
        res = self.client.get("/api/users/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_request_rejected(self):
        res = self.client.get("/api/users/")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class UserManagementTests(APITestCase):
    def setUp(self):
        self.admin_role = make_role("Owner/Admin", ["MANAGE_USERS", "VIEW_AUDIT_LOG"])
        self.staff_role = make_role("Staff", ["VIEW_CUSTOMER"])
        self.admin = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.admin_role)
        login = self.client.post("/api/auth/login/", {"username": "admin1", "password": "StrongPass123!"})
        self.token = login.data["access"]

    def _auth(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_create_user(self):
        res = self.client.post("/api/users/", {
            "username": "newstaff", "password": "AnotherStrongPass1",
            "email": "newstaff@example.com", "role": self.staff_role.id,
        }, **self._auth())
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newstaff").exists())

    def test_user_deactivation_soft_deletes(self):
        target = User.objects.create_user(username="target", password="x", role=self.staff_role)
        res = self.client.delete(f"/api/users/{target.id}/", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        target.refresh_from_db()
        self.assertFalse(target.is_active)
        self.assertTrue(User.objects.filter(id=target.id).exists())  # never hard-deleted

    def test_cannot_deactivate_last_admin(self):
        """Section 19: the system must never be left with zero MANAGE_USERS holders."""
        res = self.client.delete(f"/api/users/{self.admin.id}/", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_deactivation_allowed_when_another_admin_exists(self):
        second_admin = User.objects.create_user(username="admin2", password="x", role=self.admin_role)
        res = self.client.delete(f"/api/users/{self.admin.id}/", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_reactivate_user(self):
        target = User.objects.create_user(username="target", password="x", role=self.staff_role, is_active=False, is_active_employee=False)
        res = self.client.post(f"/api/users/{target.id}/reactivate/", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        self.assertTrue(target.is_active)

    def test_user_actions_are_audited(self):
        res = self.client.post("/api/users/", {
            "username": "audited_user", "password": "AnotherStrongPass1", "role": self.staff_role.id,
        }, **self._auth())
        new_user_id = res.data["id"]
        audit_res = self.client.get(f"/api/audit-logs/?entity_type=User&action=CREATE_USER", **self._auth())
        matching = [r for r in audit_res.data["results"] if r["entity_id"] == str(new_user_id)]
        self.assertTrue(len(matching) >= 1)
        self.assertEqual(matching[0]["username"], "admin1")


class DataIntegrityOnDeactivationTests(APITestCase):
    """Section 26/30: deactivating a user must never remove or orphan
    their historical records."""

    def setUp(self):
        self.admin_role = make_role("Owner/Admin", ["MANAGE_USERS", "VIEW_CUSTOMER", "ADD_CUSTOMER"])
        self.admin = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.admin_role)
        login = self.client.post("/api/auth/login/", {"username": "admin1", "password": "StrongPass123!"})
        self.token = login.data["access"]

    def test_deactivating_user_preserves_audit_attribution(self):
        from audit.models import AuditLog
        # admin1 creates a customer, generating an audit entry attributed to them
        self.client.post("/api/customers/", {"name": "Test Co", "phone": "9000000000"}, HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Deactivate admin1 via a second admin so the safety check doesn't block it
        second_admin = User.objects.create_user(username="admin2", password="x", role=self.admin_role)
        login2 = self.client.post("/api/auth/login/", {"username": "admin2", "password": "x"})
        token2 = login2.data["access"]
        self.client.delete(f"/api/users/{self.admin.id}/", HTTP_AUTHORIZATION=f"Bearer {token2}")

        # The audit entry must still reference the now-deactivated user
        log = AuditLog.objects.filter(action="CREATE_CUSTOMER").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.admin.id)
