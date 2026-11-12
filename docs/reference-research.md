# 简历制作平台：GitHub 参考项目调研

调研日期：2026-11-12。依据项目官方仓库、README、许可证和渲染器文档；属于产品与技术选型调研，未完成这些项目的本地安装、代码审计或端到端实测。上游会持续更新，不用星标数量作为需求证据。

## 1. Reactive Resume

- 来源：[官方仓库与 README](https://github.com/reactive-resume/reactive-resume)、[许可证](https://github.com/reactive-resume/reactive-resume/blob/main/LICENSE)。项目声明采用 MIT。
- 当前 README 展示编辑预览、结构化内容、多模板、恢复与版本、导入导出和可选 AI 建议等完整工作流。
- 借鉴：内容和排版配置分离；写作过程中直接看到输出；修改建议可接受或拒绝；恢复能力与导出属于基本功能。
- 取舍：它已经是成熟产品，不能把其全部功能当作两天任务清单。本项目不从账号、云端库或求职管理开始。
- 调研边界：不假定其当前 PDF 引擎与旧版本相同；本项目独立验证自己的渲染方案。

## 2. OpenResume

- 来源：[官方仓库与 README](https://github.com/xitanggg/open-resume)、[许可证](https://github.com/xitanggg/open-resume/blob/main/LICENSE)、[依赖声明](https://github.com/xitanggg/open-resume/blob/main/package.json)。项目声明采用 AGPL-3.0。
- README 介绍浏览器本地运行、免注册、实时 PDF、已有 PDF 导入与解析；技术说明包含 React、TypeScript、PDF.js 和 React-pdf。
- 借鉴：聚焦少量模板和清晰表单，填写时直接预览最终文档；基础制作流程不必先部署后端。
- 取舍：PDF 解析容易形成另一条复杂链路，首版用结构化 JSON 导入导出；不沿用其旧框架版本。
- 许可处理：本轮仅参考公开描述与流程，未复制 AGPL 源码。未来若要引入代码，先确认授权方案和发布义务，不直接放入本项目 MIT 代码。
- 不照搬 README 中的招聘结果或 ATS 宣传；本项目只能报告自己实际验证的文件可读性。

## 3. 猫步简历（resume-design）

- 来源：[官方仓库与 README](https://github.com/Hacker233/resume-design)、[许可证](https://github.com/Hacker233/resume-design/blob/main/LICENSE)。项目声明采用 MIT。
- 提供面向中文用户的模块编辑、模板和主题调整、PDF/JSON 等输出，并区分简历设计器与自由布局设计器。
- 借鉴：中文信息字段、模块可增删和排序、样式调整与内容编辑分开。
- 取舍：不做自由画布、模板商城、积分、后台管理；用一款高质量单栏模板打通流程，再考虑第二款。
- 不复制模板、品牌或图片；未来任何资源复用单独核对授权和署名。

## 4. Resume Matcher

- 来源：[官方仓库与 README](https://github.com/srbhr/Resume-Matcher)、[许可证](https://github.com/srbhr/Resume-Matcher/blob/main/LICENSE)。项目声明采用 Apache-2.0。
- 展示围绕岗位描述调整简历、可修改建议和选择模板的流程，并强调修改应基于已有真实经历。
- 借鉴：岗位定制应帮助重新组织已有事实；建议与事实分离，由用户确认修改。
- 取舍：AI 和岗位匹配放到 P1/P2；首版不需要模型接口或 Python 服务，也不使用无法解释的“通过率”。

## 5. 本项目的技术判断

这是结合上述材料与当前交付约束作出的判断，不是上游项目对本项目的保证：

1. 纯前端最符合“无服务器、GitHub Pages、隐私优先”的需求。制作简历本身不需要 Python 环境、Docker 或大模型。
2. PDF 是核心产物，应先验证中文字体和分页，再投入大面积界面开发。模板数量和 AI 无法弥补导出乱码或截断。
3. 初选 `@react-pdf/renderer`，先验证、再锁定版本；[字体文档](https://react-pdf.org/fonts)与[分页等高级能力](https://react-pdf.org/advanced)作为实现参考。静态字体格式、字重、中文覆盖、包体和分发许可均需实际确认。
4. 预览尽量使用同一份 PDF，避免两套排版规则。需要用包含中文标点、长标题、长链接、多页列表的样例测试，不能只用短英文示例判断成功。
5. 本地保存必须配合 JSON 备份和明确的数据丢失说明。没有账号和服务器，不代表浏览器存储永不丢失。
6. 差异化先作为假设验证：中文排版、少量精致模板、免注册和免费导出。邀请目标用户完成真实任务，再决定下一阶段。

## 6. 后续执行约定

本项目原创代码初选 MIT，参考项目的许可证仍各自有效。若实际复用源码、字体、图标或其他素材，记录具体来源、版本和许可证，保留所需声明；不能仅链接本调研文档就替代授权义务。

本轮没有安装这些参考项目，没有复制其源码，也没有宣称它们的所有功能已在本项目实现。
