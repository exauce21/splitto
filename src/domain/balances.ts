// src/domain/balances.ts — calcul des soldes d'un groupe
//
// EXERCICE 1 — À COMPLÉTER
//
// Spec : voir SUJET.md, exercice 1
//
// Cette fonction est PURE : pas d'effets de bord, pas d'I/O.
// Elle prend un groupe et ses dépenses, retourne les soldes.

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  const balances: Balances = {};

  // Initialize balances for all members
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  // Calculate balances from expenses
  for (const expense of expenses) {
    const { paidBy, amount, split } = expense;

    // Payeur reçoit le montant total
    balances[paidBy] = (balances[paidBy] || 0) + amount;

    // Chaque bénéficiaire doit sa quote-part
    if (split.mode === 'equal') {
      const beneficiaries = split.beneficiaries;
      const share = amount / beneficiaries.length;
      for (const beneficiary of beneficiaries) {
        balances[beneficiary] = (balances[beneficiary] || 0) - share;
      }
    } else if (split.mode === 'weighted') {
      // For weighted, split.weights is Record<string, number>
      const weights = split.weights;
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      for (const [beneficiary, weight] of Object.entries(weights)) {
        const share = (amount * weight) / totalWeight;
        balances[beneficiary] = (balances[beneficiary] || 0) - share;
      }
    } else if (split.mode === 'percentage') {
      // For percentage, split.percentages is Record<string, number>
      for (const [beneficiary, percentage] of Object.entries(split.percentages)) {
        const share = (amount * percentage) / 100;
        balances[beneficiary] = (balances[beneficiary] || 0) - share;
      }
    }
  }

  return balances;
}
