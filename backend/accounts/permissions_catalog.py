"""
Single source of truth for every permission codename in the system.
Used by the seed command to populate the Permission table, and referenced
by name (not re-typed) in view-level permission checks to avoid typos
silently disabling a security check.
"""

PERMISSION_CATALOG = [
    # (codename, description)
    ("VIEW_CUSTOMER", "View customer records"),
    ("ADD_CUSTOMER", "Create a new customer"),
    ("UPDATE_CUSTOMER", "Edit an existing customer"),
    ("DELETE_CUSTOMER", "Delete/deactivate a customer"),

    ("VIEW_PRODUCT", "View product catalog"),
    ("ADD_PRODUCT", "Create a new product"),
    ("UPDATE_PRODUCT", "Edit an existing product"),
    ("DELETE_PRODUCT", "Delete/deactivate a product"),

    ("VIEW_SALE", "View sales"),
    ("ADD_SALE", "Create a sale"),
    ("UPDATE_SALE", "Edit an existing sale"),
    ("CANCEL_SALE", "Cancel a sale (reverses inventory, never hard-deletes)"),

    ("VIEW_PAYMENT", "View payments"),
    ("ADD_PAYMENT", "Record a payment"),
    ("UPDATE_PAYMENT", "Edit a payment record"),
    ("REVERSE_PAYMENT", "Reverse a payment (never hard-deletes)"),

    ("VIEW_EXPENSE", "View expenses"),
    ("ADD_EXPENSE", "Record an expense"),
    ("UPDATE_EXPENSE", "Edit an expense"),
    ("CANCEL_EXPENSE", "Cancel an expense"),

    ("VIEW_INVENTORY", "View stock levels and movements"),
    ("ADD_STOCK", "Record a purchase / stock addition"),
    ("ADJUST_STOCK", "Make a manual stock adjustment"),

    ("VIEW_REPORT", "View reports"),
    ("EXPORT_REPORT", "Export reports (CSV/Excel)"),

    ("VIEW_AUDIT_LOG", "View the audit log"),

    ("MANAGE_USERS", "Create/edit users"),
    ("MANAGE_ROLES", "Create/edit roles and their permissions"),
    ("MANAGE_SETTINGS", "Edit business settings"),

    ("VIEW_SUPPLIER", "View suppliers"),
    ("ADD_SUPPLIER", "Create a supplier"),
    ("UPDATE_SUPPLIER", "Edit a supplier"),

    ("VIEW_PURCHASE", "View purchases"),
    ("ADD_PURCHASE", "Record a purchase"),
]

# Default role -> permission-codename mapping used by the seed command.
DEFAULT_ROLE_PERMISSIONS = {
    "Owner/Admin": [p[0] for p in PERMISSION_CATALOG],  # everything
    "Manager": [
        "VIEW_CUSTOMER", "ADD_CUSTOMER", "UPDATE_CUSTOMER",
        "VIEW_PRODUCT", "ADD_PRODUCT", "UPDATE_PRODUCT",
        "VIEW_SALE", "ADD_SALE", "UPDATE_SALE", "CANCEL_SALE",
        "VIEW_PAYMENT", "ADD_PAYMENT", "UPDATE_PAYMENT",
        "VIEW_EXPENSE", "ADD_EXPENSE", "UPDATE_EXPENSE",
        "VIEW_INVENTORY", "ADD_STOCK", "ADJUST_STOCK",
        "VIEW_REPORT", "EXPORT_REPORT",
        "VIEW_SUPPLIER", "ADD_SUPPLIER", "UPDATE_SUPPLIER",
        "VIEW_PURCHASE", "ADD_PURCHASE",
    ],
    "Staff": [
        "VIEW_CUSTOMER", "ADD_CUSTOMER",
        "VIEW_PRODUCT",
        "VIEW_SALE", "ADD_SALE",
        "VIEW_PAYMENT", "ADD_PAYMENT",
        "VIEW_INVENTORY",
    ],
    "Viewer": [
        "VIEW_CUSTOMER", "VIEW_PRODUCT", "VIEW_SALE", "VIEW_PAYMENT",
        "VIEW_EXPENSE", "VIEW_INVENTORY", "VIEW_REPORT", "VIEW_SUPPLIER", "VIEW_PURCHASE",
    ],
}
