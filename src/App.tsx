import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, BriefcaseBusiness, Check, CheckCheck, ChevronRight, Download, Eye, EyeOff, FileJson, FilePlus2, FileText, FolderGit2, CodeXml, LayoutTemplate, ListChecks, LoaderCircle, LockKeyhole, Menu, Minus, Plus, ShieldCheck, Sparkles, Upload, UserRound, X } from 'lucide-react';
import { createBlank, MAX_IMPORT_BYTES, moveItem, parseBackup, type Resume } from './domain/resume/model';
import { createExample } from './domain/resume/example';
import { backup, downloadFile, fileName, loadDraft, saveDraft, type DraftState } from './storage/draft';
import { BasicsEditor, DesignEditor, SectionEditor } from './features/editor/Fields';
import { usePdf } from './features/preview/usePdf';
import { Modal } from './components/Modal';

const sectionIcons = { education: BookOpen, experience: BriefcaseBusiness, projects: FolderGit2, skills: ListChecks };
const PdfPreview = lazy(() => import('./features/preview/PdfPreview').then(module => ({ default: module.PdfPreview })));
const descriptions = {
  basics: '从认识你开始。只保留与求职相关的信息。',
  education: '记录你的学习背景，以及值得被看见的积累。',
  experience: '用具体的行动和成果，讲清楚你的贡献。',
  projects: '挑选最能说明能力的项目，写出你的角色。',
  skills: '列出你能实际运用的能力，让优势清晰可见。',
  design: '让内容有呼吸感，让每一页都有好秩序。',
};

