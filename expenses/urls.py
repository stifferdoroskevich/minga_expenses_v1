from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet,
    PaymentFormViewSet,
    ExpenseTypeViewSet,
    ExpenseViewSet
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'payment-forms', PaymentFormViewSet, basename='paymentform')
router.register(r'expense-types', ExpenseTypeViewSet, basename='expensetype')
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
