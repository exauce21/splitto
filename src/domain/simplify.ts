// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];

  // Convert to array of [memberId, balance] pairs
  const entries = Object.entries(balances)
    .map(([id, balance]) => ({ id, balance }))
    .filter(entry => Math.abs(entry.balance) > 0.01); // Ignore tiny amounts

  if (entries.length === 0) return settlements;

  // Sort by balance (negative first, then positive)
  entries.sort((a, b) => a.balance - b.balance);

  let i = 0; // Points to most negative balance
  let j = entries.length - 1; // Points to most positive balance

  while (i < j) {
    const debtor = entries[i];
    const creditor = entries[j];

    if (debtor.balance >= -0.01) break; // No more debtors
    if (creditor.balance <= 0.01) break; // No more creditors

    const amount = Math.min(-debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount * 100) / 100 // Round to cents
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (debtor.balance >= -0.01) i++;
    if (creditor.balance <= 0.01) j--;
  }

  return settlements;
}
