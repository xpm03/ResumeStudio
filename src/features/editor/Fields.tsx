import { useId } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { COLORS, createEntry, moveItem, safeWebLink, type Entry, type Resume, type Section } from '../../domain/resume/model';

function Field({ label, value, onChange, multiline = false, maxLength = 200, placeholder, hint, type = 'text' }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength?: number; placeholder?: string; hint?: string; type?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return <div className={`field ${multiline ? 'field-wide' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {multiline ? <textarea id={id} aria-describedby={hintId} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder} rows={5} /> :
      <input id={id} type={type} aria-describedby={hintId} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder} />}
    {hint && <small id={hintId}>{hint}</small>}
  </div>;
}

export function BasicsEditor({ value, onChange }: { value: Resume['basics']; onChange: (value: Resume['basics']) => void }) {
  const update = (key: keyof Resume['basics']) => (text: string) => onChange({ ...value, [key]: text });
  return <div className="editor-fields">
    <div className="field-grid">
      <Field label="姓名" value={value.name} onChange={update('name')} maxLength={100} placeholder="你的姓名" />
      <Field label="所在城市" value={value.location} onChange={update('location')} maxLength={100} placeholder="例如：杭州" />
    </div>
    <Field label="求职意向" value={value.headline} onChange={update('headline')} placeholder="例如：前端开发工程师" />
    <div className="form-divider"><span>联系方式</span></div>
    <Field label="电子邮箱" value={value.email} onChange={update('email')} type="email" placeholder="name@example.com" />
    <Field label="联系电话" value={value.phone} onChange={update('phone')} type="tel" maxLength={100} placeholder="填写常用联系电话" />
    <Field label="个人网站 / 作品集" value={value.website} onChange={update('website')} maxLength={500} placeholder="https://example.com" hint={value.website && !safeWebLink(value.website) ? '请填写 http(s) 网址。当前内容仅作为文字显示，不生成链接。' : '选填，可填写个人网站或 GitHub 地址。'} />
    <div className="form-divider"><span>关于你</span></div>
    <Field label="个人简介" value={value.summary} onChange={update('summary')} multiline maxLength={2000} placeholder="用两三句话，介绍你的方向、优势和期待。" hint="选填。简洁、具体，让读者快速了解你。" />
  </div>;
}

const labels: Record<Section['kind'], { title: string; subtitle: string; description: string; action: string }> = {
  education: { title: '学校名称', subtitle: '专业与学历', description: '学习经历', action: '添加教育经历' },
  experience: { title: '公司 / 组织', subtitle: '职位名称', description: '工作内容与成果', action: '添加工作或实习' },
  projects: { title: '项目名称', subtitle: '你的角色', description: '项目内容与贡献', action: '添加项目经历' },
  skills: { title: '技能类别', subtitle: '', description: '技能内容', action: '添加技能类别' },
};

export function SectionEditor({ section, onChange }: { section: Section; onChange: (section: Section) => void }) {
  const l = labels[section.kind];
  const update = (index: number, key: keyof Entry, value: string) => onChange({ ...section, items: section.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  return <div className="editor-fields">
    <Field label="模块标题" value={section.title} onChange={title => onChange({ ...section, title })} maxLength={60} />
    {!section.visible && <div className="inline-note">此模块已隐藏，仍可编辑。点击左侧眼睛图标可恢复显示。</div>}
    {!section.items.length && <div className="empty-entries"><span className="empty-lines" aria-hidden="true"><i /><i /><i /></span><h3>每一段经历，都值得被看见</h3><p>添加一条内容，右侧会为你自动排版。</p></div>}
    {section.items.map((item, index) => <article className="entry-card" key={item.id}>
      <div className="entry-toolbar"><span>{String(index + 1).padStart(2, '0')} <strong>{item.title || '新条目'}</strong></span><div className="entry-actions">
        <button className="icon-button" aria-label={`上移条目 ${index + 1}`} disabled={!index} onClick={() => onChange({ ...section, items: moveItem(section.items, index, -1) })}><ArrowUp size={14} /></button>
        <button className="icon-button" aria-label={`下移条目 ${index + 1}`} disabled={index === section.items.length - 1} onClick={() => onChange({ ...section, items: moveItem(section.items, index, 1) })}><ArrowDown size={14} /></button>
        <button className="icon-button danger-text" aria-label={`删除条目 ${index + 1}`} onClick={() => {
          if ([item.title, item.subtitle, item.description, item.period, item.location].some(Boolean) && !window.confirm('删除这条经历？此操作无法撤销，可先导出 JSON 备份。')) return;
          onChange({ ...section, items: section.items.filter((_, i) => i !== index) });
        }}><Trash2 size={14} /></button>
      </div></div>
      <div className="entry-content">
        <Field label={l.title} value={item.title} onChange={value => update(index, 'title', value)} />
        {l.subtitle && <Field label={l.subtitle} value={item.subtitle} onChange={value => update(index, 'subtitle', value)} />}
        {section.kind !== 'skills' && <div className="field-grid">
          <Field label="时间" value={item.period} onChange={value => update(index, 'period', value)} maxLength={100} placeholder="2024.09 — 至今" />
          <Field label="地点" value={item.location} onChange={value => update(index, 'location', value)} maxLength={100} placeholder="选填" />
        </div>}
        <Field label={l.description} value={item.description} onChange={value => update(index, 'description', value)} multiline maxLength={2000} placeholder={section.kind === 'skills' ? '例如：TypeScript、React、界面设计' : '写下你做了什么、如何完成，以及产生的成果。每行一个要点。'} hint={section.kind === 'skills' ? undefined : '每行自动排成一个要点，无需添加项目符号。最多 2000 字符。'} />
      </div>
    </article>)}
    <button className="add-entry" disabled={section.items.length >= 30} onClick={() => onChange({ ...section, items: [...section.items, createEntry()] })}><Plus size={17} />{section.items.length >= 30 ? '每个模块最多 30 个条目' : l.action}</button>
  </div>;
}

export function DesignEditor({ value, onChange }: { value: Resume['design']; onChange: (value: Resume['design']) => void }) {
  return <div className="editor-fields">
    <div className="control-heading"><h3>选择一张好纸</h3><p>切换风格保留全部内容。</p></div>
    <div className="template-grid">{([['classic', '清序', '克制的线条，清晰的表达'], ['editorial', '留白', '醒目的标题，舒展的节奏']] as const).map(([template, title, subtitle]) => <button key={template} className={`template-card ${value.template === template ? 'selected' : ''}`} aria-pressed={value.template === template} onClick={() => onChange({ ...value, template })}>
      <span className={`template-paper ${template}`} aria-hidden="true"><b /><i /><hr /><em /><i /><i /><em /><i /><i /></span><strong>{title}</strong><small>{subtitle}</small>
    </button>)}</div>
    <div className="form-divider"><span>排版细节</span></div>
    <fieldset className="color-field"><legend>主题色</legend><div className="swatches">{COLORS.map((color, i) => <button key={color} className={color === value.color ? 'selected' : ''} style={{ background: color }} aria-label={['森林绿', '深海蓝', '莓果紫', '石墨黑'][i]} aria-pressed={color === value.color} onClick={() => onChange({ ...value, color })} />)}</div></fieldset>
    {([
      ['fontSize', '正文字号', 9, 13, 0.5, 'pt'],
      ['lineHeight', '行距', 1.3, 1.9, 0.05, '倍'],
      ['margin', '页边距', 28, 60, 2, 'pt'],
    ] as const).map(([key, label, min, max, step, unit]) => <div className="range-field" key={key}><label htmlFor={key}>{label}<span>{Number(value[key].toFixed(2))} {unit}</span></label><input id={key} type="range" min={min} max={max} step={step} value={value[key]} onChange={e => onChange({ ...value, [key]: Number(e.target.value) })} /></div>)}
    <div className="inline-note">内容较多时会自动生成多页。优先精简表达，避免使用过小字号。</div>
  </div>;
}
