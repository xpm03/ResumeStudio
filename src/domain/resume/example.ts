import { createBlank, createEntry, type Entry, type Resume } from './model';

const entry = (data: Partial<Entry>): Entry => ({ ...createEntry(), ...data });

/** Fictional content, deliberately separate from the blank default. */
export function createExample(): Resume {
  const doc = createBlank();
  doc.title = '林知夏 · 产品设计简历（示例）';
  doc.basics = {
    name: '林知夏', headline: '产品设计师 / Product Designer',
    email: 'zhixia@example.com', phone: '138-0000-0000', location: '杭州',
    website: 'portfolio.example.com',
    summary: '关注产品体验与信息表达，擅长把复杂问题转化为清晰、易用的设计。希望与重视细节的团队一起，创造对人有用的产品。',
  };
  doc.sections.find(s => s.kind === 'education')!.items = [entry({
    title: '南山大学', subtitle: '视觉传达设计 · 本科', period: '2020.09 — 2024.06', location: '杭州',
    description: '主修用户体验设计、信息可视化与交互原型。\n毕业设计：为社区图书馆设计更友好的借阅体验。',
  })];
  doc.sections.find(s => s.kind === 'experience')!.items = [entry({
    title: '山间科技（虚构）', subtitle: '产品设计实习生', period: '2023.07 — 2023.12', location: '杭州',
    description: '参与知识管理产品的需求梳理与交互设计，整理用户访谈，绘制关键任务路径。\n与工程师协作完善组件规范，交付覆盖常用场景的高保真原型。\n组织小范围可用性测试，根据反馈简化创建与搜索流程。',
  })];
  doc.sections.find(s => s.kind === 'projects')!.items = [entry({
    title: '拾页 · 阅读记录工具', subtitle: '独立设计项目', period: '2024.02 — 2024.05',
    description: '面向希望建立阅读习惯的用户，完成问题访谈、信息架构与移动端原型。\n设计书摘整理和阅读回顾流程，注重内容层级与操作反馈。',
  })];
  doc.sections.find(s => s.kind === 'skills')!.items = [entry({
    title: '设计与协作', description: 'Figma、交互原型、设计系统、用户访谈、可用性测试',
  }), entry({ title: '语言', description: '中文（母语）、英语（可用于工作沟通）' })];
  return doc;
}
