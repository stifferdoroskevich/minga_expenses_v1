from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from decimal import Decimal
from datetime import date
from .models import Company, PaymentForm, PaymentType, Expense


class CompanyModelTest(TestCase):
    """Test cases for Company model"""

    def test_create_company(self):
        """Test creating a company"""
        company = Company.objects.create(
            name="Test Company",
            notes="Some notes"
        )
        self.assertEqual(company.name, "Test Company")
        self.assertEqual(company.notes, "Some notes")
        self.assertIsNotNone(company.created_at)
        self.assertIsNotNone(company.updated_at)

    def test_company_str(self):
        """Test company string representation"""
        company = Company.objects.create(name="Test Company")
        self.assertEqual(str(company), "Test Company")

    def test_company_unique_name(self):
        """Test that company names must be unique"""
        Company.objects.create(name="Test Company")
        with self.assertRaises(IntegrityError):
            Company.objects.create(name="Test Company")

    def test_company_ordering(self):
        """Test that companies are ordered by name"""
        Company.objects.create(name="Zebra Company")
        Company.objects.create(name="Alpha Company")
        companies = Company.objects.all()
        self.assertEqual(companies[0].name, "Alpha Company")
        self.assertEqual(companies[1].name, "Zebra Company")


class PaymentFormModelTest(TestCase):
    """Test cases for PaymentForm model"""

    def test_create_payment_form(self):
        """Test creating a payment form"""
        payment_form = PaymentForm.objects.create(
            name="Credit Card",
            description="Visa card"
        )
        self.assertEqual(payment_form.name, "Credit Card")
        self.assertEqual(payment_form.description, "Visa card")

    def test_payment_form_str(self):
        """Test payment form string representation"""
        payment_form = PaymentForm.objects.create(name="Cash")
        self.assertEqual(str(payment_form), "Cash")

    def test_payment_form_unique_name(self):
        """Test that payment form names must be unique"""
        PaymentForm.objects.create(name="Cash")
        with self.assertRaises(IntegrityError):
            PaymentForm.objects.create(name="Cash")


class PaymentTypeModelTest(TestCase):
    """Test cases for PaymentType model"""

    def test_create_payment_type(self):
        """Test creating a payment type"""
        payment_type = PaymentType.objects.create(
            name="Food",
            description="Food and groceries"
        )
        self.assertEqual(payment_type.name, "Food")
        self.assertEqual(payment_type.description, "Food and groceries")

    def test_payment_type_str(self):
        """Test payment type string representation"""
        payment_type = PaymentType.objects.create(name="Transport")
        self.assertEqual(str(payment_type), "Transport")

    def test_payment_type_unique_name(self):
        """Test that payment type names must be unique"""
        PaymentType.objects.create(name="Food")
        with self.assertRaises(IntegrityError):
            PaymentType.objects.create(name="Food")


