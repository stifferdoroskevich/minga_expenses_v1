from django.contrib import admin
from .models import Company, PaymentForm, ExpenseType, Expense


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)

    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentForm)
class PaymentFormAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)

    fieldsets = (
        ('Payment Form Information', {
            'fields': ('name', 'description')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ExpenseType)
class ExpenseTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)

    fieldsets = (
        ('Expense Type Information', {
            'fields': ('name', 'description')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('date', 'company', 'expense_type', 'payment_form',
                    'amount_eur', 'amount_pyg', 'short_description')
    list_filter = ('date', 'company', 'expense_type', 'payment_form')
    search_fields = ('description', 'company__name')
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-date', '-created_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('date', 'company', 'expense_type', 'payment_form')
        }),
        ('Amounts', {
            'fields': ('amount_eur', 'amount_pyg'),
            'description': 'Enter at least one currency amount (EUR or PYG)'
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def short_description(self, obj):
        """Display a shortened version of the description in the list view"""
        if obj.description and len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description or ""
    short_description.short_description = 'Description'
