from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User, Role, Permission
from audit.models import AuditLog
from .models import BusinessSettings


def make_role(name, codenames):
    role = Role.objects.create(name=name, is_system_role=True)
    perms = [Permission.objects.get_or_create(codename=c)[0] for c in codenames]
    role.permissions.set(perms)
    return role


class BusinessSettingsTests(APITestCase):
    def setUp(self):
        self.admin_role = make_role("Owner/Admin", ["MANAGE_SETTINGS"])
        self.staff_role = make_role("Staff", ["VIEW_CUSTOMER"])
        self.admin = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.admin_role)
        self.staff = User.objects.create_user(username="staff1", password="StrongPass123!", role=self.staff_role)

    def _token(self, username):
        res = self.client.post("/api/auth/login/", {"username": username, "password": "StrongPass123!"})
        return res.data["access"]

    def test_any_authenticated_user_can_view_settings(self):
        token = self._token("staff1")
        res = self.client.get("/api/settings/business/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("name", res.data)

    def test_staff_cannot_update_settings(self):
        token = self._token("staff1")
        res = self.client.patch("/api/settings/business/", {"name": "Hacked Name"}, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_settings_and_it_persists(self):
        token = self._token("admin1")
        res = self.client.patch(
            "/api/settings/business/", {"name": "New Business Name", "gstin": "36ABCDE1234F1Z5"},
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        obj = BusinessSettings.load()
        self.assertEqual(obj.name, "New Business Name")
        self.assertEqual(obj.gstin, "36ABCDE1234F1Z5")

    def test_settings_update_is_audited(self):
        token = self._token("admin1")
        self.client.patch("/api/settings/business/", {"name": "Audited Name"}, HTTP_AUTHORIZATION=f"Bearer {token}")
        log = AuditLog.objects.filter(action="UPDATE_BUSINESS_SETTINGS").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.admin.id)
        self.assertEqual(log.new_value["name"], "Audited Name")

    def test_settings_singleton_stays_single_row(self):
        BusinessSettings.load()
        BusinessSettings.load()
        self.assertEqual(BusinessSettings.objects.count(), 1)
