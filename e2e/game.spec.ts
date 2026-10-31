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

test('can build while paused with an unobscured grid', async ({ page }) => {
  await page.goto('/');
  await cell(page, 1, 4);
  await page.locator('#start-wave').click();
  await page.locator('#pause').click();
  await expect(page.locator('#phase')).toHaveText('一時停止');
  await expect(page.locator('#board-overlay')).toBeHidden();
  const funds = Number(await page.locator('#money').textContent());
  await cell(page, 3, 5);
  await expect(page.locator('#money')).toHaveText(String(funds - 20));
  await expect(page.locator('#selected-name')).toHaveText('キャノン Lv.1');
  await expect(page.locator('#phase')).toHaveText('一時停止');
});

for (const tower of [
  { kind: 'mortar', name: '迫撃砲', price: 35, upgrade: 40, refund: 52, effect: '範囲' },
  { kind: 'antiair', name: '対空砲', price: 25, upgrade: 30, refund: 38, effect: '飛行専用' },
  { kind: 'frost', name: '冷却砲', price: 30, upgrade: 35, refund: 45, effect: '減速' },
]) {
  test(`choose, build and upgrade ${tower.kind} with its actual price and effect`, async ({ page }) => {
    await page.goto('/');
    const choice = page.locator(`[data-tower-kind="${tower.kind}"]`);
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#build-effect')).toContainText(tower.effect);
    await cell(page, 3, 5);
    await expect(page.locator('#money')).toHaveText(String(140 - tower.price));
    await expect(page.locator('#selected-name')).toHaveText(`${tower.name} Lv.1`);
    await expect(page.locator('#selected-effect')).toContainText(tower.effect);
    await page.locator('#upgrade').click();
    await expect(page.locator('#money')).toHaveText(String(140 - tower.price - tower.upgrade));
    await page.locator('#sell').click();
    await expect(page.locator('#money')).toHaveText(String(140 - tower.price - tower.upgrade + tower.refund));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('explains both routes and previews every wave and enemy counter', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#route-description')).toContainText('左→右');
  await expect(page.locator('#route-description')).toContainText('上→下');
  await expect(page.locator('#wave-roster')).toContainText('通常 ×9');
  await page.locator('#wave-catalog summary').click();
  await expect(page.locator('#wave-catalog')).toContainText('飛行');
  await expect(page.locator('#wave-catalog')).toContainText('冷却無効');
  await expect(page.locator('#wave-catalog')).toContainText('分裂');
  await expect(page.locator('#enemy-guide')).toContainText('減速');
  await expect(page.locator('#enemy-guide')).toContainText('対空砲');
});
