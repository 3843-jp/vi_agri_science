from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import Permission, Role, RolePermission
from accounts.permissions_catalog import PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS


class Command(BaseCommand):
    """
    Seeds the Permission catalog and default Roles (Owner/Admin, Manager,
    Staff, Viewer). This is NOT demo data — it's required system
    configuration and should be run on every fresh install, including
    production (see Section 43: seed scripts vs. real data are kept
    separate; this command is the "system config" category, not "fake data").
    """
    help = "Seed the permission catalog and default system roles."

    @transaction.atomic
    def handle(self, *args, **options):
        for codename, description in PERMISSION_CATALOG:
            Permission.objects.get_or_create(codename=codename, defaults={"description": description})
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(PERMISSION_CATALOG)} permissions."))

        for role_name, codes in DEFAULT_ROLE_PERMISSIONS.items():
            role, _ = Role.objects.get_or_create(
                name=role_name, defaults={"is_system_role": True, "description": f"System role: {role_name}"}
            )
            perms = Permission.objects.filter(codename__in=codes)
            role.permissions.set(perms)
            self.stdout.write(self.style.SUCCESS(f"Role '{role_name}' -> {perms.count()} permissions."))
