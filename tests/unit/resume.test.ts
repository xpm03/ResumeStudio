import { describe, expect, it } from 'vitest';
import { createBlank, createEntry, moveItem, parseBackup, parseResume, safeWebLink } from '../../src/domain/resume/model';
import { createExample } from '../../src/domain/resume/example';
import { loadDraft, saveDraft, STORAGE_KEY } from '../../src/storage/draft';

describe('resume backups', () => {
  it('round-trips Chinese data, ordering and design settings', () => {
    const doc = createExample();
    doc.sections = moveItem(doc.sections, 0, 1);
    doc.design.color = '#734b56';
    expect(parseBackup(JSON.stringify(doc))).toEqual(doc);
  });
  it('rejects invalid JSON, unknown versions and oversized input', () => {
    expect(() => parseBackup('{')).toThrow('JSON');
    expect(() => parseResume({ ...createBlank(), schemaVersion: 2 })).toThrow('版本');
    expect(() => parseBackup(' '.repeat(1024 * 1024 + 1))).toThrow('1 MB');
  });
  it('rejects duplicate identifiers and module kinds', () => {
    const doc = createExample();
    doc.sections[1].id = doc.sections[0].id;
    expect(() => parseResume(doc)).toThrow('标识');
    const another = createBlank();
    another.sections[1].kind = another.sections[0].kind;
    expect(() => parseResume(another)).toThrow('模块');
  });
  it('rejects unsupported style values and abusive entry counts', () => {
    const doc = createBlank();
    expect(() => parseResume({ ...doc, design: { ...doc.design, fontSize: 1 } })).toThrow('排版');
    doc.sections[0].items = Array.from({ length: 31 }, createEntry);
    expect(() => parseResume(doc)).toThrow('30');
  });
  it('drops unknown properties instead of merging imported objects', () => {
    const doc = createBlank();
    expect(parseResume({ ...doc, tracking: 'https://example.com' })).not.toHaveProperty('tracking');
  });
});

describe('ordered editing and links', () => {
  it('moves content without mutating or dropping neighbors', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(items).toEqual(['a', 'b', 'c']);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 2, 1)).toBe(items);
  });
  it('allows web links and rejects executable schemes or credentials', () => {
    expect(safeWebLink('portfolio.example.com')).toBe('https://portfolio.example.com/');
    expect(safeWebLink('https://example.com/work')).toBe('https://example.com/work');
    for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'https://user:secret@example.com']) expect(safeWebLink(value)).toBeUndefined();
  });
});

describe('draft recovery', () => {
  it('preserves corrupt stored bytes for manual recovery', () => {
    const state = loadDraft({ getItem: () => '{broken' });
    expect(state.raw).toBe('{broken');
    expect(state.document).toBeUndefined();
    expect(state.error).toBeTruthy();
  });
  it('returns a usable saved draft', () => {
    const doc = createExample();
    expect(loadDraft({ getItem: key => key === STORAGE_KEY ? JSON.stringify(doc) : null }).document).toEqual(doc);
  });
  it('surfaces denied reads and quota failures instead of claiming saved', () => {
    expect(loadDraft({ getItem: () => { throw new Error('denied'); } }).error).toBeTruthy();
    expect(saveDraft({ setItem: () => { throw new Error('quota'); } }, createBlank())).toContain('无法保存');
  });
});
