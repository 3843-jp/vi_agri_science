"""
Section 3/28: verify the full data-integrity chain automatically, not just
manually via curl. This is the single most important guarantee in the
system — a Sale is never just one row.
"""
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User, Role, Permission
from customers.models import Customer
from products.models import Product, ProductCategory, Unit
from inventory.models import InventoryMovement
from audit.models import AuditLog
from .models import Sale


def make_role(name, codenames):
    role = Role.objects.create(name=name, is_system_role=True)
    perms = [Permission.objects.get_or_create(codename=c)[0] for c in codenames]
    role.permissions.set(perms)
    return role


class SaleDataIntegrityChainTests(APITestCase):
    def setUp(self):
        self.role = make_role("Owner/Admin", ["ADD_SALE", "CANCEL_SALE", "UPDATE_SALE", "VIEW_SALE"])
        self.user = User.objects.create_user(username="admin1", password="StrongPass123!", role=self.role)
        login = self.client.post("/api/auth/login/", {"username": "admin1", "password": "StrongPass123!"})
        self.token = login.data["access"]

        self.customer = Customer.objects.create(name="Test Customer", phone="9000000000")
        cat = ProductCategory.objects.create(name="Fertilizer")
        unit = Unit.objects.create(name="Bag")
        self.product = Product.objects.create(
            sku="SKU-CHAIN", name="Chain Test Product", category=cat, unit=unit,
            purchase_price="100", selling_price="150",
        )
        InventoryMovement.objects.create(product=self.product, movement_type="OPENING", quantity=100)

    def _auth(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_sale_creation_produces_full_chain(self):
        res = self.client.post("/api/sales/", {
            "customer": self.customer.id,
            "items_input": [{"product": self.product.id, "quantity": "10", "unit_price": "150"}],
        }, format="json", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        sale_id = res.data["id"]

        sale = Sale.objects.get(id=sale_id)
        self.assertEqual(sale.items.count(), 1)
        self.assertEqual(str(sale.total_amount), "1500.00")

        # Inventory correctly deducted
        self.assertEqual(self.product.current_stock(), 90)

        # Audit trail exists and is attributed correctly
        log = AuditLog.objects.filter(action="CREATE_SALE", entity_id=str(sale_id)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.user.id)

    def test_sale_cancellation_reverses_inventory_and_audits(self):
        create_res = self.client.post("/api/sales/", {
            "customer": self.customer.id,
            "items_input": [{"product": self.product.id, "quantity": "10", "unit_price": "150"}],
        }, format="json", **self._auth())
        sale_id = create_res.data["id"]
        self.assertEqual(self.product.current_stock(), 90)

        cancel_res = self.client.post(f"/api/sales/{sale_id}/cancel/", {"reason": "test cancellation"}, **self._auth())
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.assertEqual(self.product.current_stock(), 100)  # fully reversed
        sale = Sale.objects.get(id=sale_id)
        self.assertEqual(sale.status, "cancelled")
        self.assertTrue(AuditLog.objects.filter(action="CANCEL_SALE", entity_id=str(sale_id)).exists())

    def test_insufficient_stock_rejected_atomically(self):
        res = self.client.post("/api/sales/", {
            "customer": self.customer.id,
            "items_input": [{"product": self.product.id, "quantity": "999", "unit_price": "150"}],
        }, format="json", **self._auth())
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.product.current_stock(), 100)  # unchanged — nothing partially applied
        self.assertEqual(Sale.objects.count(), 0)  # no orphaned Sale row left behind
