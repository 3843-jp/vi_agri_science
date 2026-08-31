from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import User, Role
from customers.models import Customer
from products.models import Product, ProductCategory, Unit
from purchases.models import Supplier
from inventory.models import InventoryMovement


class Command(BaseCommand):
    """
    DEMO DATA ONLY — makes the dashboard/UI look populated for development
    and evaluation. This is fictional data (Section 44/43) and must be
    removed before any real business goes live on this system. Running
    this command a second time is safe (idempotent via get_or_create).
    """
    help = "Seed demo users, products, and customers. NOT for production."

    @transaction.atomic
    def handle(self, *args, **options):
        # --- Users ---
        owner_role = Role.objects.get(name="Owner/Admin")
        staff_role = Role.objects.get(name="Staff")

        if not User.objects.filter(username="owner").exists():
            owner = User.objects.create_superuser(username="owner", email="owner@viagriscience.test", password="ChangeMe123!")
            owner.role = owner_role
            owner.first_name = "Business"
            owner.last_name = "Owner"
            owner.save()
            self.stdout.write(self.style.SUCCESS("Created superuser 'owner' / password: ChangeMe123!"))

        if not User.objects.filter(username="staff1").exists():
            staff = User.objects.create_user(username="staff1", email="staff1@viagriscience.test", password="ChangeMe123!")
            staff.role = staff_role
            staff.first_name = "Ravi"
            staff.last_name = "Kumar"
            staff.save()
            self.stdout.write(self.style.SUCCESS("Created staff user 'staff1' / password: ChangeMe123!"))

        # --- Product taxonomy ---
        cat_names = ["Fertilizer", "Insecticide", "Fungicide", "Herbicide", "PGR", "Seeds"]
        categories = {}
        for name in cat_names:
            cat, _ = ProductCategory.objects.get_or_create(name=name)
            categories[name] = cat

        unit_bag, _ = Unit.objects.get_or_create(name="Bag", defaults={"abbreviation": "bag"})
        unit_ltr, _ = Unit.objects.get_or_create(name="Litre", defaults={"abbreviation": "L"})
        unit_kg, _ = Unit.objects.get_or_create(name="Kilogram", defaults={"abbreviation": "kg"})

        supplier, _ = Supplier.objects.get_or_create(
            name="Krishna AgriChem Distributors", defaults={"phone": "9876543210"},
        )

        demo_products = [
            ("SKU-UREA", "Urea", "Fertilizer", unit_bag, 700, 750, 20),
            ("SKU-DAP", "DAP", "Fertilizer", unit_bag, 1150, 1200, 15),
            ("SKU-MOP", "MOP (Potash)", "Fertilizer", unit_bag, 900, 950, 10),
            ("SKU-CHLOR", "Chlorpyrifos 20% EC", "Insecticide", unit_ltr, 320, 360, 5),
            ("SKU-MANCO", "Mancozeb 75% WP", "Fungicide", unit_kg, 280, 320, 5),
        ]
        for sku, name, cat_name, unit, pprice, sprice, min_stock in demo_products:
            product, created = Product.objects.get_or_create(
                sku=sku,
                defaults=dict(
                    name=name, category=categories[cat_name], unit=unit,
                    purchase_price=Decimal(pprice), selling_price=Decimal(sprice),
                    minimum_stock_level=Decimal(min_stock), supplier=supplier,
                ),
            )
            if created:
                InventoryMovement.objects.create(
                    product=product, movement_type="OPENING", quantity=Decimal(100),
                    notes="Demo opening stock",
                )

        # --- Customers ---
        demo_customers = [
            ("Ramesh Traders", "9000000001", "Ramesh Traders", "36ABCDE1234F1Z5"),
            ("Lakshmi Agro Center", "9000000002", "Lakshmi Agro Center", ""),
            ("Suresh Farmer", "9000000003", "", ""),
        ]
        for name, phone, business_name, gst in demo_customers:
            Customer.objects.get_or_create(
                phone=phone, defaults=dict(name=name, business_name=business_name, gst_number=gst),
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded (fictional — remove before production)."))
