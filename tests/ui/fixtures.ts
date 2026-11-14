import { test as base } from '@playwright/test';

// Keep launch prompts deterministic instead of making unrelated tests flaky.
export const test = base.extend<{ donationRoll: number }>({
  donationRoll: [0.9, { option: true }],
  page: async ({ page, donationRoll }, use) => {
    await page.addInitScript(roll => { Math.random = () => roll; }, donationRoll);
    await use(page);
  },
});
export { expect, type Page } from '@playwright/test';
