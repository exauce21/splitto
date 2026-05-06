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

  // Convertir le dictionnaire de soldes en une liste d'objets {id, balance}
  const entries = Object.entries(balances)
    .map(([id, balance]) => ({ id, balance }))
    .filter(entry => Math.abs(entry.balance) > 0.01);
  if (entries.length === 0) return settlements;

  // Sorter les membres par solde croissant 
  // (les débiteurs en premier, les créditeurs en dernier)
  entries.sort((a, b) => a.balance - b.balance);

  let i = 0; // Point sur le plus grand débiteur
  let j = entries.length - 1; // Point sur le plus grand créditeur

  // Tant qu'il y a des débiteurs et des créditeurs   
  // On fait s'affronter le plus grand débiteur et le plus grand créditeur
  while (i < j) {
    const debtor = entries[i];
    const creditor = entries[j];

    if (debtor.balance >= -0.01) break;
    if (creditor.balance <= 0.01) break;

    const amount = Math.min(-debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount * 100) / 100 // Arrondir à 2 décimales
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (debtor.balance >= -0.01) i++;
    if (creditor.balance <= 0.01) j--;
  }

  return settlements;
}
