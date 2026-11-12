import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExample } from '../../src/domain/resume/example';

const STORAGE_KEY = 'resumestudio.draft.v1';
type Contacts = { email: string; website: string };

async function openExample(page: Page, contacts: Contacts = { email: '', website: '' }) {
  const resume = createExample();
  Object.assign(resume.basics, contacts);
  await page.addInitScript(({ key, document }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(document));
  }, { key: STORAGE_KEY, document: resume });
  await page.goto('./');
}

async function expectSavedContacts(page: Page, contacts: Contacts) {
  await expect.poll(() => page.evaluate(key => {
    const basics = JSON.parse(localStorage.getItem(key) || '{}').basics;
    return basics && { email: basics.email, website: basics.website };
  }, STORAGE_KEY)).toEqual(contacts);
}

async function expectAssociatedHint(page: Page, input: Locator, invalid: boolean) {
  if (invalid) await expect(input).toHaveAttribute('aria-invalid', 'true');
  else await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  const description = await input.getAttribute('aria-describedby');
  expect(description).toBeTruthy();
  for (const id of description!.trim().split(/\s+/)) {
    const hint = page.locator(`[id="${id}"]`);
    await expect(hint).toHaveCount(1);
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(/\S/);
    if (invalid) await expect(hint).toContainText('可以继续编辑');
  }
}

async function exportedPdf(page: Page, testInfo: TestInfo, name: string) {
  const button = page.getByRole('button', { name: '导出 PDF', exact: true });
  await expect(button).toBeEnabled();
  const downloading = page.waitForEvent('download');
  await button.click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = testInfo.outputPath(name);
  await download.saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const task = getDocument({ data: new Uint8Array(bytes) });
  try {
    const document = await task.promise;
    const links: string[] = [];
    const text: string[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const pdfPage = await document.getPage(number);
      for (const annotation of await pdfPage.getAnnotations()) {
        if (annotation.subtype === 'Link') links.push(annotation.url || annotation.unsafeUrl || '');
      }
      const content = await pdfPage.getTextContent();
      text.push(content.items.map(item => 'str' in item ? item.str : '').join(''));
    }
    return { links: [...new Set(links)], text: text.join('') };
  } finally {
    await task.destroy();
  }
}

test('contact hints are associated, non-blocking, and clear when corrected', async ({ page }, testInfo) => {
  await openExample(page);
  const email = page.getByLabel('电子邮箱', { exact: true });
  const website = page.getByLabel('个人网站 / 作品集', { exact: true });
  await expectAssociatedHint(page, email, false);
  await expectAssociatedHint(page, website, false);
  expect(await email.getAttribute('aria-describedby')).not.toBe(await website.getAttribute('aria-describedby'));

  await website.fill('   ');
  await expectAssociatedHint(page, website, false);
  await expectSavedContacts(page, { email: '', website: '   ' });

  const partial = { email: 'student@', website: 'https://' };
  await email.fill(partial.email);
  await website.fill(partial.website);
  await expectAssociatedHint(page, email, true);
  await expectAssociatedHint(page, website, true);
  await expectSavedContacts(page, partial);
  await email.locator('..').evaluate(element => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('contact-feedback-desktop.png'), fullPage: true });
  await page.reload();
  await expect(email).toHaveValue(partial.email);
  await expect(website).toHaveValue(partial.website);
  await expectAssociatedHint(page, email, true);
  await expectAssociatedHint(page, website, true);

  const corrected = { email: 'student+portfolio@example.test', website: 'portfolio.example.test/work' };
  await email.fill(corrected.email);
  await website.fill(corrected.website);
  await expectAssociatedHint(page, email, false);
  await expectAssociatedHint(page, website, false);
  await expectSavedContacts(page, corrected);
  await email.fill('');
  await website.fill('');
  await expectAssociatedHint(page, email, false);
  await expectAssociatedHint(page, website, false);
  await expectSavedContacts(page, { email: '', website: '' });
});

test('contact warnings remain usable in a 360px viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openExample(page);
  const contacts = { email: 'student@', website: 'https://demo:fictional@example.test' };
  const email = page.getByLabel('电子邮箱', { exact: true });
  const website = page.getByLabel('个人网站 / 作品集', { exact: true });
  await email.fill(contacts.email);
  await website.fill(contacts.website);
  await expectAssociatedHint(page, email, true);
  await expectAssociatedHint(page, website, true);
  await expectSavedContacts(page, contacts);
  await email.locator('..').evaluate(element => element.scrollIntoView({ block: 'start' }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('contact-feedback-360.png'), fullPage: true });
});

test('PDF keeps invalid contacts as text and restores only safe link annotations', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const invalidEmail = 'student@example.test?subject=hello';
  await openExample(page, { email: invalidEmail, website: 'javascript:alert(1)' });
  const email = page.getByLabel('电子邮箱', { exact: true });
  const website = page.getByLabel('个人网站 / 作品集', { exact: true });
  for (const [index, value] of ['javascript:alert(1)', 'https://demo:fictional@example.test'].entries()) {
    await website.fill(value);
    await expectAssociatedHint(page, email, true);
    await expectAssociatedHint(page, website, true);
    await expectSavedContacts(page, { email: invalidEmail, website: value });
    const pdf = await exportedPdf(page, testInfo, `invalid-contacts-${index}.pdf`);
    expect(pdf.links).toEqual([]);
    expect(pdf.text.replace(/\s/g, '')).toContain(invalidEmail);
    expect(pdf.text.replace(/\s/g, '')).toContain(value);
  }

  const corrected = { email: 'student+portfolio@example.test', website: 'https://portfolio.example.test/work' };
  await email.fill(corrected.email);
  await website.fill(corrected.website);
  await expectAssociatedHint(page, email, false);
  await expectAssociatedHint(page, website, false);
  await expectSavedContacts(page, corrected);
  const pdf = await exportedPdf(page, testInfo, 'corrected-contacts.pdf');
  expect(pdf.links.sort()).toEqual(['mailto:student%2Bportfolio@example.test', corrected.website].sort());
  expect(pdf.text.replace(/\s/g, '')).toContain(corrected.email);
});
