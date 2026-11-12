# 第三方来源与许可

本项目原创内容采用 MIT；第三方依赖和资源保留各自许可。以下为直接运行依赖，传递依赖以 `package-lock.json` 及各包原始声明为准。

| 依赖 | 版本 | 许可 | 来源 |
| --- | --- | --- | --- |
| React / React DOM | 19.3.1 | MIT | https://github.com/facebook/react |
| React-pdf renderer | 4.9.0 | MIT | https://github.com/diegomura/react-pdf |
| PDF.js | 6.5.438 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| Lucide React | 1.72.0 | ISC | https://github.com/lucide-icons/lucide |

构建时 `scripts/collect-licenses.mjs` 将已安装的直接与传递运行依赖许可汇集为网站的 `THIRD_PARTY_LICENSES.txt`，与依赖构建器保留的许可注释一起分发。字体 OFL 独立提供。该汇集文件由构建生成，不手工编辑或提交。

## 随项目分发的字体

- 原字体：Noto Sans SC，Google Fonts 仓库，固定提交 `a85815a42757630ce188fdad368c2dfc444d4773`。
- 来源与原始 SHA-256：[字体 provenance.json](../public/fonts/provenance.json)。
- 完整许可：[SIL Open Font License 1.1](../public/fonts/OFL.txt)。
- 修改：从可变字体生成 400/700 静态字重，改名为 ResumeStudio Sans；未删除字符覆盖。字体保持 OFL，不因本仓库采用 MIT 而改许可。
- 重建方式：在项目 Conda 环境安装 `scripts/requirements.txt` 后运行 `python scripts/prepare-fonts.py`。普通开发和使用无需重新生成字体。

## 调研项目

[参考项目调研](reference-research.md)列出 Reactive Resume、OpenResume、猫步简历与 Resume Matcher。本项目未复制其源码、模板、品牌或截图；调研引用不代表这些项目为本项目背书。
