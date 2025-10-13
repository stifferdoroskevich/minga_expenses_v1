from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet,
    PaymentFormViewSet,
    ExpenseTypeViewSet,
    ExpenseViewSet
)
from .auth_views import login, logout, user_info
from .analytics_views import (
    monthly_totals,
    totals_by_company,
    totals_by_payment_form,
    totals_by_expense_type,
    summary,
    export_csv
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'payment-forms', PaymentFormViewSet, basename='paymentform')
router.register(r'expense-types', ExpenseTypeViewSet, basename='expensetype')
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
    # Authentication endpoints
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/user/', user_info, name='user_info'),
    # Analytics endpoints
    path('analytics/monthly/', monthly_totals, name='analytics-monthly'),
    path('analytics/by-company/', totals_by_company, name='analytics-by-company'),
    path('analytics/by-payment-form/', totals_by_payment_form, name='analytics-by-payment-form'),
    path('analytics/by-expense-type/', totals_by_expense_type, name='analytics-by-expense-type'),
    path('analytics/summary/', summary, name='analytics-summary'),
    path('analytics/export-csv/', export_csv, name='analytics-export-csv'),
]
