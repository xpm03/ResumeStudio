import { describe, expect, it } from 'vitest';
import { createBlank } from '../../src/domain/resume/model';
import { createExample } from '../../src/domain/resume/example';
import { coversCodePoint, fontAssets, fontModeForResume } from '../../src/templates/font-selection';

describe('on-demand font selection', () => {
  it('uses the small font for a blank page and common mixed-language resumes', () => {
    expect(fontModeForResume(createBlank())).toBe('common');
    const doc = createExample();
    doc.basics.name = '陈星河';
    doc.basics.headline = 'Développeur · TypeScript / C++';
    expect(fontModeForResume(doc)).toBe('common');
  });
  it('uses full fonts for rare characters in names and section details', () => {
    for (const character of ['龘', '曌']) {
      expect(coversCodePoint(fontAssets.full.ranges, character.codePointAt(0)!)).toBe(true);
      const doc = createExample();
      doc.basics.name += character;
      expect(fontModeForResume(doc)).toBe('full');
    }
    const doc = createExample();
    doc.sections[0].items[0].description += '曌';
    expect(fontModeForResume(doc)).toBe('full');
  });
  it('does not fetch full fonts because of hidden sections or document titles', () => {
    const doc = createExample();
    doc.title = '龘的草稿';
    doc.sections[0].visible = false;
    doc.sections[0].items[0].description = '曌';
    expect(fontModeForResume(doc)).toBe('common');
    doc.sections[0].visible = true;
    expect(fontModeForResume(doc)).toBe('full');
  });
  it('recognizes boundaries without assuming a contiguous Chinese repertoire', () => {
    expect(coversCodePoint([[10, 12], [20, 21]], 10)).toBe(true);
    expect(coversCodePoint([[10, 12], [20, 21]], 12)).toBe(true);
    expect(coversCodePoint([[10, 12], [20, 21]], 13)).toBe(false);
    expect(coversCodePoint([[10, 12], [20, 21]], 22)).toBe(false);
  });
});
