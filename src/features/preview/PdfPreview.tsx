import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { FileText, LoaderCircle } from 'lucide-react';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function PdfPage({ pdf, pageNumber, zoom, onError }: { pdf: PDFDocumentProxy; pageNumber: number; zoom: number; onError: () => void }) {
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
    }).catch(() => { if (!cancelled) onError(); });
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
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [readError, setReadError] = useState(false);
  const onRenderError = useCallback(() => setReadError(true), []);
  useEffect(() => {
    if (!blob) { setPdf(undefined); onPages(0); return; }
    let cancelled = false;
    let task: ReturnType<typeof getDocument> | undefined;
    setReadError(false);
    void blob.arrayBuffer().then(data => {
      if (cancelled) return;
      task = getDocument({ data: new Uint8Array(data) });
      return task.promise;
    }).then(result => {
      if (cancelled || !result) return;
      setPdf(result); onPages(result.numPages);
    }).catch(() => { if (!cancelled) { setReadError(true); setPdf(undefined); onPages(0); } });
    return () => { cancelled = true; void task?.destroy(); };
  }, [blob, onPages]);
  if (error || readError) return <div className="preview-state" role="alert"><FileText size={30} /><h3>预览暂时不可用</h3><p>{error || '无法显示 PDF，请重试生成。'}</p><button className="button" onClick={onRetry}>重新生成</button></div>;
  if (!pdf) return <div className="preview-state"><LoaderCircle className="spin" size={25} /><h3>正在准备你的纸张</h3><p>首次使用需要载入本地中文字体，稍候即可开始。</p></div>;
  return <div className={`pdf-pages ${busy ? 'updating' : ''}`} aria-busy={busy}>{Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={`${pdf.fingerprints[0]}-${index}`} pdf={pdf} pageNumber={index + 1} zoom={zoom} onError={onRenderError} />)}</div>;
}
