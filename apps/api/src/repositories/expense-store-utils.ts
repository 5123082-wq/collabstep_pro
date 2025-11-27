import type { Expense, ExpenseAttachment, ExpenseStatus } from '../types';
import type { ExpenseFilters } from './expense-store';

export function cloneExpense(expense: Expense): Expense {
    return { ...expense };
}

export function cloneAttachment(attachment: ExpenseAttachment): ExpenseAttachment {
    return { ...attachment };
}

export function matchesFilters(expense: Expense, filters: ExpenseFilters, statuses?: Set<ExpenseStatus>): boolean {
    const { workspaceId, projectId, status, category, dateFrom, dateTo, search } = filters;
    if (workspaceId && expense.workspaceId !== workspaceId) {
        return false;
    }
    if (projectId && expense.projectId !== projectId) {
        return false;
    }
    if (statuses) {
        if (!statuses.has(expense.status)) {
            return false;
        }
    } else if (status && expense.status !== status) {
        return false;
    }
    if (category && expense.category !== category) {
        return false;
    }
    if (dateFrom && expense.date < dateFrom) {
        return false;
    }
    if (dateTo && expense.date > dateTo) {
        return false;
    }
    if (search) {
        const haystack = `${expense.vendor ?? ''} ${expense.description ?? ''}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
            return false;
        }
    }
    return true;
}

export function normalizeSearch(search?: string): string | undefined {
    return search?.trim().toLowerCase();
}
