import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderToFile } from '@react-pdf/renderer';
import { registerFonts, ResumePdf } from '../src/templates/ResumePdf';
import { createExample } from '../src/domain/resume/example';
import { createEntry } from '../src/domain/resume/model';

const output = resolve('.tools/pdf-check');
await mkdir(output, { recursive: true });
registerFonts(`${resolve('public/fonts')}/`);
const sample = createExample();
await renderToFile(<ResumePdf document={sample} />, `${output}/sample.pdf`);
const long = createExample();
long.sections.find(s => s.kind === 'experience')!.items = Array.from({ length: 9 }, (_, index) => ({
  ...createEntry(), title: `这是一个比较长的机构名称与项目标题用于验证中英文混排 Product Design ${index + 1}`,
  subtitle: '交互设计师 / Interaction Designer', period: '2023.01 — 2026.12', location: '上海 / Remote',
  description: Array.from({ length: 5 }, () => '参与需求梳理、用户研究与体验设计。验证中文标点，长文本自动换行，不应超出页面或覆盖日期。Designed clear, accessible experiences with the engineering team.').join('\n'),
}));
long.basics.website = 'https://example.com/portfolio/projects/research';
await renderToFile(<ResumePdf document={long} />, `${output}/long.pdf`);
execFileSync('python', ['scripts/check-pdf.py', output], { stdio: 'inherit' });
