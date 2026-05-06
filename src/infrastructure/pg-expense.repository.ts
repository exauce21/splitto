// src/infrastructure/pg-expense.repository.ts
//
// EXERCICE 4 — À COMPLÉTER
//
// Implémentation Postgres du ExpenseRepository.
// À tester avec Testcontainers (voir SUJET.md exercice 4).

import type { Pool } from 'pg';
import type { Expense } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  // save methode pour enregistrer une dépense dans la base de données
  async save(expense: Expense): Promise<void> {
    await this.pool.query(
      `INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        expense.id,
        expense.groupId,
        expense.description,
        expense.amount,
        expense.currency,
        expense.paidBy,
        expense.paidAt,
        expense.split.mode,
        expense.split,
        expense.category
      ]
    );
  }

  // findByID methode pour trouver une dépense par son ID, retourne null si non trouvée
  async findById(id: string): Promise<Expense | null> {
    const result = await this.pool.query(
      'SELECT * FROM expenses WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: new Date(row.paid_at),
      split: row.split_data,
      category: row.category,
      createdAt: new Date(row.created_at)
    };
  }

  // findByGroupId methode pour trouver toutes les dépenses d'un groupe, triées par date de paiement décroissante
  async findByGroupId(groupId: string): Promise<Expense[]> {
    const result = await this.pool.query(
      'SELECT * FROM expenses WHERE group_id = $1 ORDER BY paid_at DESC',
      [groupId]
    );

    return result.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: new Date(row.paid_at),
      split: row.split_data,
      category: row.category,
      createdAt: new Date(row.created_at)
    }));
  }

  // findInDateRange methode pour trouver les dépenses d'un groupe dans une plage de dates, triées par date de paiement décroissante
  async findInDateRange(
    groupId: string,
    from: Date,
    to: Date,
  ): Promise<Expense[]> {
    const result = await this.pool.query(
      'SELECT * FROM expenses WHERE group_id = $1 AND paid_at >= $2 AND paid_at <= $3 ORDER BY paid_at DESC',
      [groupId, from, to]
    );

    return result.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: new Date(row.paid_at),
      split: row.split_data,
      category: row.category,
      createdAt: new Date(row.created_at)
    }));
  }
}
