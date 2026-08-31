from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductCategoryViewSet, UnitViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("product-categories", ProductCategoryViewSet, basename="product-category")
router.register("units", UnitViewSet, basename="unit")

urlpatterns = router.urls
