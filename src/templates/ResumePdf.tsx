import { Document, Font, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { safeEmailLink, safeWebLink, type Resume } from '../domain/resume/model';

let registered = false;
export function registerFonts(base: string) {
  if (registered) return;
  Font.register({ family: 'ResumeStudio Sans', fonts: [
    { src: `${base}ResumeStudioSans-Regular.ttf`, fontWeight: 400 },
    { src: `${base}ResumeStudioSans-Bold.ttf`, fontWeight: 700 },
  ] });
  // Empty fragments become zero-width break opportunities in textkit, without
  // adding hyphens or characters to the exported text. Keep ordinary Latin words intact.
  Font.registerHyphenationCallback(word => {
    if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word) && word.length <= 32) return [word];
    const raw = word.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) || [word];
    const pieces: string[] = [];
    for (const part of raw) {
      const closing = part.match(/^[，。；：！？、）】》」』”’]+/)?.[0] || '';
      if (closing && pieces.length) pieces[pieces.length - 1] += closing;
      const rest = closing && pieces.length ? part.slice(closing.length) : part;
      if (rest) pieces.push(...(rest.length > 32 ? rest.match(/.{1,20}/gu)! : [rest]));
    }
    return pieces.flatMap(part => [part, '']);
  });
  registered = true;
}

export function ResumePdf({ document: resume }: { document: Resume }) {
  const { basics: b, design: d } = resume;
  const editorial = d.template === 'editorial';
  const s = StyleSheet.create({
    page: { fontFamily: 'ResumeStudio Sans', fontSize: d.fontSize, lineHeight: d.lineHeight, color: '#292f2c', paddingTop: d.margin, paddingHorizontal: d.margin, paddingBottom: d.margin + 12 },
    header: { paddingBottom: 15, marginBottom: 15, borderBottom: editorial ? 2 : 0.7, borderBottomColor: d.color },
    name: { fontSize: editorial ? 30 : 27, fontWeight: 700, color: d.color, letterSpacing: 1.5, lineHeight: 1.3 },
    headline: { fontSize: 11, marginTop: 6, color: '#46534c' },
    contacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 9, fontSize: 8.5, color: '#58615b', lineHeight: 1.5 },
    contact: { marginRight: 8, color: '#58615b', textDecoration: 'none', maxWidth: '100%' },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: d.color, marginBottom: 7, paddingBottom: 4, borderBottomWidth: editorial ? 0 : 0.5, borderBottomColor: '#dfe5df', letterSpacing: 0.7 },
    entry: { marginBottom: 9 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    entryTitle: { flexGrow: 1, flexShrink: 1, fontWeight: 700 },
    period: { fontSize: 8.5, color: '#5c655f', maxWidth: '40%', textAlign: 'right', flexShrink: 0 },
    subtitle: { fontSize: d.fontSize - 0.5, color: '#536158', marginTop: 2, marginBottom: 3 },
    bullet: { marginTop: 2 },
    footer: { position: 'absolute', bottom: 20, left: d.margin, right: d.margin, color: '#8a918c', fontSize: 8, textAlign: 'right' },
    empty: { color: '#a2aaa4', fontSize: 10, marginTop: 26 },
  });
  const website = safeWebLink(b.website);
  const email = safeEmailLink(b.email);
  return <Document title={resume.title || '简历'} author={b.name} language="zh-CN" creator="ResumeStudio">
    <Page size="A4" style={s.page} wrap>
      <View style={s.header} wrap={false}>
        <Text style={s.name}>{b.name || '你的姓名'}</Text>
        {b.headline && <Text style={s.headline}>{b.headline}</Text>}
        <View style={s.contacts}>
          {b.location && <Text style={s.contact}>{b.location}</Text>}
          {b.phone && <Text style={s.contact}>{b.phone}</Text>}
          {b.email && (email ? <Link src={email} style={s.contact}>{b.email}</Link> : <Text style={s.contact}>{b.email}</Text>)}
          {b.website && (website ? <Link src={website} style={s.contact}>{b.website}</Link> : <Text style={s.contact}>{b.website}</Text>)}
        </View>
      </View>
      {b.summary.trim() && <View style={s.section}>
        <Text style={s.sectionTitle} minPresenceAhead={30}>个人简介</Text>
        <Text orphans={2} widows={2}>{b.summary}</Text>
      </View>}
      {resume.sections.filter(section => section.visible).map(section => {
        const entries = section.items.filter(item => [item.title, item.subtitle, item.description, item.period, item.location].some(value => value.trim()));
        if (!entries.length) return null;
        return <View key={section.id} style={s.section}>
          <Text style={s.sectionTitle} minPresenceAhead={45}>{section.title || '未命名模块'}</Text>
          {entries.map(item => <View key={item.id} style={s.entry}>
            {(item.title || item.subtitle || item.location || item.period) && <View wrap={false} minPresenceAhead={item.description ? 24 : 0}>
              <View style={s.row}>
                <Text style={s.entryTitle}>{item.title}</Text>
                {item.period && <Text style={s.period}>{item.period}</Text>}
              </View>
              {(item.subtitle || item.location) && <Text style={s.subtitle}>{[item.subtitle, item.location].filter(Boolean).join('  /  ')}</Text>}
            </View>}
            {item.description.split('\n').filter(line => line.trim()).map((line, index) => <Text key={index} style={s.bullet} orphans={2} widows={2}>{section.kind === 'skills' ? '' : '•  '}{line.replace(/^\s*[•·\-*]\s*/, '')}</Text>)}
          </View>)}
        </View>;
      })}
      {!b.name && <Text style={s.empty}>填写左侧信息，让你的经历成为一份好简历。</Text>}
      <Text fixed style={s.footer} render={({ pageNumber, totalPages }) => totalPages > 1 ? `${pageNumber} / ${totalPages}` : ''} />
    </Page>
  </Document>;
}
