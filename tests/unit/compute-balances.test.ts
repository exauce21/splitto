import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

describe('computeBalances', () => {

    // creeation de groupes et de dépenses pour les tests
    const createGroup = (members: Array<{ id: string; name: string; email: string }>): Group => ({
        id: 'group-1',
        name: 'Test Group',
        currency: 'EUR',
        members
    });

    // Créer une dépense 
    const createExpense = (
        id: string,
        paidBy: string,
        amount: number,
        split: Expense['split']
    ): Expense => ({
        id,
        groupId: 'group-1',
        description: 'Test expense',
        amount,
        currency: 'EUR',
        paidBy,
        paidAt: new Date(),
        split,
        createdAt: new Date()
    });


    // Cas obligatoires à tester (au minimum) //

    describe('Required test cases', () => {

        // 1. Groupe vide → tous les soldes sont 0
        it('Groupe vide → tous les soldes sont 0', () => {
        const group = createGroup([]);
        const expenses: Expense[] = [];
        const result = computeBalances(group, expenses);
        expect(result).toEqual({});
        });

        // 2. Une dépense `equal` entre 3 personnes (le payeur inclus comme bénéficiaire)
        it('Une dépense équitable entre 3 personnes (le payeur inclus comme bénéficiaire)', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' },
                { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 30, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob', 'charlie']
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 30 - 10, // +30 - 10 = +20
                bob: 0 - 10,    // -10
                charlie: 0 - 10 // -10
            });
        });

        // 3. Une dépense `equal` entre 3 personnes (le payeur PAS bénéficiaire)
        it('Une dépense equal entre 3 personnes (le payeur PAS bénéficiaire))', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' },
                { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 30, {
                mode: 'equal',
                beneficiaries: ['bob', 'charlie']
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 30,      // +30 (paid) - 0 (not a beneficiary)
                bob: 0 - 15,    // -15
                charlie: 0 - 15 // -15
            });
        });

        // 4. Plusieurs dépenses qui se compensent partiellement
        it('Plusieurs dépenses qui se compensent partiellement', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' }
            ]);

            const expenses: Expense[] = [
                createExpense('exp-1', 'alice', 20, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob']
                }),
                createExpense('exp-2', 'bob', 15, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob']
                })
            ];

            const result = computeBalances(group, expenses);

            expect(result).toEqual({
                alice: (20 - 10) + (0 - 7.5), // +10 - 7.5 = +2.5
                bob: (0 - 10) + (15 - 7.5)    // -10 + 7.5 = -2.5
            });
        });

        // 5. Autres types de dépenses (weighted, percentage)
        it('A weighted expense with non-uniform weights', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' },
                { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 100, {
                mode: 'weighted',
                weights: { alice: 2, bob: 3, charlie: 5 }
            });

            const result = computeBalances(group, [expense]);

            const totalWeight = 2 + 3 + 5; // 10
            expect(result).toEqual({
                alice: 100 - (100 * 2 / 10), // +100 - 20 = +80
                bob: 0 - (100 * 3 / 10),     // -30
                charlie: 0 - (100 * 5 / 10)  // -50
            });
        });

        // 6. Une dépense `percentage` avec arrondis (ex: €100 divisé entre 3 = 33.33 + 33.33 + 33.34)
        it('Une dépense percentage avec arrondis (ex: €100 divisé entre 3 = 33.33 + 33.33 + 33.34)', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' },
                { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 100, {
                mode: 'percentage',
                percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 }
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 100 - 33.33, // +100 - 33.33 = +66.67
                bob: 0 - 33.33,     // -33.33
                charlie: 0 - 33.34  // -33.34
            });
        });
    });

    // Cas limites à tester (au moins 3 au choix parmi) //

    describe('Edge cases', () => {

        // 1. Un membre qui a été supprimé du groupe mais qui apparaît encore dans une ancienne dépense
        it('Un membre supprimé du groupe apparaît dans une ancienne dépense', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 30, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob', 'charlie'] 
                // Charlie n'est plus dans le groupe, mais était bénéficiaire de cette dépense.
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 30 - 10, // +30 - 10 = +20
                bob: 0 - 10     // -10
                // Charlie n'est pas dans le groupe, donc il est ignoré pour le calcul des soldes.
            });
        });

        // 2. Dépense de 0€ (à autoriser ou rejeter — votre choix, justifiez)
        it('Dépense de 0€ (à autoriser ou rejeter — votre choix, justifiez)', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 0, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob']
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 0, // +0 - 0 = 0
                bob: 0    // -0 = 0
            });
        });

        // 3. Dépense avec un seul bénéficiaire (le payeur lui-même)
        it('Dépense avec un seul bénéficiaire (l\'ayant eux-mêmes)', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 50, {
                mode: 'equal',
                beneficiaries: ['alice']
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 50 - 50 // +50 - 50 = 0
            });
        });

        // 4. Liste vide de dépenses
        it('Liste vide de dépenses', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' }
            ]);

            const result = computeBalances(group, []);

            expect(result).toEqual({
                alice: 0,
                bob: 0
            });
        });

        // 5. Un très grand nombre de membres (10+) avec une dépense `equal` entre tous
        it('Très grand nombre de membres (10+)', () => {
            const members = Array.from({ length: 12 }, (_, i) => ({
                id: `member-${i}`,
                name: `Member ${i}`,
                email: `member${i}@test.com`
            }));

            const group = createGroup(members);

            const expense = createExpense('exp-1', 'member-0', 120, {
                mode: 'equal',
                beneficiaries: members.map(m => m.id)
            });

            const result = computeBalances(group, [expense]);

            // Chacun doit 10€, sauf le payeur qui doit 120 - 10 = 110€
            expect(result['member-0']).toBe(120 - 10); // +110
            for (let i = 1; i < 12; i++) {
                expect(result[`member-${i}`]).toBe(-10);
            }
        });

        // 6. Pourcentage qui ne totalise pas exactement 100% (ex: 60% + 30% = 90%)
        it('Percentages that do not exactly add up to 100', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' }
            ]);

            const expense = createExpense('exp-1', 'alice', 100, {
                mode: 'percentage',
                percentages: { alice: 60, bob: 30 } // Only 90%, not 100%
            });

            const result = computeBalances(group, [expense]);

            expect(result).toEqual({
                alice: 100 - 60, // +100 - 60 = +40
                bob: 0 - 30     // -30
            });
        });
    });

    // Verification additionnelle : 
    // la somme de tous les soldes doit être 0 
    // (ou proche de 0 avec les arrondis)
    describe('Balance sum verification', () => {
        it('Sum of all balances should be approximately 0', () => {
            const group = createGroup([
                { id: 'alice', name: 'Alice', email: 'alice@test.com' },
                { id: 'bob', name: 'Bob', email: 'bob@test.com' },
                { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' }
            ]);

            const expenses: Expense[] = [
                createExpense('exp-1', 'alice', 30, {
                mode: 'equal',
                beneficiaries: ['alice', 'bob', 'charlie']
                }),
                createExpense('exp-2', 'bob', 45, {
                mode: 'weighted',
                weights: { alice: 1, bob: 2, charlie: 2 }
                })
            ];

            const result = computeBalances(group, expenses);
            const sum = Object.values(result).reduce((acc, balance) => acc + balance, 0);

            // Somme des soldes doit être proche de 0 (tolérance pour les arrondis)
            expect(Math.abs(sum)).toBeLessThan(0.01);
        });
    });
});