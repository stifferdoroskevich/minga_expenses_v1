from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Company, PaymentForm, ExpenseType, Expense
from .serializers import (
    CompanySerializer,
    PaymentFormSerializer,
    ExpenseTypeSerializer,
    ExpenseSerializer,
    ExpenseListSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company model.
    Provides CRUD operations for companies.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class PaymentFormViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PaymentForm model.
    Provides CRUD operations for payment forms.
    """
    queryset = PaymentForm.objects.all()
    serializer_class = PaymentFormSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ExpenseType model.
    Provides CRUD operations for expense types.
    """
    queryset = ExpenseType.objects.all()
    serializer_class = ExpenseTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense model with dual currency support.
    Provides CRUD operations and advanced filtering.

    Filters:
    - date: exact date
    - date__gte: date greater than or equal
    - date__lte: date less than or equal
    - company: filter by company ID
    - payment_form: filter by payment form ID
    - expense_type: filter by expense type ID
    - has_eur: filter expenses with EUR amount (true/false)
    - has_pyg: filter expenses with PYG amount (true/false)

    Search: description, company name
    Ordering: date, amount_eur, amount_pyg, created_at
    """
    queryset = Expense.objects.select_related(
        'company',
        'payment_form',
        'expense_type'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte'],
        'company': ['exact'],
        'payment_form': ['exact'],
        'expense_type': ['exact'],
    }
    search_fields = ['description', 'company__name']
    ordering_fields = ['date', 'amount_eur', 'amount_pyg', 'created_at', 'company__name', 'expense_type__name', 'payment_form__name']
    ordering = ['-date', '-created_at']

    def get_serializer_class(self):
        """
        Use simplified serializer for list view, detailed for others.
        """
        if self.action == 'list':
            return ExpenseListSerializer
        return ExpenseSerializer

    def get_queryset(self):
        """
        Custom queryset to filter by currency presence.
        """
        queryset = super().get_queryset()

        # Filter by EUR presence
        has_eur = self.request.query_params.get('has_eur')
        if has_eur is not None:
            if has_eur.lower() == 'true':
                queryset = queryset.exclude(amount_eur__isnull=True)
            elif has_eur.lower() == 'false':
                queryset = queryset.filter(amount_eur__isnull=True)

        # Filter by PYG presence
        has_pyg = self.request.query_params.get('has_pyg')
        if has_pyg is not None:
            if has_pyg.lower() == 'true':
                queryset = queryset.exclude(amount_pyg__isnull=True)
            elif has_pyg.lower() == 'false':
                queryset = queryset.filter(amount_pyg__isnull=True)

        return queryset
