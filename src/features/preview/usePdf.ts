import { useEffect, useRef, useState } from 'react';
import type { Resume } from '../../domain/resume/model';

export function usePdf(document: Resume) {
  const [state, setState] = useState<{ blob?: Blob; busy: boolean; error?: string }>({ busy: true });
  const [retry, setRetry] = useState(0);
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const instance = new Worker(new URL('./pdf.worker.tsx', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = event => {
      if (event.data.id !== sequence.current) return;
      setState(event.data.error ? { busy: false, error: 'PDF 生成失败，请重试。若持续失败，请先导出 JSON 备份。' } : { blob: event.data.blob, busy: false });
    };
    instance.onerror = () => setState({ busy: false, error: 'PDF 引擎未能启动，请刷新页面或导出 JSON 备份。' });
    return () => { instance.terminate(); worker.current = null; };
  }, [retry]);
  useEffect(() => {
    const id = ++sequence.current;
    setState(state => ({ ...state, busy: true, error: undefined }));
    const timer = setTimeout(() => worker.current?.postMessage({ id, document, fontBase: new URL(`${import.meta.env.BASE_URL}fonts/`, window.location.origin).href }), 400);
    return () => clearTimeout(timer);
  }, [document, retry]);
  return { ...state, retry: () => setRetry(value => value + 1) };
}
