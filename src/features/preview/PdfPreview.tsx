import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist';
import { FileText, LoaderCircle } from 'lucide-react';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function PdfPage({ pdf, pageNumber, zoom, onError }: { pdf: PDFDocumentProxy; pageNumber: number; zoom: number; onError: (pdf: PDFDocumentProxy) => void }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(595);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    if (wrapper.current) observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void pdf.getPage(pageNumber).then(page => {
      if (cancelled || !canvas.current) return;
      const natural = page.getViewport({ scale: 1 });
      const scale = width / natural.width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * ratio });
      canvas.current.width = Math.floor(viewport.width);
      canvas.current.height = Math.floor(viewport.height);
      task = page.render({ canvas: canvas.current, viewport });
      return task.promise;
    }).catch(() => { if (!cancelled) onError(pdf); });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, pageNumber, width, zoom, onError]);
  return <div className="pdf-sheet" ref={wrapper} style={{ width: `${zoom}%` }}>
    <canvas ref={canvas} role="img" aria-label={`简历预览第 ${pageNumber} 页`} />
    <span className="sheet-page-number">{pageNumber}</span>
  </div>;
}

export function PdfPreview({ blob, busy, error, zoom, onPages, onRetry }: {
  blob?: Blob; busy: boolean; error?: string; zoom: number; onPages: (pages: number) => void; onRetry: () => void;
}) {
  const [resource, setResource] = useState<{ pdf: PDFDocumentProxy; task: PDFDocumentLoadingTask }>();
  const current = useRef<typeof resource>(undefined);
  const ownedTasks = useRef(new Set<PDFDocumentLoadingTask>());
  const [readError, setReadError] = useState(false);
  const onRenderError = useCallback((pdf: PDFDocumentProxy) => {
    if (current.current?.pdf === pdf) setReadError(true);
  }, []);
  const release = useCallback((task: PDFDocumentLoadingTask) => {
    if (ownedTasks.current.delete(task)) void task.destroy().catch(() => { /* Already stopped; no active preview relies on it. */ });
  }, []);
  useEffect(() => () => { for (const task of ownedTasks.current) release(task); }, [release]);
  // Release the old PDF only after React has replaced its canvas children.
  useEffect(() => () => { if (resource) release(resource.task); }, [resource, release]);
  useEffect(() => {
    if (!blob) { current.current = undefined; setResource(undefined); onPages(0); return; }
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    setReadError(false);
    void blob.arrayBuffer().then(data => {
      if (cancelled) return;
      task = getDocument({ data: new Uint8Array(data) });
      ownedTasks.current.add(task);
      return task.promise;
    }).then(result => {
      if (cancelled || !result || !task) return;
      current.current = { pdf: result, task };
      setResource(current.current); setReadError(false); onPages(result.numPages);
    }).catch(() => {
      if (!cancelled) { setReadError(true); current.current = undefined; setResource(undefined); onPages(0); }
      if (task) release(task);
    });
    return () => {
      cancelled = true;
      // A pending replacement can be cancelled immediately; a displayed PDF must stay alive.
      if (task && task !== current.current?.task) release(task);
    };
  }, [blob, onPages, release]);
  const pdf = resource?.pdf;
  if (error || readError) return <div className="preview-state" role="alert"><FileText size={30} /><h3>预览暂时不可用</h3><p>{error || '无法显示 PDF，请重试生成。'}</p><button className="button" onClick={onRetry}>重新生成</button></div>;
  if (!pdf) return <div className="preview-state"><LoaderCircle className="spin" size={25} /><h3>正在准备你的纸张</h3><p>首次使用需要载入本地中文字体，稍候即可开始。</p></div>;
  return <div className={`pdf-pages ${busy ? 'updating' : ''}`} aria-busy={busy} data-document-id={pdf.fingerprints[0]}>{Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={`${pdf.fingerprints[0]}-${index}`} pdf={pdf} pageNumber={index + 1} zoom={zoom} onError={onRenderError} />)}</div>;
}
