import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function cell(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('#battlefield');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const point = { x: box.x + (x + 0.5) * box.width / 16, y: box.y + (y + 0.5) * box.height / 12 };
  if (test.info().project.name.startsWith('mobile')) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

test('build, upgrade, sell and keep layout within the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#money')).toHaveText('140');
  await cell(page, 3, 5);
  await expect(page.locator('#money')).toHaveText('120');
  await expect(page.locator('#selected-name')).toHaveText('キャノン Lv.1');
  await page.locator('#upgrade').click();
  await expect(page.locator('#money')).toHaveText('90');
  await expect(page.locator('#selected-name')).toHaveText('キャノン Lv.2');
  await page.locator('#sell').click();
  await expect(page.locator('#money')).toHaveText('125');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('reject a sealed entry without charging funds', async ({ page }) => {
  await page.goto('/');
  await cell(page, 1, 5);
  await cell(page, 0, 4);
  await cell(page, 0, 6);
  await expect(page.locator('#money')).toHaveText('100');
  await expect(page.locator('#feedback')).toContainText('通路を完全に塞ぐ');
});

test('start combat, pause, resume and restart', async ({ page }) => {
  await page.goto('/');
  await cell(page, 1, 4);
  await cell(page, 2, 4);
  await page.locator('#start-wave').click();
  await expect(page.locator('#wave')).toHaveText('1');
  await expect(page.locator('#pause')).toBeEnabled();
  await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 6000 });
  await page.locator('#pause').click();
  await expect(page.locator('#phase')).toHaveText('一時停止');
  const money = await page.locator('#money').textContent();
  await page.waitForTimeout(500);
  await expect(page.locator('#money')).toHaveText(money!);
  await page.locator('#pause').click();
  await expect(page.locator('#phase')).toHaveText('防衛中');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restart').click();
  await expect(page.locator('#money')).toHaveText('140');
  await expect(page.locator('#wave')).toHaveText('0');
});

test('keyboard can place and select a tower', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#battlefield');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('#money')).toHaveText('120');
  await page.keyboard.press('Enter');
  await expect(page.locator('#selected-name')).toHaveText('キャノン Lv.1');
});
