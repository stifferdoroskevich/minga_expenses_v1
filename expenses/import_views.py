from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Company, PaymentForm, ExpenseType, Expense
import openpyxl
import csv
from io import TextIOWrapper
from datetime import datetime
from decimal import Decimal, InvalidOperation


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def preview_import(request):
    """
    Preview the first 5 rows of uploaded file and detect columns.
    Returns column headers and sample data for mapping.
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = request.FILES['file']
    file_extension = uploaded_file.name.split('.')[-1].lower()

    try:
        if file_extension == 'xlsx':
            # Parse Excel file - data_only=True to read formula results instead of formulas
            wb = openpyxl.load_workbook(uploaded_file, data_only=True)

            # Try to find "transacciones" sheet, otherwise use first sheet
            if 'transacciones' in wb.sheetnames:
                ws = wb['transacciones']
            else:
                ws = wb.active

            # Get headers (first row)
            headers = []
            for cell in ws[1]:
                headers.append(cell.value if cell.value else f"Column_{cell.column}")

            # Get first 5 data rows
            rows = []
            for i, row in enumerate(ws.iter_rows(min_row=2, max_row=6, values_only=True)):
                if i >= 5:
                    break
                rows.append(list(row))

            return Response({
                'headers': headers,
                'preview_rows': rows,
                'total_rows': ws.max_row - 1,  # Exclude header row
                'sheet_name': ws.title
            })

        elif file_extension == 'csv':
            # Parse CSV file
            text_file = TextIOWrapper(uploaded_file.file, encoding='utf-8')
            csv_reader = csv.reader(text_file)

            headers = next(csv_reader)
            rows = []
            for i, row in enumerate(csv_reader):
                if i >= 5:
                    break
                rows.append(row)

            # Reset file to count total rows
            uploaded_file.seek(0)
            text_file = TextIOWrapper(uploaded_file.file, encoding='utf-8')
            total_rows = sum(1 for _ in csv.reader(text_file)) - 1  # Exclude header

            return Response({
                'headers': headers,
                'preview_rows': rows,
                'total_rows': total_rows,
                'sheet_name': 'CSV'
            })

        else:
            return Response(
                {'error': 'Unsupported file format. Please upload .xlsx or .csv'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Exception as e:
        return Response(
            {'error': f'Failed to parse file: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def import_expenses(request):
    """
    Import expenses from uploaded file with column mapping.
    Expected POST data:
    - file: The uploaded file
    - mapping: JSON object mapping system fields to file column indices
      Example: {"date": 0, "description": 1, "amount_eur": 2, ...}
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    if 'mapping' not in request.data:
        return Response({'error': 'Column mapping not provided'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = request.FILES['file']
    file_extension = uploaded_file.name.split('.')[-1].lower()

    # Parse mapping (it comes as JSON string)
    import json
    try:
        mapping = json.loads(request.data['mapping'])
    except:
        mapping = request.data['mapping']

    # Statistics
    stats = {
        'total_rows': 0,
        'successful': 0,
        'errors': [],
        'master_lists_created': {
            'companies': 0,
            'payment_forms': 0,
            'expense_types': 0
        }
    }

    # Cache for master lists to avoid repeated DB lookups
    companies_cache = {}
    payment_forms_cache = {}
    expense_types_cache = {}

    try:
        # Parse file
        rows = []
        if file_extension == 'xlsx':
            # data_only=True to read formula results instead of formulas
            wb = openpyxl.load_workbook(uploaded_file, data_only=True)
            ws = wb['transacciones'] if 'transacciones' in wb.sheetnames else wb.active
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append(list(row))
        elif file_extension == 'csv':
            text_file = TextIOWrapper(uploaded_file.file, encoding='utf-8')
            csv_reader = csv.reader(text_file)
            next(csv_reader)  # Skip header
            rows = list(csv_reader)
        else:
            return Response(
                {'error': 'Unsupported file format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stats['total_rows'] = len(rows)

        # Process each row
        with transaction.atomic():
            for row_num, row in enumerate(rows, start=2):  # Start at 2 (header is row 1)
                try:
                    # Extract values based on mapping
                    date_str = str(row[int(mapping['date'])]) if mapping.get('date') is not None and row[int(mapping['date'])] not in [None, ''] else None
                    description = str(row[int(mapping['description'])]) if mapping.get('description') is not None and row[int(mapping['description'])] else None
                    amount_eur_str = str(row[int(mapping['amount_eur'])]) if mapping.get('amount_eur') is not None and row[int(mapping['amount_eur'])] else None
                    amount_pyg_str = str(row[int(mapping['amount_pyg'])]) if mapping.get('amount_pyg') is not None and row[int(mapping['amount_pyg'])] else None
                    company_name = str(row[int(mapping['company'])]).strip() if mapping.get('company') is not None and row[int(mapping['company'])] not in [None, ''] else None
                    payment_form_name = str(row[int(mapping['payment_form'])]).strip() if mapping.get('payment_form') is not None else None
                    expense_type_name = str(row[int(mapping['expense_type'])]).strip() if mapping.get('expense_type') is not None else None

                    # Skip empty rows (no company and no date)
                    if not company_name and not date_str:
                        continue

                    # Clean up "None" strings
                    if date_str and date_str.lower() in ['none', 'null']:
                        date_str = None
                    if company_name and company_name.lower() in ['none', 'null']:
                        company_name = None

                    # Validate required fields
                    if not date_str or not company_name or not payment_form_name or not expense_type_name:
                        stats['errors'].append(f"Row {row_num}: Missing required fields")
                        continue

                    # Parse date
                    try:
                        if isinstance(row[int(mapping['date'])], datetime):
                            expense_date = row[int(mapping['date'])].date()
                        else:
                            # Try common date formats
                            for date_format in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']:
                                try:
                                    expense_date = datetime.strptime(date_str, date_format).date()
                                    break
                                except ValueError:
                                    continue
                            else:
                                stats['errors'].append(f"Row {row_num}: Invalid date format '{date_str}'")
                                continue
                    except Exception as e:
                        stats['errors'].append(f"Row {row_num}: Date parsing error - {str(e)}")
                        continue

                    # Parse amounts
                    amount_eur = None
                    amount_pyg = None

                    if amount_eur_str and amount_eur_str.lower() not in ['none', 'null', '']:
                        try:
                            # Clean EUR amount: remove currency symbols, spaces, convert comma to dot
                            clean_eur = amount_eur_str.replace('€', '').replace('$', '').replace(' ', '').replace(',', '.')
                            amount_eur = Decimal(clean_eur).quantize(Decimal('0.01'))  # Round to 2 decimal places
                        except (InvalidOperation, ValueError):
                            stats['errors'].append(f"Row {row_num}: Invalid EUR amount '{amount_eur_str}'")
                            continue

                    if amount_pyg_str and amount_pyg_str.lower() not in ['none', 'null', '']:
                        try:
                            # Clean PYG amount: remove currency symbols, dots (thousands separator), spaces, convert comma to dot
                            clean_pyg = amount_pyg_str.replace('₲', '').replace('$', '').replace(' ', '').replace('.', '').replace(',', '.')
                            amount_pyg = Decimal(clean_pyg).quantize(Decimal('1'))  # Round to 0 decimal places (integer)
                        except (InvalidOperation, ValueError):
                            stats['errors'].append(f"Row {row_num}: Invalid PYG amount '{amount_pyg_str}'")
                            continue

                    # At least one amount required
                    if not amount_eur and not amount_pyg:
                        stats['errors'].append(f"Row {row_num}: At least one currency amount required")
                        continue

                    # Get or create Company
                    if company_name not in companies_cache:
                        company, created = Company.objects.get_or_create(
                            name=company_name,
                            defaults={'notes': 'Imported from file'}
                        )
                        companies_cache[company_name] = company
                        if created:
                            stats['master_lists_created']['companies'] += 1
                    company = companies_cache[company_name]

                    # Get or create PaymentForm
                    if payment_form_name not in payment_forms_cache:
                        payment_form, created = PaymentForm.objects.get_or_create(
                            name=payment_form_name,
                            defaults={'description': 'Imported from file'}
                        )
                        payment_forms_cache[payment_form_name] = payment_form
                        if created:
                            stats['master_lists_created']['payment_forms'] += 1
                    payment_form = payment_forms_cache[payment_form_name]

                    # Get or create ExpenseType
                    if expense_type_name not in expense_types_cache:
                        expense_type, created = ExpenseType.objects.get_or_create(
                            name=expense_type_name,
                            defaults={'description': 'Imported from file'}
                        )
                        expense_types_cache[expense_type_name] = expense_type
                        if created:
                            stats['master_lists_created']['expense_types'] += 1
                    expense_type = expense_types_cache[expense_type_name]

                    # Create Expense
                    Expense.objects.create(
                        date=expense_date,
                        description=description,
                        amount_eur=amount_eur,
                        amount_pyg=amount_pyg,
                        company=company,
                        payment_form=payment_form,
                        expense_type=expense_type
                    )

                    stats['successful'] += 1

                except Exception as e:
                    stats['errors'].append(f"Row {row_num}: {str(e)}")
                    continue

        return Response(stats, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Import failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
