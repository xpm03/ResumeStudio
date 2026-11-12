export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const COLORS = ['#245c4a', '#243b53', '#734b56', '#292929'] as const;
export type SectionKind = 'education' | 'experience' | 'projects' | 'skills';
export interface Entry {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  location: string;
  description: string;
}
export interface Section {
  id: string;
  kind: SectionKind;
  title: string;
  visible: boolean;
  items: Entry[];
}
export interface Resume {
  schemaVersion: 1;
  title: string;
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    summary: string;
  };
  sections: Section[];
  design: {
    template: 'classic' | 'editorial';
    color: typeof COLORS[number];
    fontSize: number;
    lineHeight: number;
    margin: number;
  };
}

export const sectionLabels: Record<SectionKind, string> = {
  education: '教育背景', experience: '工作与实习', projects: '项目经历', skills: '专业技能',
};
export const newId = () => crypto.randomUUID();
export const createEntry = (): Entry => ({ id: newId(), title: '', subtitle: '', period: '', location: '', description: '' });
export function createBlank(): Resume {
  return {
    schemaVersion: 1,
    title: '我的第一份简历',
    basics: { name: '', headline: '', email: '', phone: '', location: '', website: '', summary: '' },
    sections: (Object.keys(sectionLabels) as SectionKind[]).map(kind => ({
      id: newId(), kind, title: sectionLabels[kind], visible: true, items: [],
    })),
    design: { template: 'classic', color: COLORS[0], fontSize: 10.5, lineHeight: 1.55, margin: 40 },
  };
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (index < 0 || index >= items.length || next < 0 || next >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

export function safeWebLink(value: string): string | undefined {
  const input = value.trim();
  if (!input) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return undefined;
    // Reject a supplied scheme instead of treating it as a domain.
    if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) return undefined;
    return url.href;
  } catch { return undefined; }
}

/** Common unquoted ASCII mailboxes only; other input remains editable plain text. */
export function safeEmailLink(value: string): string | undefined {
  const parts = value.split('@');
  if (parts.length !== 2) return undefined;
  const [local, domain] = parts;
  const atom = /^[a-z\d!#$%&'*+/=?^_`{|}~-]+$/i;
  const label = /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;
  if (!local || local.length > 64 || !local.split('.').every(part => atom.test(part))) return undefined;
  if (domain.length > 253 || !domain.includes('.') || !domain.split('.').every(part => label.test(part))) return undefined;
  // RFC 6068: reserved URI characters in the mailbox must not become headers.
  return `mailto:${encodeURIComponent(local)}@${domain}`;
}

/** Advisory feedback only: never reject or rewrite an in-progress draft. */
export function contactFieldWarning(field: 'email' | 'website', value: string): string | undefined {
  if (!value.trim()) return undefined;
  if (field === 'email' && !safeEmailLink(value)) {
    return '邮箱可能尚未填写完整或不符合常见格式，请核对，例如 name@example.com。可以继续编辑，当前内容仅作为文字导出。';
  }
  if (field === 'website' && !safeWebLink(value)) {
    return '请核对网址，可填写 https://example.com 或 example.com，不要包含账号密码。可以继续编辑，当前内容不生成链接。';
  }
  return undefined;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('备份格式不正确：需要简历 JSON 对象。');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 200): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`备份包含缺失或过长的文字字段（上限 ${max} 字符）。`);
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('备份中的排版参数超出支持范围。');
  return value;
}

/** Reconstruct allowlisted fields, rather than merging untrusted input into state. */
export function parseResume(value: unknown): Resume {
  const doc = object(value);
  if (doc.schemaVersion !== SCHEMA_VERSION) throw new Error('不支持此备份版本。当前只支持 ResumeStudio v1 JSON 备份。');
  const b = object(doc.basics);
  const d = object(doc.design);
  if (!Array.isArray(doc.sections) || doc.sections.length !== 4) throw new Error('备份需包含教育、经历、项目和技能四个模块。');
  const ids = new Set<string>();
  const kinds = new Set<SectionKind>();
  const id = (value: unknown) => {
    const key = text(value, 100);
    if (!key || ids.has(key)) throw new Error('备份中存在空白或重复的条目标识。');
    ids.add(key);
    return key;
  };
  const sections = doc.sections.map(value => {
    const s = object(value);
    if (typeof s.kind !== 'string' || !Object.hasOwn(sectionLabels, s.kind) || kinds.has(s.kind as SectionKind)) throw new Error('备份含有未知或重复模块。');
    const kind = s.kind as SectionKind;
    kinds.add(kind);
    if (typeof s.visible !== 'boolean' || !Array.isArray(s.items) || s.items.length > 30) throw new Error('模块格式不正确，或条目超过 30 个。');
    return {
      id: id(s.id), kind, title: text(s.title, 60), visible: s.visible,
      items: s.items.map(value => {
        const item = object(value);
        return { id: id(item.id), title: text(item.title), subtitle: text(item.subtitle), period: text(item.period, 100), location: text(item.location, 100), description: text(item.description, 2000) };
      }),
    };
  });
  if (!COLORS.includes(d.color as typeof COLORS[number]) || !['classic', 'editorial'].includes(d.template as string)) throw new Error('备份中的模板或主题色暂不支持。');
  return {
    schemaVersion: 1, title: text(doc.title, 100),
    basics: { name: text(b.name, 100), headline: text(b.headline), email: text(b.email), phone: text(b.phone, 100), location: text(b.location, 100), website: text(b.website, 500), summary: text(b.summary, 2000) },
    sections,
    design: { template: d.template as Resume['design']['template'], color: d.color as Resume['design']['color'], fontSize: number(d.fontSize, 9, 13), lineHeight: number(d.lineHeight, 1.3, 1.9), margin: number(d.margin, 28, 60) },
  };
}

export function parseBackup(raw: string): Resume {
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw new Error('备份超过 1 MB，请选择较小的 ResumeStudio JSON 文件。');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('无法读取 JSON，请检查文件是否完整。'); }
  return parseResume(value);
}