export default function App() {
  const [initial] = useState<DraftState>(() => { try { return loadDraft(window.localStorage); } catch { return { error: '浏览器存储不可用，请及时导出备份。' }; } });
  const [resume, setResume] = useState<Resume>(() => initial.document || createBlank());
  const [selected, setSelected] = useState('basics');
  const [mobileView, setMobileView] = useState('edit');
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<'example' | 'clear' | 'import' | 'privacy' | 'recovery' | null>(initial.raw ? 'recovery' : null);
  const [recoveryHold, setRecoveryHold] = useState(Boolean(initial.raw));
  const [saveState, setSaveState] = useState(initial.error || '准备保存');
  const [saveError, setSaveError] = useState(Boolean(initial.error));
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [candidate, setCandidate] = useState<Resume>();
  const [backupFirst, setBackupFirst] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const editorScroll = useRef<HTMLDivElement>(null);
  const pdf = usePdf(resume);
  const current = resume.sections.find(section => section.id === selected);
  const isDesign = selected === 'design';
  const currentTitle = isDesign ? '模板与排版' : current ? current.title || '未命名模块' : '基本信息';
  const currentNumber = isDesign ? '06' : current ? String(resume.sections.indexOf(current) + 2).padStart(2, '0') : '01';
  const completed = [Boolean(resume.basics.name), ...resume.sections.map(s => s.items.some(i => i.title || i.description))].filter(Boolean).length;
  useEffect(() => {
    if (recoveryHold) return;
    setSaveState('正在保存…');
    const timer = setTimeout(() => {
      let error: string | undefined;
      try { error = saveDraft(window.localStorage, resume); } catch { error = '浏览器存储不可用，请导出 JSON 备份。'; }
      setSaveError(Boolean(error)); setSaveState(error || '已保存到此浏览器');
    }, 600);
    return () => clearTimeout(timer);
  }, [resume, recoveryHold]);
  useEffect(() => {
    if (recoveryHold) return;
    const flush = () => { try { saveDraft(window.localStorage, resume); } catch { /* Normal autosave reports storage failures. */ } };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVisibility); };
  }, [resume, recoveryHold]);
  useEffect(() => { editorScroll.current?.scrollTo({ top: 0 }); }, [selected]);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(undefined), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const choose = (id: string) => { setSelected(id); setDrawer(false); setMobileView('edit'); };
  const closeModal = () => { setModal(null); setCandidate(undefined); };
  const changeSection = (section: NonNullable<typeof current>) => setResume(doc => ({ ...doc, sections: doc.sections.map(s => s.id === section.id ? section : s) }));
  const openReplace = (type: 'example' | 'clear') => { setBackupFirst(true); setModal(type); };
  const replace = () => {
    if (backupFirst) backup(resume);
    const next = modal === 'example' ? createExample() : modal === 'import' ? candidate : createBlank();
    if (!next) return;
    // Commit replacements immediately so a reload cannot restore an older draft.
    try { saveDraft(window.localStorage, next); } catch { /* Autosave surfaces the error. */ }
    setResume(next); setSelected('basics'); setRecoveryHold(false); closeModal();
    setNotice({ text: modal === 'example' ? '已载入虚构示例，你可以自由修改。' : modal === 'import' ? '备份已恢复，正在生成预览。' : '已新建空白简历。' });
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('文件超过 1 MB，请选择 ResumeStudio JSON 备份。');
      const document = parseBackup(await file.text());
      setCandidate(document); setBackupFirst(true); setModal('import');
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : '读取文件失败。现有草稿未改动。', error: true }); }
  };
  const exportPdf = () => {
    if (!pdf.blob || pdf.busy || pdf.error || !resume.basics.name.trim()) return;
    downloadFile(pdf.blob, `${fileName(resume.title)}.pdf`);
    setNotice({ text: 'PDF 已下载。建议打开文件，确认内容和分页后再投递。' });
  };
  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); choose('basics'); }} aria-label="ResumeStudio 简历工作台"><span className="brand-icon"><FileText size={21} strokeWidth={1.7} /></span><span>Resume<span className="brand-light">Studio</span><small>简历工作台</small></span></a>
      <div className="document-heading"><span className="breadcrumb">工作台<ChevronRight size={13} /></span><input aria-label="简历名称" value={resume.title} maxLength={100} onChange={e => setResume({ ...resume, title: e.target.value })} /><span className="draft-badge">本地草稿</span></div>
      <nav className="header-actions" aria-label="文件操作">
        <button className="button button-quiet backup-button" onClick={() => { backup(resume); setNotice({ text: 'JSON 备份已下载，可在其他设备导入恢复。' }); }}><FileJson size={16} /><span>备份</span></button>
        <button className="button button-quiet" onClick={() => fileInput.current?.click()}><Upload size={16} /><span>导入</span></button>
        <button className="button button-primary" disabled={pdf.busy || !pdf.blob || Boolean(pdf.error) || !resume.basics.name.trim()} title={!resume.basics.name.trim() ? '填写姓名后即可导出 PDF' : pdf.busy ? '正在更新 PDF' : '下载文字 PDF'} onClick={exportPdf}>{pdf.busy ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}<span>导出 PDF</span></button>
        <a className="github-link icon-button" href="https://github.com/xpm03/ResumeStudio" target="_blank" rel="noreferrer" aria-label="GitHub 开源仓库"><CodeXml size={20} /></a>
      </nav>
      <input type="file" accept=".json,application/json" hidden ref={fileInput} aria-label="选择 JSON 备份" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    </header>
    <div className="mobile-toolbar"><button className="icon-button" aria-label="打开模块导航" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}><Menu size={20} /></button><div className="view-switch"><button aria-pressed={mobileView === 'edit'} onClick={() => setMobileView('edit')}>填写内容</button><button aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>简历预览{pages > 0 && ` · ${pages}`}</button></div><span className="mobile-save" aria-label={saveError ? '保存失败' : saveState}>{saveError ? '未保存' : <CheckCheck size={17} />}</span></div>
    <div className="workspace">
      {drawer && <button className="drawer-overlay" aria-label="关闭模块导航" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="sidebar-top"><span className="eyebrow">YOUR STORY, WELL TOLD.</span><h1>让好经历，<br />有好表达。</h1><p>专注内容，排版交给我们。</p></div>
        <div className="nav-label"><span>简历内容</span><small>{completed} / 5</small></div>
        <nav className="section-nav" aria-label="简历模块">
          <button className={`nav-item ${selected === 'basics' ? 'active' : ''}`} onClick={() => choose('basics')} aria-pressed={selected === 'basics'}><UserRound size={17} /><span>基本信息</span><small>01</small></button>
          {resume.sections.map((section, index) => {
            const Icon = sectionIcons[section.kind];
            return <div className={`nav-row ${selected === section.id ? 'active' : ''} ${!section.visible ? 'hidden-section' : ''}`} key={section.id}>
              <button className="nav-item" aria-pressed={selected === section.id} onClick={() => choose(section.id)}><Icon size={17} /><span>{section.title || '未命名模块'}</span><small>{String(index + 2).padStart(2, '0')}</small></button>
              <div className="nav-controls">
                <button className="icon-button" aria-label={`${section.visible ? '隐藏' : '显示'}${section.title}`} onClick={() => changeSection({ ...section, visible: !section.visible })}>{section.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                <button className="icon-button" aria-label={`上移${section.title}`} disabled={index === 0} onClick={() => setResume({ ...resume, sections: moveItem(resume.sections, index, -1) })}><ArrowUp size={13} /></button>
                <button className="icon-button" aria-label={`下移${section.title}`} disabled={index === resume.sections.length - 1} onClick={() => setResume({ ...resume, sections: moveItem(resume.sections, index, 1) })}><ArrowDown size={13} /></button>
              </div>
            </div>;
          })}
        </nav>
        <div className="sidebar-divider" />
        <button className={`nav-item design-nav ${isDesign ? 'active' : ''}`} aria-pressed={isDesign} onClick={() => choose('design')}><LayoutTemplate size={17} /><span>模板与排版</span><ArrowUpRight size={14} /></button>
        <div className="sidebar-bottom"><button className="example-button" onClick={() => openReplace('example')}><Sparkles size={16} /><span>没有灵感？看看示例</span><ChevronRight size={14} /></button><button className="new-button" onClick={() => openReplace('clear')}><FilePlus2 size={15} />新建空白简历</button><button className="privacy-button" onClick={() => setModal('privacy')}><ShieldCheck size={15} /><span>内容仅保存在你的浏览器<small>无账号 · 无上传 · 免费导出</small></span></button></div>
      </aside>
      <main className={`editor-panel ${mobileView === 'edit' ? 'mobile-active' : ''}`}>
        <div className="editor-heading"><span className="eyebrow">WRITE YOUR NEXT CHAPTER <span>{currentNumber} / 06</span></span><h2>{currentTitle}<span className="heading-dot" /></h2><p>{descriptions[isDesign ? 'design' : current?.kind || 'basics']}</p></div>
        <div className="editor-scroll" ref={editorScroll}>
          {!initial.document && !resume.basics.name && selected === 'basics' && <div className="start-note"><span>从第一行开始</span><p>填写下方信息，或<button onClick={() => openReplace('example')}>载入虚构示例<ArrowUpRight size={12} /></button>找点灵感。</p></div>}
          {isDesign ? <DesignEditor value={resume.design} onChange={design => setResume({ ...resume, design })} /> : current ? <SectionEditor key={current.id} section={current} onChange={changeSection} /> : <BasicsEditor value={resume.basics} onChange={basics => setResume({ ...resume, basics })} />}
          <div className="editor-footnote"><LockKeyhole size={12} />每一段经历，都由你自己定义。</div>
        </div>
        <div className={`save-status ${saveError ? 'save-error' : ''}`} role="status">{saveError ? <ShieldCheck size={14} /> : saveState === '正在保存…' ? <LoaderCircle size={14} className="spin" /> : <CheckCheck size={14} />}<span>{saveState}</span>{saveError && <button onClick={() => backup(resume)}>立即备份</button>}</div>
      </main>
      <section className={`preview-panel ${mobileView === 'preview' ? 'mobile-active' : ''}`} aria-label="简历实时预览">
        <div className="preview-toolbar"><span><i className={pdf.busy ? 'busy-dot' : ''} />{pdf.busy ? '正在排版' : pdf.error ? '生成失败' : '实时预览'}</span><div><span className="paper-badge">A4</span><span className="page-count" role="status">{pages ? `${pages} 页` : '准备中'}</span></div></div>
        <div className="preview-scroll"><Suspense fallback={<div className="preview-state"><LoaderCircle className="spin" size={25} /><p>正在加载预览…</p></div>}><PdfPreview blob={pdf.blob} busy={pdf.busy} error={pdf.error} zoom={zoom} onPages={setPages} onRetry={pdf.retry} /></Suspense></div>
        <div className="preview-footer"><span><Check size={13} />预览与导出使用同一份 PDF</span><div className="zoom-controls"><button className="icon-button" aria-label="缩小预览" disabled={zoom <= 70} onClick={() => setZoom(Math.max(70, zoom - 10))}><Minus size={14} /></button><button className="zoom-value" onClick={() => setZoom(100)} title="重置缩放">{zoom}%</button><button className="icon-button" aria-label="放大预览" disabled={zoom >= 130} onClick={() => setZoom(Math.min(130, zoom + 10))}><Plus size={14} /></button></div></div>
      </section>
    </div>
    {notice && <div className={`toast ${notice.error ? 'toast-error' : ''}`} role={notice.error ? 'alert' : 'status'}><span>{notice.text}</span><button className="icon-button" aria-label="关闭提示" onClick={() => setNotice(undefined)}><X size={15} /></button></div>}
    {modal && <Modal title={modal === 'privacy' ? '你的经历，属于你自己。' : modal === 'recovery' ? '先保留你的原始草稿' : modal === 'example' ? '从一个好例子开始' : modal === 'import' ? '恢复这份简历？' : '开启一页新的可能'} onClose={closeModal} blocking={modal === 'recovery'}>
      {modal === 'privacy' ? <><p>简历内容在浏览器内处理，不上传到服务器，不调用 AI，也不需要账号。字体随网站提供，PDF 在你的设备生成。</p><div className="dialog-note"><strong>本地保存不等于备份</strong><p>清除浏览器数据、更换浏览器或设备可能导致草稿丢失。请定期导出 JSON 文件，需要时再导入恢复。</p></div><p>网站静态资源由 GitHub Pages 提供。本项目没有添加统计 SDK；首次加载仍需要网络，尚不保证离线启动。</p><div className="dialog-actions"><button className="button button-primary" onClick={closeModal}>知道了</button></div></> : modal === 'recovery' ? <><p>{initial.error}</p><div className="dialog-actions"><button className="button" onClick={() => downloadFile(new Blob([initial.raw || ''], { type: 'application/json' }), '原始草稿备份.json')}><Download size={15} />下载原始数据</button><button className="button button-primary" onClick={() => { setRecoveryHold(false); closeModal(); }}>放弃原草稿并新建</button></div></> : <><p>{modal === 'example' ? '示例中的姓名、学校和公司均为虚构，仅用于展示排版。载入后会替换当前工作草稿。' : modal === 'import' ? `已校验备份「${candidate?.title || '未命名简历'}」。恢复后将替换当前内容和排版。` : '这将清空当前工作草稿，重新开始。操作无法撤销，请先保存重要内容。'}</p><label className="backup-option"><input type="checkbox" checked={backupFirst} onChange={e => setBackupFirst(e.target.checked)} />替换前下载当前 JSON 备份</label><div className="dialog-actions"><button className="button" onClick={closeModal}>取消</button><button className="button button-primary" onClick={replace}>{modal === 'example' ? '载入示例' : modal === 'import' ? '确认恢复' : '新建空白简历'}</button></div></>}
    </Modal>}
  </div>;
}
