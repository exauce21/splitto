import { expect, type Locator, type Page } from '@playwright/test';

export class GroupPage {
  readonly page: Page;
  readonly addExpenseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addExpenseButton = page.getByRole('button', { name: 'Ajouter une dépense' });
  }

  async addExpense({
    description,
    amount,
    paidBy,
    beneficiaries,
  }: {
    description: string;
    amount: string;
    paidBy: string;
    beneficiaries: string[];
  }) {
    await this.addExpenseButton.click();
    await this.page.getByRole('dialog', { name: 'Ajouter une dépense' }).waitFor();

    await this.page.getByLabel('Description').fill(description);
    await this.page.getByLabel('Montant').fill(amount);
    await this.page.getByLabel('Payé par').selectOption({ label: paidBy });

    for (const beneficiary of beneficiaries) {
      const checkbox = this.page.getByRole('checkbox', { name: beneficiary, exact: true });
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }

    const dialog = this.page.getByRole('dialog', { name: 'Ajouter une dépense' });
    await this.page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await this.expenseIsVisible(description);
  }

  expenseRow(description: string) {
    return this.page
      .getByRole('table', { name: 'Liste des dépenses' })
      .getByRole('row')
      .filter({ hasText: description })
      .first();
  }

  async expenseIsVisible(description: string) {
    await expect(this.expenseRow(description)).toBeVisible();
  }

  balanceRow(memberName: string) {
    return this.page
      .getByRole('table', { name: 'Soldes des membres' })
      .getByRole('row')
      .filter({ hasText: memberName })
      .first();
  }

  async balanceValue(memberName: string) {
    const row = this.balanceRow(memberName);
    return row.locator('td').nth(1).innerText();
  }

  settlementButton() {
    return this.page.getByRole('button', { name: 'Régler' }).first();
  }

  settlementRow(index: number) {
    return this.page.getByTestId(`settlement-row-${index}`);
  }

  async settleFirstSuggested() {
    await this.settlementButton().click();
  }
}
