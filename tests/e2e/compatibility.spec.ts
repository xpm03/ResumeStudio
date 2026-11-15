import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExample } from '../../src/domain/resume/example';

test('edit, preview, save and export a readable Chinese PDF', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(doc => {
    if (!localStorage.getItem('resumestudio.draft.v1')) localStorage.setItem('resumestudio.draft.v1', JSON.stringify(doc));
  }, createExample());
  await page.goto('./');
  await page.getByLabel('姓名', { exact: true }).fill('陈星河');
  const exportButton = page.getByRole('button', { name: '导出 PDF', exact: true });
  await expect(exportButton).toBeEnabled();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await exportButton.click();
  const path = testInfo.outputPath('compatible.pdf');
  await (await downloading).saveAs(path);
  const task = getDocument({ data: new Uint8Array(await readFile(path)) });
  try {
    const doc = await task.promise;
    const content = await (await doc.getPage(1)).getTextContent();
    expect(content.items.map(item => 'str' in item ? item.str : '').join('')).toContain('陈星河');
  } finally { await task.destroy(); }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('resumestudio.draft.v1') || '{}').basics?.name)).toBe('陈星河');
  await page.reload();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('陈星河');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^简历预览/ }).click();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  await expect(exportButton).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
