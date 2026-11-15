import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExample } from '../../src/domain/resume/example';

test('common resumes download small fonts; rare names retain full PDF coverage', async ({ page }, testInfo) => {
  const fonts = new Map<string, number>();
  const received: Promise<void>[] = [];
  page.on('response', response => {
    if (!response.url().includes('.ttf')) return;
    received.push(response.body().then(body => { fonts.set(response.url(), body.length); }));
  });
  await page.addInitScript(doc => localStorage.setItem('resumestudio.draft.v1', JSON.stringify(doc)), createExample());
  await page.goto('./');
  const exportButton = page.getByRole('button', { name: '导出 PDF', exact: true });
  await expect(exportButton).toBeEnabled();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  await Promise.all(received);
  expect(fonts.size).toBe(2);
  expect([...fonts.keys()].every(url => url.includes('-Common-'))).toBe(true);
  expect([...fonts.values()].reduce((a, b) => a + b, 0)).toBeLessThan(5_000_000);

  await page.getByLabel('姓名', { exact: true }).fill('林知夏 · 龘曌');
  await expect(exportButton).toBeEnabled();
  const downloaded = page.waitForEvent('download');
  await exportButton.click();
  const path = testInfo.outputPath('rare-name.pdf');
  await (await downloaded).saveAs(path);
  await Promise.all(received);
  expect([...fonts.keys()].filter(url => !url.includes('-Common-')).length).toBe(2);
  const task = getDocument({ data: new Uint8Array(await readFile(path)) });
  try {
    const doc = await task.promise;
    const content = await (await doc.getPage(1)).getTextContent();
    expect(content.items.map(item => 'str' in item ? item.str : '').join('')).toContain('龘曌');
  } finally { await task.destroy(); }

  await page.getByLabel('姓名', { exact: true }).fill('林知夏');
  await expect(exportButton).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a failed font request can recover without losing the edited resume', async ({ page }) => {
  let failed = false;
  await page.route(/fonts\/.*\.ttf/, route => {
    if (!failed) { failed = true; return route.abort('failed'); }
    return route.continue();
  });
  await page.addInitScript(doc => localStorage.setItem('resumestudio.draft.v1', JSON.stringify(doc)), createExample());
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('生成失败');
  await page.getByLabel('姓名', { exact: true }).fill('恢复后的草稿');
  await page.getByRole('button', { name: '重新生成', exact: true }).click();
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('恢复后的草稿');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('preview stays usable during overlapping edits and zoom changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    // Keep the next PDF loading while the previous page is zoomed. This makes
    // premature disposal reproducible instead of relying on a timing race.
    const original = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = async function () {
      const data = await original.call(this);
      if (this.type === 'application/pdf') await new Promise(resolve => setTimeout(resolve, 500));
      return data;
    };
  });
  await page.addInitScript(doc => localStorage.setItem('resumestudio.draft.v1', JSON.stringify(doc)), createExample());
  await page.goto('./');
  const image = page.getByRole('img', { name: '简历预览第 1 页' });
  await expect(image).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const previous = await page.locator('.pdf-pages').getAttribute('data-document-id');
    await page.getByLabel('姓名', { exact: true }).fill(`林知夏 ${i}`);
    // The worker has finished, but the delayed replacement is not displayed yet.
    await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '放大预览', exact: true }).click();
    await page.getByRole('button', { name: '缩小预览', exact: true }).click();
    await expect.poll(() => page.locator('.pdf-pages').getAttribute('data-document-id')).not.toBe(previous);
  }
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  await expect(image).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
