import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly newGroupButton: Locator;
  readonly groupsListItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newGroupButton = page.getByRole('button', { name: 'Nouveau groupe' });
    this.groupsListItems = page.getByRole('listitem');
  }

  async createGroup(name: string, currency: string, members: string[]) {
    await this.newGroupButton.click();
    await this.page.getByRole('dialog', { name: 'Créer un groupe' }).waitFor();

    await this.page.getByLabel('Nom du groupe').fill(name);
    await this.page.getByLabel('Devise').selectOption(currency);
    await this.page.getByLabel('Membres (un par ligne, format : Nom <email>)').fill(members.join('\n'));
    await this.page.getByRole('button', { name: 'Créer' }).click();

    await expect(this.groupListItem(name)).toBeVisible();
  }

  groupListItem(name: string) {
    return this.groupsListItems.filter({ hasText: name }).first();
  }

  async openGroup(name: string) {
    await this.groupListItem(name).click();
  }
}
