import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose, blocking = false }: { title: string; children: ReactNode; onClose: () => void; blocking?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!blocking) onClose(); }} onClick={event => { if (!blocking && event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-header"><span className="eyebrow">RESUMESTUDIO</span>{!blocking && <button className="icon-button" onClick={onClose} aria-label="关闭对话框"><X size={18} /></button>}</div>
    <h2 id={id}>{title}</h2>{children}
  </dialog>;
}
