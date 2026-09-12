"""Section 13/29: audit logs must be append-only from every API user's
perspective, including an Owner/Admin — enforced by AuditLogViewSet being
a ReadOnlyModelViewSet with no write actions registered at all. These
tests confirm that at the HTTP level, not just by reading the code."""
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User, Role, Permission
from .models import AuditLog


def make_role(name, codenames):
    role = Role.objects.create(name=name, is_system_role=True)
    perms = [Permission.objects.get_or_create(codename=c)[0] for c in codenames]
    role.permissions.set(perms)
    return role


class AuditLogImmutabilityTests(APITestCase):
    def setUp(self):
        self.admin_role = make_role("Owner/Admin", ["VIEW_AUDIT_LOG", "MANAGE_USERS"])
        self.admin = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.admin_role)
        login = self.client.post("/api/auth/login/", {"username": "admin1", "password": "StrongPass123!"})
        self.token = login.data["access"]
        self.log = AuditLog.objects.create(user=self.admin, action="CREATE_CUSTOMER", entity_type="Customer", entity_id="1")

    def _auth(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_cannot_delete_audit_log_even_as_admin(self):
        res = self.client.delete(f"/api/audit-logs/{self.log.id}/", **self._auth())
        self.assertIn(res.status_code, (status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND))
        self.assertTrue(AuditLog.objects.filter(id=self.log.id).exists())

    def test_cannot_update_audit_log_even_as_admin(self):
        res = self.client.patch(f"/api/audit-logs/{self.log.id}/", {"action": "TAMPERED"}, **self._auth())
        self.assertIn(res.status_code, (status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND))
        self.log.refresh_from_db()
        self.assertEqual(self.log.action, "CREATE_CUSTOMER")

    def test_can_view_audit_log_with_permission(self):
        res = self.client.get("/api/audit-logs/", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class AuditCompletenessTests(APITestCase):
    """Section 14: spot-check that key mutations actually produce an
    audit entry, across a representative module from each area rather
    than every single endpoint."""

    def setUp(self):
        self.role = make_role("Owner/Admin", [
            "MANAGE_USERS", "VIEW_AUDIT_LOG", "ADD_CUSTOMER", "ADD_SALE",
            "VIEW_PRODUCT", "ADD_PRODUCT",
        ])
        self.user = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.role)
        login = self.client.post("/api/auth/login/", {"username": "admin1", "password": "StrongPass123!"})
        self.token = login.data["access"]

    def _auth(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_customer_creation_is_audited(self):
        self.client.post("/api/customers/", {"name": "Audit Test Co", "phone": "9111111111"}, **self._auth())
        self.assertTrue(AuditLog.objects.filter(action="CREATE_CUSTOMER").exists())

    def test_product_creation_is_audited(self):
        from products.models import ProductCategory, Unit
        cat = ProductCategory.objects.create(name="TestCat")
        unit = Unit.objects.create(name="TestUnit")
        self.client.post("/api/products/", {
            "sku": "SKU-AUDIT", "name": "Audit Product", "category": cat.id, "unit": unit.id,
            "purchase_price": "10", "selling_price": "15",
        }, **self._auth())
        self.assertTrue(AuditLog.objects.filter(action="CREATE_PRODUCT").exists())
