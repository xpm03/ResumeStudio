import { parseBackup, type Resume } from '../domain/resume/model';

export const STORAGE_KEY = 'resumestudio.draft.v1';
export type DraftState = { document?: Resume; error?: string; raw?: string };
export function loadDraft(storage: Pick<Storage, 'getItem'>): DraftState {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); } catch {
    return { error: '浏览器不允许读取本地存储。你仍可编辑，请及时导出 JSON 备份。' };
  }
  if (!raw) return {};
  try { return { document: parseBackup(raw) }; } catch {
    return { error: '保存的草稿无法读取。请先下载原始数据备份，再选择新建草稿；原数据尚未覆盖。', raw };
  }
}
export function saveDraft(storage: Pick<Storage, 'setItem'>, document: Resume): string | undefined {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(document)); } catch {
    return '无法保存到浏览器，可能空间不足或存储被禁用。请立即导出 JSON 备份。';
  }
}
export function downloadFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const fileName = (title: string) => title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 80) || '我的简历';
export function backup(document: Resume) {
  downloadFile(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }), `${fileName(document.title)}.resume.json`);
}
