import { test, expect } from '@playwright/test';
import { createExample } from '../../src/domain/resume/example';

const STORAGE_KEY = 'resumestudio.draft.v1';

async function openMobilePreview(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.addInitScript(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), { key: STORAGE_KEY, resume: createExample() });
  await page.goto('./');
  await page.getByRole('button', { name: /^简历预览/ }).click();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
}

for (const width of [360, 390, 768]) {
  test(`zoom controls fit touch targets and the zoomed page stays reachable at ${width}px`, async ({ page }) => {
    await openMobilePreview(page, width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Touch targets in the preview footer meet the 44px guideline.
    for (const name of ['放大预览', '缩小预览']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    // Zoom to 130%: the sheet may scroll inside the panel, never the page,
    // and its left edge must remain reachable instead of being clipped.
    const zoomIn = page.getByRole('button', { name: '放大预览' });
    for (let step = 0; step < 3; step += 1) await zoomIn.click();
    await expect(zoomIn).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const zoomed = await page.evaluate(() => {
      const panel = document.querySelector('.preview-scroll') as HTMLElement;
      panel.scrollLeft = 99999;
      const overflow = panel.scrollWidth - panel.clientWidth;
      const scrolled = panel.scrollLeft;
      panel.scrollLeft = 0;
      const sheetLeft = document.querySelector('.pdf-sheet')?.getBoundingClientRect().left ?? -1;
      return { overflow, scrolled, sheetLeft };
    });
    expect(zoomed.overflow).toBeGreaterThan(0);
    expect(zoomed.scrolled).toBeGreaterThan(0);
    expect(zoomed.sheetLeft).toBeGreaterThanOrEqual(0);

    // Zoom back out to the minimum, then reset via the percentage button.
    const zoomOut = page.getByRole('button', { name: '缩小预览' });
    for (let step = 0; step < 6; step += 1) await zoomOut.click();
    await expect(zoomOut).toBeDisabled();
    await expect(zoomIn).toBeEnabled();
    await page.getByRole('button', { name: '70%' }).click();
    await expect(page.getByRole('button', { name: '100%' })).toBeVisible();
    expect(await page.evaluate(() => {
      const panel = document.querySelector('.preview-scroll') as HTMLElement;
      return panel.scrollWidth <= panel.clientWidth;
    })).toBe(true);
  });
}

test('multi-page preview scrolls to later pages on a narrow viewport', async ({ page }) => {
  const doc = createExample();
  doc.sections = doc.sections.map(section => ({
    ...section,
    items: [...section.items, ...section.items.map((item, index) => ({ ...item, id: `extra-${section.id}-${index}` }))],
  }));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), { key: STORAGE_KEY, resume: doc });
  await page.goto('./');
  await page.getByRole('button', { name: /^简历预览/ }).click();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  await expect(page.locator('.page-count')).toHaveText('2 页');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => {
    const panel = document.querySelector('.preview-scroll') as HTMLElement;
    panel.scrollTop = panel.scrollHeight;
  });
  const secondVisible = await page.evaluate(() => {
    const panel = document.querySelector('.preview-scroll') as HTMLElement;
    const second = document.querySelectorAll('.pdf-sheet')[1]?.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    return Boolean(second) && second.top < bounds.bottom && second.bottom > bounds.top;
  });
  expect(secondVisible).toBe(true);
});
