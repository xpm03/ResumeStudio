import type { Resume } from '../domain/resume/model';
import manifest from './font-manifest.json';

export const fontAssets = manifest;
export type FontMode = keyof typeof manifest;

export function coversCodePoint(ranges: number[][], codePoint: number): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const [start, end] = ranges[middle];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}

/** Only rendered content selects the font. Hidden modules and metadata do not. */
export function fontModeForResume(resume: Resume): FontMode {
  const content = [...Object.values(resume.basics), '你的姓名 个人简介 未命名模块 • /'];
  for (const section of resume.sections) {
    if (!section.visible) continue;
    if (!section.items.some(item => [item.title, item.subtitle, item.description, item.period, item.location].some(value => value.trim()))) continue;
    content.push(section.title);
    for (const item of section.items) content.push(item.title, item.subtitle, item.period, item.location, item.description);
  }
  for (const text of content) {
    for (const character of text) {
      if (!/\s/u.test(character) && !coversCodePoint(manifest.common.ranges, character.codePointAt(0)!)) return 'full';
    }
  }
  return 'common';
}
