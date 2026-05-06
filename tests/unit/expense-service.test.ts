import { describe, it, expect } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { CreateExpenseInput, Expense } from '../../src/domain/types';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';

describe('ExpenseService.create', () => {
    const fixedDate = new Date('2026-05-06T12:00:00.000Z');
    const expenseInput: CreateExpenseInput = {
        groupId: 'group-1',
        description: 'Diner Samedi',
        amount: 120,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-05-06T11:00:00.000Z'),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
        category: 'Nouriture'
    };

    it('renvoie la dépense, l\'enregistre et envoie une notification concernant le montant >= 100', async () => {
        // ─── DUMMY ──────────────────────────────────────
        const dummyLogger: Logger = {
            info: () => undefined,
            error: () => undefined,
        };

        // ─── STUB ───────────────────────────────────────
        const stubClock: Clock = {
            now: () => fixedDate,
        };

        // ─── SPY ────────────────────────────────────────
        const spyNotifierCalls: Array<{ groupId: string; message: string }> = [];
        const spyNotifier: EmailNotifier = {
            notifyGroupMembers: async (groupId, message) => {
                spyNotifierCalls.push({ groupId, message });
            },
        };

        // ─── MOCK ───────────────────────────────────────
        const mockIdGen: IdGenerator = {
            next: () => 'expense-123',
        };

        // ─── FAKE ───────────────────────────────────────
        const savedExpenses: Expense[] = [];
        const fakeRepo: ExpenseRepository = {
            save: async (expense) => {
                savedExpenses.push(expense);
            },
            findById: async () => null,
            findByGroupId: async () => [],
            findInDateRange: async () => [],
        };

        const service = new ExpenseService(fakeRepo, spyNotifier, stubClock, mockIdGen, dummyLogger);
        const result = await service.create(expenseInput);

        expect(result).toEqual({
            id: 'expense-123',
            ...expenseInput,
            createdAt: fixedDate,
        });

        expect(savedExpenses).toHaveLength(1);
        expect(savedExpenses[0]).toEqual(result);

        expect(spyNotifierCalls).toEqual([{
                groupId: 'group-1',
                message: 'Nouvelle dépense importante : Diner Samedi (120€)',
            },
        ]);
    });

    it('n\'affiche pas de notification lorsque le montant < 100, mais enregistre la dépense', async () => {
        const dummyLogger: Logger = {
            info: () => undefined,
            error: () => undefined,
        };

        const stubClock: Clock = {
            now: () => fixedDate,
        };

        const spyNotifierCalls: Array<{ groupId: string; message: string }> = [];
        const spyNotifier: EmailNotifier = {
            notifyGroupMembers: async (groupId, message) => {
                spyNotifierCalls.push({ groupId, message });
            },
        };

        const mockIdGen: IdGenerator = {
            next: () => 'expense-456',
        };

        const savedExpenses: Expense[] = [];
        const fakeRepo: ExpenseRepository = {
            save: async (expense) => {
                savedExpenses.push(expense);
            },
            findById: async () => null,
            findByGroupId: async () => [],
            findInDateRange: async () => [],
        };

        const service = new ExpenseService(fakeRepo, spyNotifier, stubClock, mockIdGen, dummyLogger);
        const input: CreateExpenseInput = {
            ...expenseInput,
            amount: 80,
        };

        const result = await service.create(input);

        expect(result).toEqual({
            id: 'expense-456',
            ...input,
            createdAt: fixedDate,
        });

        expect(savedExpenses).toHaveLength(1);
        expect(savedExpenses[0]).toEqual(result);
        expect(spyNotifierCalls).toEqual([]);
    });
});