from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
def home(request):
    return HttpResponse("Backend is running successfully!")

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("customers.urls")),
    path("api/", include("products.urls")),
    path("api/", include("sales.urls")),
    path("api/", include("payments.urls")),
    path("api/", include("inventory.urls")),
    path("api/", include("purchases.urls")),
    path("api/", include("expenses.urls")),
    path("api/", include("audit.urls")),
    path("api/", include("core.urls")),
]
