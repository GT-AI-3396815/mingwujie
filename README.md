# 光体•名无界

> 面向中小企业主与创业者的「双引擎可见性 SaaS 工作台」——一个后台同时看清你的品牌在 **传统搜索（Google/Baidu 等）** 和 **AI 搜索（ChatGPT / 豆包 / Perplexity / Gemini / Copilot / Grok / Google AI Overviews）** 里被不被看见。

## 双引擎底座

- **传统搜索可见性（SEO）**：基于开源 [OpenSEO](https://github.com/every-app/open-seo)（MIT）的数据能力。
- **AI 搜索可见性（GEO/AEO）**：基于开源 [GEO/AEO Tracker](https://github.com/danishashko/geo-aeo-tracker)（MIT）的 7 大 AI 平台监测能力。

两者均 MIT 协议、可自托管、数据自有。

## 五大功能模块

| 模块 | 说明 |
| --- | --- |
| A 传统搜索 SEO | 关键词排名、排名趋势、外链、站点技术审计 |
| B AI 搜索 GEO | 7 平台可见性评分（含豆包）、引用分析、竞品 Battlecard、AEO 审计 |
| C 双引擎看板 | 谷歌排名 + AI 可见性统一周报一句话概览 |
| D 行动优化 | llms.txt 一键生成与下载、按行业适配的 JSON-LD 结构化数据建议、引用建设清单 |
| E 报告分享 | 老板视图、HTML 周报导出 |

## v0.2 更新（专业用户审计修复）

- **演示态全透明**：工作台顶栏徽章 + 右下角水印 + 加载页提示，Hero 图表标注「示例数据」；演示数据按用户所选行业 / 城市参数化生成（选律所不再出现装修数据）。
- **行业分支模板**：llms.txt 生成器与 JSON-LD 结构化数据按 10 个行业输出正确内容（律所 → LegalService、医美 → MedicalClinic、餐饮 → Restaurant 等）。
- **口径统一**：全站统一为「7 个 AI 平台」（补齐豆包），评分口径公开（提及 50% + 引用 30% + 排位 20%）。
- **转化闭环**：定价按钮接入套餐预约弹窗（微信 / 支付宝 / 对公占位）；新增 FAQ、竞品对比表、内测用户证言（明确标注样例）、隐私政策与服务条款。
- **GEO 自证**：本站自带 `llms.txt`、`sitemap.xml`、`robots.txt`、JSON-LD（SoftwareApplication + FAQPage）、OG 分享标签。
- **细节**：看板涨幅改为从数据实时计算；新增空状态兜底；域名格式校验；移除「分享链接」伪造 URL。

## 技术说明

当前为 **内测演示版**：前端已完整实现全部交互与可视化，数据层为按行业参数化生成的演示数据（工作台内已明确标注），真实 API 集成点已预留于 `assets/app.js` 的 `fetchBackend()`。接入真实 API Key（DataForSEO / Bright Data / OpenRouter）后即可切换为生产数据。

## 本地预览

直接双击 `index.html` 即可打开，或用任意静态服务器：

```bash
python -m http.server 8080
# 浏览器访问 http://127.0.0.1:8080
```

## 部署

已部署至 GitHub Pages：`https://GT-AI-3396815.github.io/mingwujie`

---

© 光体•名无界 · 基于 OpenSEO 与 GEO/AEO Tracker 开源能力构建
