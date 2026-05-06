import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Pool } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import type { Expense } from '../../src/domain/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationSql = readFileSync(join(__dirname, '../../migrations/001-initial.sql'), 'utf8');

describe('PgExpenseRepository integration', () => {
    let container: PostgreSqlContainer;
    let pool: Pool;
    let repo: PgExpenseRepository;

    beforeAll(async () => {
        container = await new PostgreSqlContainer()
        .withDatabase('splitto')
        .withUsername('splitto')
        .withPassword('splitto')
        .start();

        pool = new Pool({
        host: container.getHost(),
        port: container.getPort(),
        user: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
        });

        await pool.query(migrationSql);

        await pool.query(`
        INSERT INTO groups (id, name, currency) VALUES
            ('group-1', 'Group 1', 'EUR'),
            ('group-2', 'Group 2', 'EUR');

        INSERT INTO members (id, group_id, name, email) VALUES
            ('alice', 'group-1', 'Alice', 'alice@example.com'),
            ('bob', 'group-1', 'Bob', 'bob@example.com'),
            ('charlie', 'group-2', 'Charlie', 'charlie@example.com');
        `);

        repo = new PgExpenseRepository(pool);
    }, 180000);

    beforeEach(async () => {
        if (!pool) return;
        await pool.query('TRUNCATE expenses CASCADE');
    });

    afterAll(async () => {
        if (pool) {
        await pool.end();
        }
        if (container) {
            await container.stop();
        }
    });

    // 1. **`save() puis findById()`** retourne l'expense identique (mêmes valeurs)
    it('Retourne l\'expense identique (mêmes valeurs)', async () => {
        const expense: Expense = {
        id: 'exp-1',
        groupId: 'group-1',
        description: 'Lunch',
        amount: 42.5,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date('2026-05-06T10:00:00.000Z'),
        split: {
            mode: 'equal',
            beneficiaries: ['alice', 'bob'],
        },
        category: 'LunchSunday',
        createdAt: new Date('2026-05-06T10:00:00.000Z'),
        };

        await repo.save(expense);
        const saved = await repo.findById('exp-1');

        expect(saved).toEqual(expense);
    });

    // 2. **`findByGroupId()`** retourne toutes les expenses du groupe, triées par date de paiement décroissante
    it('Retourne uniquement les expenses du groupe demandé', async () => {
        const expense1: Expense = {
            id: 'exp-1',
            groupId: 'group-1',
            description: 'Dinner',
            amount: 30,
            currency: 'EUR',
            paidBy: 'alice',
            paidAt: new Date('2026-05-06T08:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            category: 'LunchSunday',
            createdAt: new Date('2026-05-06T08:00:00.000Z'),
        };
        const expense2: Expense = {
            id: 'exp-2',
            groupId: 'group-2',
            description: 'Coffee',
            amount: 10,
            currency: 'EUR',
            paidBy: 'charlie',
            paidAt: new Date('2026-05-06T09:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['charlie'] },
            category: 'CoffeeSunday',
            createdAt: new Date('2026-05-06T09:00:00.000Z'),
        };

        await repo.save(expense1);
        await repo.save(expense2);

        const group1Expenses = await repo.findByGroupId('group-1');

        expect(group1Expenses).toEqual([expense1]);
    });

    // 3. **`findInDateRange()`** retourne les expenses du groupe dont la date de paiement est dans l'intervalle [from, to], triées par date de paiement décroissante
    it('filtre correctement (inclusif sur les bornes)', async () => {
        const expense1: Expense = {
            id: 'exp-1',
            groupId: 'group-1',
            description: 'Breakfast',
            amount: 10,
            currency: 'EUR',
            paidBy: 'alice',
            paidAt: new Date('2026-05-06T07:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            category: 'BreakfastSunday',
            createdAt: new Date('2026-05-06T07:00:00.000Z'),
        };
        const expense2: Expense = {
            id: 'exp-2',
            groupId: 'group-1',
            description: 'Lunch',
            amount: 20,
            currency: 'EUR',
            paidBy: 'bob',
            paidAt: new Date('2026-05-06T12:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            category: 'LunchSunday',
            createdAt: new Date('2026-05-06T12:00:00.000Z'),
        };
        const expense3: Expense = {
            id: 'exp-3',
            groupId: 'group-1',
            description: 'Dinner',
            amount: 50,
            currency: 'EUR',
            paidBy: 'alice',
            paidAt: new Date('2026-05-06T18:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            category: 'DinnerSunday',
            createdAt: new Date('2026-05-06T18:00:00.000Z'),
        };

        await repo.save(expense1);
        await repo.save(expense2);
        await repo.save(expense3);

        const from = new Date('2026-05-06T07:00:00.000Z');
        const to = new Date('2026-05-06T18:00:00.000Z');
        const results = await repo.findInDateRange('group-1', from, to);

        expect(results).toEqual([expense3, expense2, expense1]);
    });

    // 4. **`save()`** avec une dépense dupliquée (même group_id, paid_at, amount, paid_by) est rejeté par la contrainte UNIQUE
    it('rejette un doublon avec une exception', async () => {
        const expense1: Expense = {
            id: 'exp-1',
            groupId: 'group-1',
            description: 'Taxi',
            amount: 25,
            currency: 'EUR',
            paidBy: 'alice',
            paidAt: new Date('2026-05-06T13:00:00.000Z'),
            split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            category: "Taxi",
            createdAt: new Date('2026-05-06T13:00:00.000Z'),
        };
        const expense2: Expense = {
        ...expense1,
        id: 'exp-2',
        description: 'Taxi duplicate',
        };

        await repo.save(expense1);

        await expect(repo.save(expense2)).rejects.toThrow();
    });

    it('a failed transaction rolls back cleanly with no saved rows', async () => {
        const client = await pool.connect();
        try {
        await client.query('BEGIN');
        await client.query(
            `INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
            'exp-rollback',
            'group-1',
            'Breakfast',
            12,
            'EUR',
            'alice',
            new Date('2026-05-06T06:00:00.000Z'),
            'equal',
            { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            'food',
            ]
        );
        await client.query(
            `INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
            'exp-rollback-duplicate',
            'group-1',
            'Breakfast 2',
            12,
            'EUR',
            'alice',
            new Date('2026-05-06T06:00:00.000Z'),
            'equal',
            { mode: 'equal', beneficiaries: ['alice', 'bob'] },
            'food',
            ]
        );
        await client.query('COMMIT');
        } catch (err) {
        await client.query('ROLLBACK');
        } finally {
        client.release();
        }

        const { rows } = await pool.query('SELECT COUNT(*) FROM expenses');
        expect(parseInt(rows[0].count, 10)).toBe(0);
    });
});