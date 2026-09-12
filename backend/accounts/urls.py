from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CsrfTokenView, LoginView, LogoutView, MeView, RefreshView, UserViewSet, RoleViewSet, PermissionListView

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf_token"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("permissions/", PermissionListView.as_view(), name="permission-list"),
] + router.urls
