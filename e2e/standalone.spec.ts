import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('built HTML works alone with every external request blocked', async ({ page }) => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  // An about:blank document has no server or asset base, like a single-file preview.
  await page.setContent(html);
  await expect(page.locator('#money')).toHaveText('140');
  const canvas = page.locator('#battlefield');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const point = { x: box.x + 3.5 * box.width / 16, y: box.y + 5.5 * box.height / 12 };
  if (test.info().project.name.startsWith('mobile')) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(page.locator('#money')).toHaveText('120');
  await page.locator('#upgrade').click();
  await expect(page.locator('#money')).toHaveText('90');
  await page.locator('#sell').click();
  await expect(page.locator('#money')).toHaveText('125');
  await page.locator('#start-wave').click();
  await expect(page.locator('#wave')).toHaveText('1');
  await expect(page.locator('#phase')).toHaveText('防衛中');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
