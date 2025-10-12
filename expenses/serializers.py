from rest_framework import serializers
from .models import Company, PaymentForm, ExpenseType, Expense


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""

    class Meta:
        model = Company
        fields = ['id', 'name', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class PaymentFormSerializer(serializers.ModelSerializer):
    """Serializer for PaymentForm model"""

    class Meta:
        model = PaymentForm
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseTypeSerializer(serializers.ModelSerializer):
    """Serializer for ExpenseType model"""

    class Meta:
        model = ExpenseType
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Serializer for Expense model with dual currency support.
    Provides nested read representations for related objects.
    """
    # Nested read-only fields for better display
    company_detail = CompanySerializer(source='company', read_only=True)
    payment_form_detail = PaymentFormSerializer(source='payment_form', read_only=True)
    expense_type_detail = ExpenseTypeSerializer(source='expense_type', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id',
            'date',
            'description',
            'amount_eur',
            'amount_pyg',
            'company',
            'company_detail',
            'payment_form',
            'payment_form_detail',
            'expense_type',
            'expense_type_detail',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """
        Validate that at least one currency is filled and amounts are positive.
        """
        amount_eur = data.get('amount_eur')
        amount_pyg = data.get('amount_pyg')

        # Check if at least one currency is filled
        if not amount_eur and not amount_pyg:
            raise serializers.ValidationError({
                'amount_eur': 'At least one currency amount (EUR or PYG) must be filled.',
                'amount_pyg': 'At least one currency amount (EUR or PYG) must be filled.'
            })

        # Validate EUR is positive if filled
        if amount_eur is not None and amount_eur <= 0:
            raise serializers.ValidationError({
                'amount_eur': 'Amount in EUR must be greater than zero.'
            })

        # Validate PYG is positive if filled
        if amount_pyg is not None and amount_pyg <= 0:
            raise serializers.ValidationError({
                'amount_pyg': 'Amount in PYG must be greater than zero.'
            })

        return data


class ExpenseListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for expense list view (less data for performance).
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    payment_form_name = serializers.CharField(source='payment_form.name', read_only=True)
    expense_type_name = serializers.CharField(source='expense_type.name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id',
            'date',
            'description',
            'amount_eur',
            'amount_pyg',
            'company_name',
            'payment_form_name',
            'expense_type_name',
        ]
