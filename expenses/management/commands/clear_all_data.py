from django.core.management.base import BaseCommand
from django.db import transaction
from expenses.models import Expense, Company, PaymentForm, ExpenseType


class Command(BaseCommand):
    help = 'Clears ALL expense data including master lists (Companies, Payment Forms, Expense Types, and Expenses). USE WITH CAUTION!'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to delete all data',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    '\n⚠️  WARNING: This will delete ALL expense data!\n'
                    'This includes:\n'
                    '  - All Expenses\n'
                    '  - All Companies\n'
                    '  - All Payment Forms\n'
                    '  - All Expense Types\n\n'
                    'To proceed, run the command with --confirm flag:\n'
                    '  python manage.py clear_all_data --confirm\n'
                )
            )
            return

        # Count current records
        expense_count = Expense.objects.count()
        company_count = Company.objects.count()
        payment_form_count = PaymentForm.objects.count()
        expense_type_count = ExpenseType.objects.count()

        self.stdout.write(
            self.style.WARNING(
                f'\n📊 Current data:\n'
                f'  - Expenses: {expense_count}\n'
                f'  - Companies: {company_count}\n'
                f'  - Payment Forms: {payment_form_count}\n'
                f'  - Expense Types: {expense_type_count}\n'
            )
        )

        # Confirm one more time
        confirm = input('\n❓ Are you absolutely sure you want to delete ALL this data? Type "DELETE ALL" to confirm: ')

        if confirm != 'DELETE ALL':
            self.stdout.write(self.style.ERROR('❌ Deletion cancelled. Data is safe.'))
            return

        # Perform deletion in a transaction
        try:
            with transaction.atomic():
                # Delete in correct order (expenses first, then master lists)
                self.stdout.write('🗑️  Deleting expenses...')
                Expense.objects.all().delete()

                self.stdout.write('🗑️  Deleting companies...')
                Company.objects.all().delete()

                self.stdout.write('🗑️  Deleting payment forms...')
                PaymentForm.objects.all().delete()

                self.stdout.write('🗑️  Deleting expense types...')
                ExpenseType.objects.all().delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Successfully deleted all data!\n'
                    f'  - {expense_count} expenses deleted\n'
                    f'  - {company_count} companies deleted\n'
                    f'  - {payment_form_count} payment forms deleted\n'
                    f'  - {expense_type_count} expense types deleted\n\n'
                    f'Database is now at starting point (empty).\n'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'\n❌ Error occurred during deletion: {str(e)}\n'
                    f'Data may be partially deleted. Check database state.\n'
                )
            )
            raise
