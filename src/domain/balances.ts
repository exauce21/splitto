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
  const memberIds = new Set(group.members.map(m => m.id));

  // Initialiser les soldes à 0 pour tous les membres du groupe
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  // Calculer les soldes à partir des dépenses
  for (const expense of expenses) {

    // paidBy pour le payeur,
    // amount pour le montant total de la dépense,
    // split pour les détails du partage
    const { paidBy, amount, split } = expense;

    // Payeur reçoit le montant total (seulement si c'est un membre actuel)
    if (memberIds.has(paidBy)) {
      balances[paidBy] += amount;
    }

    // Chaque bénéficiaire doit sa quote-part (seulement si c'est un membre actuel)
    if (split.mode === 'equal') {
      const beneficiaries = split.beneficiaries;
      const share = amount / beneficiaries.length;
      for (const beneficiary of beneficiaries) {
        if (memberIds.has(beneficiary)) {
          balances[beneficiary] -= share;
        }
      }
    } else if (split.mode === 'weighted') {
      const weights = split.weights;
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      for (const [beneficiary, weight] of Object.entries(weights)) {
        if (memberIds.has(beneficiary)) {
          const share = (amount * weight) / totalWeight;
          balances[beneficiary] -= share;
        }
      }
    } else if (split.mode === 'percentage') {
      for (const [beneficiary, percentage] of Object.entries(split.percentages)) {
        if (memberIds.has(beneficiary)) {
          const share = (amount * percentage) / 100;
          balances[beneficiary] -= share;
        }
      }
    }
  }

  return balances;
}
