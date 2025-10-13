from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from .models import Expense
from datetime import datetime
import csv


@api_view(['GET'])
def monthly_totals(request):
    """
    Get monthly expense totals, separated by currency.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    # Get date range from query params
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    queryset = Expense.objects.all()

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    # Aggregate by month
    monthly_data = queryset.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        total_eur=Sum('amount_eur'),
        total_pyg=Sum('amount_pyg'),
        count=Count('id')
    ).order_by('month')

    return Response(list(monthly_data))


@api_view(['GET'])
def totals_by_company(request):
    """
    Get expense totals grouped by company, separated by currency.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    queryset = Expense.objects.select_related('company')

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    company_data = queryset.values(
        'company__id',
        'company__name'
    ).annotate(
        total_eur=Sum('amount_eur'),
        total_pyg=Sum('amount_pyg'),
        count=Count('id')
    ).order_by('-total_eur', '-total_pyg')

    return Response(list(company_data))


@api_view(['GET'])
def totals_by_payment_form(request):
    """
    Get expense totals grouped by payment form, separated by currency.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    queryset = Expense.objects.select_related('payment_form')

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    payment_form_data = queryset.values(
        'payment_form__id',
        'payment_form__name'
    ).annotate(
        total_eur=Sum('amount_eur'),
        total_pyg=Sum('amount_pyg'),
        count=Count('id')
    ).order_by('-total_eur', '-total_pyg')

    return Response(list(payment_form_data))


@api_view(['GET'])
def totals_by_expense_type(request):
    """
    Get expense totals grouped by expense type, separated by currency.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    queryset = Expense.objects.select_related('expense_type')

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    expense_type_data = queryset.values(
        'expense_type__id',
        'expense_type__name'
    ).annotate(
        total_eur=Sum('amount_eur'),
        total_pyg=Sum('amount_pyg'),
        count=Count('id')
    ).order_by('-total_eur', '-total_pyg')

    return Response(list(expense_type_data))


@api_view(['GET'])
def summary(request):
    """
    Get overall summary statistics.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    queryset = Expense.objects.all()

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    # Calculate totals
    totals = queryset.aggregate(
        total_eur=Sum('amount_eur'),
        total_pyg=Sum('amount_pyg'),
        total_expenses=Count('id'),
        expenses_with_eur=Count('id', filter=Q(amount_eur__isnull=False)),
        expenses_with_pyg=Count('id', filter=Q(amount_pyg__isnull=False))
    )

    return Response(totals)


@api_view(['GET'])
def export_csv(request):
    """
    Export expenses to CSV format.
    Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), company, payment_form, expense_type
    """
    # Get filter parameters
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    company = request.query_params.get('company')
    payment_form = request.query_params.get('payment_form')
    expense_type = request.query_params.get('expense_type')

    # Build queryset with filters
    queryset = Expense.objects.select_related(
        'company',
        'payment_form',
        'expense_type'
    ).all()

    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)
    if company:
        queryset = queryset.filter(company_id=company)
    if payment_form:
        queryset = queryset.filter(payment_form_id=payment_form)
    if expense_type:
        queryset = queryset.filter(expense_type_id=expense_type)

    queryset = queryset.order_by('-date', '-created_at')

    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="expenses_export.csv"'

    writer = csv.writer(response)

    # Write header row
    writer.writerow([
        'Date',
        'Company',
        'Expense Type',
        'Payment Form',
        'Amount EUR',
        'Amount PYG',
        'Description',
    ])

    # Write data rows
    for expense in queryset:
        writer.writerow([
            expense.date,
            expense.company.name,
            expense.expense_type.name,
            expense.payment_form.name,
            expense.amount_eur if expense.amount_eur else '',
            expense.amount_pyg if expense.amount_pyg else '',
            expense.description if expense.description else '',
        ])

    return response
