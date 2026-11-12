/// <reference lib="webworker" />
import { pdf } from '@react-pdf/renderer';
import { registerFonts, ResumePdf } from '../../templates/ResumePdf';
import type { Resume } from '../../domain/resume/model';

let pending: { id: number; document: Resume; fontBase: string } | undefined;
let working = false;
self.onmessage = async (event: MessageEvent<NonNullable<typeof pending>>) => {
  pending = event.data;
  if (working) return;
  working = true;
  while (pending) {
    const job = pending;
    pending = undefined;
    try {
      registerFonts(job.fontBase);
      const blob = await pdf(<ResumePdf document={job.document} />).toBlob();
      self.postMessage({ id: job.id, blob });
    } catch (error) {
      self.postMessage({ id: job.id, error: error instanceof Error ? error.message : 'PDF 生成失败' });
    }
  }
  working = false;
};
