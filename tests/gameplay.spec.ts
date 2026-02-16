import { expect, test } from '@playwright/test';

test.describe('gameplay regression coverage', () => {
  test('shows expected default state for medium difficulty', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('money')).toHaveText('650');
    await expect(page.getByTestId('lives')).toHaveText('100');
    await expect(page.getByTestId('round')).toHaveText('Round 1');
    await expect(page.getByTestId('start-round')).toContainText('Deploy Round 1');
  });

  test('changing difficulty resets starting resources', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/');
    await page.getByRole('button', { name: 'Intel' }).click();
    await page.locator('select').first().selectOption('HARD');

    await expect(page.getByTestId('money')).toHaveText('500');
    await expect(page.getByTestId('lives')).toHaveText('75');
    await expect(page.getByTestId('round')).toHaveText('Round 1');
  });

  test('can place a tower and clear round one', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('tower-dart').click();
    await page.getByTestId('game-canvas').click({ position: { x: 260, y: 260 } });

    await expect(page.getByTestId('money')).toHaveText('450');

    await page.getByTestId('start-round').click();

    await expect(page.getByTestId('round')).toHaveText('Round 2', { timeout: 25_000 });
    await expect(page.getByTestId('start-round')).toContainText('Deploy Round 2');
  });
});