class ExpenseModelTest(TestCase):
    """Test cases for Expense model"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(name="Test Company")
        self.payment_form = PaymentForm.objects.create(name="Credit Card")
        self.payment_type = PaymentType.objects.create(name="Food")

    def test_create_expense_with_eur_only(self):
        """Test creating expense with EUR only"""
        expense = Expense.objects.create(
            date=date.today(),
            description="Lunch at restaurant",
            amount_eur=Decimal("25.50"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertEqual(expense.amount_eur, Decimal("25.50"))
        self.assertIsNone(expense.amount_pyg)

    def test_create_expense_with_pyg_only(self):
        """Test creating expense with PYG only"""
        expense = Expense.objects.create(
            date=date.today(),
            description="Taxi ride",
            amount_pyg=Decimal("50000"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertIsNone(expense.amount_eur)
        self.assertEqual(expense.amount_pyg, Decimal("50000"))

    def test_create_expense_with_both_currencies(self):
        """Test creating expense with both EUR and PYG"""
        expense = Expense.objects.create(
            date=date.today(),
            description="Hotel booking",
            amount_eur=Decimal("100.00"),
            amount_pyg=Decimal("750000"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertEqual(expense.amount_eur, Decimal("100.00"))
        self.assertEqual(expense.amount_pyg, Decimal("750000"))

    def test_expense_requires_at_least_one_currency(self):
        """Test that expense requires at least one currency amount"""
        with self.assertRaises(ValidationError) as context:
            expense = Expense(
                date=date.today(),
                description="Invalid expense",
                company=self.company,
                payment_form=self.payment_form,
                payment_type=self.payment_type
            )
            expense.save()

        self.assertIn('amount_eur', context.exception.message_dict)
        self.assertIn('amount_pyg', context.exception.message_dict)

    def test_expense_eur_must_be_positive(self):
        """Test that EUR amount must be positive"""
        with self.assertRaises(ValidationError) as context:
            expense = Expense(
                date=date.today(),
                description="Invalid expense",
                amount_eur=Decimal("-10.00"),
                company=self.company,
                payment_form=self.payment_form,
                payment_type=self.payment_type
            )
            expense.save()

        self.assertIn('amount_eur', context.exception.message_dict)

    def test_expense_pyg_must_be_positive(self):
        """Test that PYG amount must be positive"""
        with self.assertRaises(ValidationError) as context:
            expense = Expense(
                date=date.today(),
                description="Invalid expense",
                amount_pyg=Decimal("-50000"),
                company=self.company,
                payment_form=self.payment_form,
                payment_type=self.payment_type
            )
            expense.save()

        self.assertIn('amount_pyg', context.exception.message_dict)

    def test_expense_eur_zero_not_allowed(self):
        """Test that zero EUR amount is not allowed"""
        with self.assertRaises(ValidationError):
            expense = Expense(
                date=date.today(),
                description="Invalid expense",
                amount_eur=Decimal("0.00"),
                company=self.company,
                payment_form=self.payment_form,
                payment_type=self.payment_type
            )
            expense.save()

    def test_expense_str_with_eur_only(self):
        """Test expense string representation with EUR only"""
        expense = Expense.objects.create(
            date=date(2025, 10, 10),
            description="Test expense",
            amount_eur=Decimal("25.50"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertIn("2025-10-10", str(expense))
        self.assertIn("Test Company", str(expense))
        self.assertIn("€25.50", str(expense))

    def test_expense_str_with_pyg_only(self):
        """Test expense string representation with PYG only"""
        expense = Expense.objects.create(
            date=date(2025, 10, 10),
            description="Test expense",
            amount_pyg=Decimal("50000"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertIn("2025-10-10", str(expense))
        self.assertIn("Test Company", str(expense))
        self.assertIn("₲50,000", str(expense))

    def test_expense_str_with_both_currencies(self):
        """Test expense string representation with both currencies"""
        expense = Expense.objects.create(
            date=date(2025, 10, 10),
            description="Test expense",
            amount_eur=Decimal("100.00"),
            amount_pyg=Decimal("750000"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        self.assertIn("€100.00", str(expense))
        self.assertIn("₲750,000", str(expense))
        self.assertIn("/", str(expense))  # Should have separator

    def test_expense_ordering(self):
        """Test that expenses are ordered by date (newest first)"""
        expense1 = Expense.objects.create(
            date=date(2025, 10, 1),
            description="Older expense",
            amount_eur=Decimal("10.00"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        expense2 = Expense.objects.create(
            date=date(2025, 10, 15),
            description="Newer expense",
            amount_eur=Decimal("20.00"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )
        expenses = Expense.objects.all()
        self.assertEqual(expenses[0], expense2)  # Newest first
        self.assertEqual(expenses[1], expense1)

    def test_expense_foreign_key_protection(self):
        """Test that foreign keys use PROTECT on_delete"""
        expense = Expense.objects.create(
            date=date.today(),
            description="Test expense",
            amount_eur=Decimal("10.00"),
            company=self.company,
            payment_form=self.payment_form,
            payment_type=self.payment_type
        )

        # Try to delete company - should be protected
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.company.delete()
