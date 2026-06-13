-- Alter ledger_entry_type enum to include non_expense_withdrawal
ALTER TYPE public.ledger_entry_type ADD VALUE 'non_expense_withdrawal';
