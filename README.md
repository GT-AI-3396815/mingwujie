# 光体•名无界

> 面向中小企业主与创业者的「双引擎可见性 SaaS 工作台」——一个后台同时看清你的品牌在 **传统搜索（Google/Baidu 等）** 和 **AI 搜索（ChatGPT / Perplexity / Gemini / Copilot / Grok / Google AI Overviews）** 里被不被看见。

## 双引擎底座

- **传统搜索可见性（SEO）**：基于开源 [OpenSEO](https://github.com/every-app/open-seo)（MIT）的数据能力。
- **AI 搜索可见性（GEO/AEO）**：基于开源 [GEO/AEO Tracker](https://github.com/danishashko/geo-aeo-tracker)（MIT）的 6 大模型监测能力。

两者均 MIT 协议、可自托管、数据自有。

## 五大功能模块

| 模块 | 说明 |
| --- | --- |
| A 传统搜索 SEO | 关键词排名、排名趋势、外链、站点技术审计 |
| B AI 搜索 GEO | 6 大模型可见性评分、引用分析、竞品 Battlecard、AEO 审计 |
| C 双引擎看板 | 谷歌排名 + AI 可见性统一周报一句话概览 |
| D 行动优化 | llms.txt 一键生成与下载、JSON-LD 结构化数据建议、引用建设清单 |
| E 报告分享 | 老板视图、HTML 周报导出 |

## 技术说明

当前为 **高保真演示版**：前端已完整实现全部交互与可视化，数据层为演示数据，已在 `assets/app.js` 的 `fetchBackend()` 中预留 OpenSEO + GEO/AEO Tracker 真实 API 集成点。接入真实 API Key（DataForSEO / Bright Data / OpenRouter）后即可切换为生产数据。

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
