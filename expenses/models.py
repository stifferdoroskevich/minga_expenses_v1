from django.db import models
from django.core.exceptions import ValidationError


class Company(models.Model):
    """Master list of companies/merchants where expenses are made"""
    name = models.CharField(max_length=200, unique=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']

    def __str__(self):
        return self.name


class PaymentForm(models.Model):
    """Master list of payment forms (Formas de pago): Cash, Credit Card, Debit Card, Bank Transfer, etc."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Form"
        verbose_name_plural = "Payment Forms"
        ordering = ['name']

    def __str__(self):
        return self.name


class ExpenseType(models.Model):
    """Master list of expense types (Tipos de gasto): Food, Transport, Utilities, Entertainment, etc."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Expense Type"
        verbose_name_plural = "Expense Types"
        ordering = ['name']

    def __str__(self):
        return self.name


class Expense(models.Model):
    """
    Expense transactions with dual currency support (EUR and PYG).
    At least one currency must be filled.
    """
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    amount_eur = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Amount (EUR)",
        help_text="Amount in Euros"
    )
    amount_pyg = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        blank=True,
        null=True,
        verbose_name="Amount (PYG)",
        help_text="Amount in Paraguayan Guaraníes"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name='expenses'
    )
    payment_form = models.ForeignKey(
        PaymentForm,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Payment Form (FP)"
    )
    expense_type = models.ForeignKey(
        ExpenseType,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Expense Type (Tipo)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['company']),
            models.Index(fields=['payment_form']),
            models.Index(fields=['expense_type']),
        ]

    def clean(self):
        """Validate that at least one currency is filled and amounts are positive"""
        # Check if at least one currency is filled
        if not self.amount_eur and not self.amount_pyg:
            raise ValidationError({
                'amount_eur': 'At least one currency amount (EUR or PYG) must be filled.',
                'amount_pyg': 'At least one currency amount (EUR or PYG) must be filled.'
            })

        # Validate EUR amount is positive if filled
        if self.amount_eur is not None and self.amount_eur <= 0:
            raise ValidationError({
                'amount_eur': 'Amount in EUR must be greater than zero.'
            })

        # Validate PYG amount is positive if filled
        if self.amount_pyg is not None and self.amount_pyg <= 0:
            raise ValidationError({
                'amount_pyg': 'Amount in PYG must be greater than zero.'
            })

    def save(self, *args, **kwargs):
        """Override save to call full_clean for validation"""
        # Skip validation if being used in bulk_create
        if not kwargs.pop('skip_validation', False):
            self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        amounts = []
        if self.amount_eur:
            amounts.append(f"€{self.amount_eur}")
        if self.amount_pyg:
            amounts.append(f"₲{self.amount_pyg:,.0f}")
        amount_str = " / ".join(amounts)
        return f"{self.date} - {self.company.name} - {amount_str}"
