import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExample } from '../../src/domain/resume/example';

const STORAGE_KEY = 'resumestudio.draft.v1';
async function example(page: Page) {
  await page.getByRole('button', { name: '没有灵感？看看示例' }).click();
  await page.getByLabel('替换前下载当前 JSON 备份').uncheck();
  await page.getByRole('button', { name: '载入示例', exact: true }).click();
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
}

test('edit, save, reorder, export actual PDF and restore backup', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeDisabled();
  await example(page);
  await page.getByLabel('姓名', { exact: true }).fill('陈星河');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').basics?.name, STORAGE_KEY)).toBe('陈星河');
  await page.reload();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('陈星河');
  await page.getByRole('button', { name: '教育背景 02', exact: true }).click();
  await expect(page.getByRole('button', { name: '上移教育背景', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '隐藏教育背景', exact: true }).click();
  await expect(page.getByText('此模块已隐藏，仍可编辑。', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '显示教育背景', exact: true }).click();
  await page.getByRole('button', { name: '下移教育背景', exact: true }).click();
  await expect(page.getByRole('button', { name: '教育背景 03', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '添加教育经历', exact: true }).click();
  await page.getByLabel('学校名称', { exact: true }).last().fill('青山学院');
  await page.getByRole('button', { name: '模板与排版', exact: true }).click();
  await page.getByRole('button', { name: '留白', exact: false }).click();
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PDF', exact: true }).click();
  const pdf = await pdfDownload;
  const pdfPath = testInfo.outputPath('resume.pdf');
  await pdf.saveAs(pdfPath);
  const file = await readFile(pdfPath);
  expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  const pdfTask = getDocument({ data: new Uint8Array(file) });
  const document = await pdfTask.promise;
  const content = await (await document.getPage(1)).getTextContent();
  const text = content.items.map(item => 'str' in item ? item.str : '').join('');
  expect(text).toContain('陈星河');
  expect(text).toContain('青山学院');
  await pdfTask.destroy();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '备份', exact: true }).click();
  const json = await download;
  const path = testInfo.outputPath('backup.json');
  await json.saveAs(path);
  await page.getByRole('button', { name: '新建空白简历', exact: true }).click();
  await page.getByLabel('替换前下载当前 JSON 备份').uncheck();
  await page.getByRole('dialog').getByRole('button', { name: '新建空白简历', exact: true }).click();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('');
  await page.getByLabel('选择 JSON 备份').setInputFiles(path);
  await page.getByLabel('替换前下载当前 JSON 备份').uncheck();
  await page.getByRole('button', { name: '确认恢复', exact: true }).click();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('陈星河');
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
});

test('associates field hints with their inputs and keeps invalid websites editable', async ({ page }, testInfo) => {
  await page.goto('./');
  const website = page.getByLabel('个人网站 / 作品集', { exact: true });
  const optionalHint = '选填，可填写 http(s) 网址或裸域名，例如 example.com。';
  await expect(website).toHaveAccessibleDescription(optionalHint);
  await website.fill('javascript:alert(1)');
  await expect(website).toHaveValue('javascript:alert(1)');
  await expect(website).toHaveAccessibleDescription('请核对网址，可填写 https://example.com 或 example.com，不要包含账号密码。可以继续编辑，当前内容不生成链接。');
  await website.locator('..').screenshot({ path: testInfo.outputPath('field-hints.png') });
  await website.fill('https://example.com');
  await expect(website).toHaveAccessibleDescription(optionalHint);
  await website.fill('');
  await expect(website).toHaveAccessibleDescription(optionalHint);
  await expect(page.getByLabel('个人简介', { exact: true })).toHaveAccessibleDescription('选填。简洁、具体，让读者快速了解你。');
  await expect(page.getByLabel('姓名', { exact: true })).not.toHaveAttribute('aria-describedby');
});

test('rejects corrupt import and keeps saved content', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('姓名', { exact: true }).fill('保留内容');
  await page.getByLabel('选择 JSON 备份').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('JSON');
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('保留内容');
});

test('preserves corrupt local data until user explicitly starts again', async ({ page }) => {
  await page.addInitScript(key => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{unrecoverable'); }, STORAGE_KEY);
  await page.goto('./');
  await expect(page.getByRole('dialog')).toContainText('原始草稿');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{unrecoverable');
  await page.getByRole('button', { name: '放弃原草稿并新建' }).click();
  await page.getByLabel('姓名', { exact: true }).fill('重新开始');
  await expect.poll(() => page.evaluate(key => { try { return JSON.parse(localStorage.getItem(key) || '{}').basics?.name; } catch { return undefined; } }, STORAGE_KEY)).toBe('重新开始');
});

test('mobile navigation, preview, export and viewport fit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const exampleDoc = createExample();
  await page.addInitScript(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), { key: STORAGE_KEY, resume: exampleDoc });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '导出 PDF', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '打开模块导航' }).click();
  await page.getByRole('button', { name: '项目经历 04', exact: true }).click();
  await expect(page.getByLabel('项目名称', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^简历预览/ }).click();
  await expect(page.getByRole('img', { name: '简历预览第 1 页' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
