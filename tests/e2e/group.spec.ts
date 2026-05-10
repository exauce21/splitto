import { expect, test } from '@playwright/test';
import { GroupPage } from './pages/GroupPage';
import { HomePage } from './pages/HomePage';

const members = [
  'Alice <alice@example.com>',
  'Bob <bob@example.com>',
  'Charlie <charlie@example.com>',
];

const groupName = 'Groupe Test';
const currency = 'EUR';

test.describe('Splitto E2E', () => {
  test.beforeEach(async ({ request, page }) => {
    const reset = await request.post('/_test/reset');
    expect(reset.ok()).toBeTruthy();
    await page.goto('/');
  });

  test('Créer un groupe avec 3 membres', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, currency, members);

    await expect(home.groupListItem(groupName)).toBeVisible();
  });

  test('Ajouter une dépense et vérifier qu’elle apparaît', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, currency, members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense({
      description: 'Déjeuner',
      amount: '30.00',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await expect(group.expenseRow('Déjeuner')).toBeVisible();
  });

  test('Voir les soldes mis à jour après une dépense', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, currency, members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense({
      description: 'Déjeuner',
      amount: '30.00',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await expect(group.balanceRow('Alice')).toBeVisible();
    await expect(group.balanceRow('Bob')).toBeVisible();
    await expect(group.balanceRow('Charlie')).toBeVisible();

    expect(await group.balanceValue('Alice')).toBe('20.00 EUR');
    expect(await group.balanceValue('Bob')).toBe('-10.00 EUR');
    expect(await group.balanceValue('Charlie')).toBe('-10.00 EUR');
  });

  test('Marquer un règlement comme réglé', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, currency, members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense({
      description: 'Déjeuner',
      amount: '30.00',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await expect(group.settlementRow(0)).toBeVisible();
    await group.settleFirstSuggested();
    await expect(group.settlementRow(0)).toHaveCount(0);
  });
});
