/* ============================================================
   光体•名无界 — 工作台逻辑（演示态）
   ------------------------------------------------------------
   ⚠️ 集成点说明（MVP 演示阶段使用内置演示数据）：
   - 传统搜索(SEO) 数据来源 = OpenSEO 自托管 API
       GET /api/openseo/keywords?domain=&kw=
       GET /api/openseo/rankings?domain=&kw=
       GET /api/openseo/backlinks?domain=
       GET /api/openseo/audit?domain=
   - AI 搜索(GEO) 数据来源 = GEO/AEO Tracker 自托管 API
       POST /api/geo/scan  {domain, prompts}
       GET  /api/geo/visibility?domain=
       GET  /api/geo/citations?domain=
   将下方 fetchBackend() 内的 return DEMO 换成真实 fetch 即可上线。
   ============================================================ */

'use strict';

/* ----------------------- 演示数据集 ----------------------- */
const DEMO = {
  domain: 'xinghe-decor.com',
  brand: '星河装饰',
  city: '杭州',
  industry: '装修',
  seo: {
    keywords: [
      { kw: '杭州装修公司', vol: 5400, diff: 68, cpc: 3.2, intent: '商业' },
      { kw: '杭州家装设计', vol: 2900, diff: 55, cpc: 2.8, intent: '商业' },
      { kw: '杭州旧房翻新', vol: 1900, diff: 47, cpc: 2.1, intent: '商业' },
      { kw: '杭州装修报价', vol: 3600, diff: 61, cpc: 4.0, intent: '商业' },
      { kw: '杭州靠谱装修', vol: 880,  diff: 39, cpc: 3.5, intent: '商业' }
    ],
    // 8 周排名趋势（数值越小越好）
    rankTrend: {
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      series: [
        { name: '杭州装修公司', color: '#22d3ee', data: [42, 38, 33, 29, 24, 19, 14, 11] },
        { name: '杭州旧房翻新', color: '#8b5cf6', data: [55, 50, 46, 40, 35, 30, 26, 22] }
      ]
    },
    currentRank: { '杭州装修公司': 11, '杭州旧房翻新': 22, '杭州家装设计': 17, '杭州装修报价': 28, '杭州靠谱装修': 9 },
    backlinks: {
      domains: 23, total: 156,
      topAnchors: [
        { a: '杭州装修公司', n: 31 }, { a: '星河装饰官网', n: 24 },
        { a: '杭州家装设计', n: 18 }, { a: '杭州旧房翻新', n: 12 }
      ]
    },
    audit: { brokenLinks: 3, dupTitles: 5, missingMeta: 8, score: 72 }
  },
  geo: {
    models: [
      { name: 'ChatGPT', score: 62, mentioned: true,  citations: ['杭州装修网', '知乎', '大众点评'] },
      { name: 'Perplexity', score: 58, mentioned: true, citations: ['小红书', '杭州装修网'] },
      { name: 'Gemini', score: 45, mentioned: true,  citations: ['百度百科'] },
      { name: 'Copilot', score: 51, mentioned: true,  citations: ['必应'] },
      { name: 'Grok', score: 38, mentioned: false, citations: [] },
      { name: 'Google AI Overviews', score: 67, mentioned: true, citations: ['杭州装修网', '大众点评'] }
    ],
    overall: 63,
    history: [0, 12, 25, 33, 41, 48, 55, 63],
    historyLabels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    citationDomains: [
      { domain: '杭州装修网', count: 14, you: true },
      { domain: '大众点评', count: 9, you: true },
      { domain: '知乎', count: 7, you: true },
      { domain: '土巴兔', count: 11, you: false },
      { domain: '齐家网', count: 8, you: false }
    ],
    opportunities: [
      { url: '土巴兔 · 杭州装修公司口碑榜', reason: '竞品「杭州雅庭装饰」被引用，星河装饰未出现' },
      { url: '齐家网 · 本地装修案例库', reason: '行业高频引用源，建议投稿真实完工案例' },
      { url: '杭州19楼论坛 · 装修避坑帖', reason: '本地业主聚集，适合以专家身份答疑获引用' }
    ],
    battlecard: {
      you: { 强项: ['本地案例丰富', 'Google 排名上升快'], 弱项: ['AI 引用源少', 'llms.txt 缺失'] },
      competitor: { name: '杭州雅庭装饰', 强项: ['土巴兔/齐家网高引用', 'AI 概述常驻'], 弱项: ['Google 自然排名靠后'] }
    },
    aeo: { llmsTxt: false, schema: '部分', bluf: '中等', titleStruct: '良好' }
  },
  summary: '本周你在谷歌「杭州装修公司」升至第 <b>11</b> 名（较首周 ↑31 位），但 AI 回答整体可见性 <b>63</b> 分，仍落后竞品「杭州雅庭装饰」（71 分）。建议优先补全 <b>llms.txt</b> 并争取土巴兔 / 齐家网引用。'
};

/* ----------------------- 全局状态 ----------------------- */
const state = {
  loaded: false,
  view: 'dashboard',
  boss: false,
  data: null,
  actionDone: 0
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ----------------------- 后端集成桩 ----------------------- */
async function fetchBackend(form) {
  // TODO(MVP→上线): 替换为真实 OpenSEO + GEO/AEO Tracker API 调用
  // const seo = await fetch('/api/openseo/keywords?domain='+form.domain).then(r=>r.json());
  // const geo = await fetch('/api/geo/visibility?domain='+form.domain).then(r=>r.json());
  // return { ...DEMO, domain: form.domain, brand: form.brand, city: form.city, industry: form.industry, seo, geo };
  const d = JSON.parse(JSON.stringify(DEMO));
  d.domain = form.domain;
  d.brand = form.brand || form.domain.split('.')[0];
  d.city = form.city || '本地';
  d.industry = form.industry || '企业';
  return d;
}

/* ----------------------- 导航 / 视图切换 ----------------------- */
function openWorkbench() {
  $('landing').classList.add('hidden');
  $('workbench').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function backToLanding() {
  $('workbench').classList.add('hidden');
  $('landing').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function switchTab(name) {
  state.view = name;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  ['dashboard', 'seo', 'geo', 'action', 'report'].forEach(v => {
    $('view-' + v).classList.toggle('hidden', v !== name);
  });
  if (state.loaded) renderCurrent();
}
function toggleBoss() {
  state.boss = !state.boss;
  $('bossToggle').textContent = state.boss ? '完整视图' : '老板视图';
  if (state.loaded && state.view === 'dashboard') renderDashboard();
}

/* ----------------------- 检测流程 ----------------------- */
function runScan(e) {
  if (e) e.preventDefault();
  const domain = ($('f-domain').value || '').trim();
  const brand = ($('f-brand').value || '').trim();
  const city = ($('f-city').value || '').trim();
  const industry = ($('f-industry').value || '').trim();
  if (!domain) { toast('请先输入你的网站域名'); return; }

  $('loading').classList.remove('hidden');
  const steps = ['正在连接 OpenSEO 拉取排名数据…', '正在向 6 个 AI 模型发起可见性探测…', '正在分析引用来源与竞品 battlecard…', '正在生成双引擎周报…'];
  let i = 0;
  $('load-step').textContent = steps[0];
  const timer = setInterval(() => { i = (i + 1) % steps.length; $('load-step').textContent = steps[i]; }, 700);

  fetchBackend({ domain, brand, city, industry }).then(d => {
    clearInterval(timer);
    state.data = d;
    state.loaded = true;
    $('loading').classList.add('hidden');
    // 填充顶栏
    $('wb-domain').textContent = d.domain;
    $('wb-brand').textContent = d.brand;
    $('scan-form').classList.add('hidden');
    $('wb-content').classList.remove('hidden');
    switchTab('dashboard');
    renderAll();
    toast('双引擎检测完成 · 已生成工作台');
  }).catch(err => {
    clearInterval(timer);
    $('loading').classList.add('hidden');
    toast('检测失败：' + err.message);
  });
}

/* ----------------------- 图表工具 ----------------------- */
function ring(percent, color, size) {
  size = size || 130;
  const r = (size - 16) / 2, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
  const cx = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="11" fill="none"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="${color}" stroke-width="11" fill="none" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/>
    <text x="${cx}" y="${cx + 4}" text-anchor="middle" fill="#fff" font-size="30" font-weight="800">${percent}</text>
    <text x="${cx}" y="${cx + 26}" text-anchor="middle" fill="#8b90a8" font-size="12">/100</text>
  </svg>`;
}

function lineChart(series, labels, opts) {
  opts = opts || {};
  const w = opts.w || 600, h = opts.h || 250, pad = { l: 42, r: 18, t: 16, b: 30 };
  const all = series.flatMap(s => s.data);
  let max = Math.max(...all), min = 0;
  max = max * 1.12;
  const n = series[0].data.length;
  const X = i => pad.l + (w - pad.l - pad.r) * (i / (n - 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  let grid = '', paths = '';
  for (let g = 0; g <= 4; g++) {
    const yy = pad.t + (h - pad.t - pad.b) * g / 4;
    const val = Math.round(max - (max - min) * g / 4);
    grid += `<line x1="${pad.l}" y1="${yy}" x2="${w - pad.r}" y2="${yy}" stroke="rgba(255,255,255,.06)"/>`;
    grid += `<text x="${pad.l - 7}" y="${yy + 4}" text-anchor="end" fill="#6b7190" font-size="10">${val}</text>`;
  }
  series.forEach(s => {
    const d = s.data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5"/>`;
    s.data.forEach((v, i) => { paths += `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${s.color}"/>`; });
  });
  let xl = '';
  (labels || []).forEach((lb, i) => { xl += `<text x="${X(i)}" y="${h - 8}" text-anchor="middle" fill="#6b7190" font-size="10">${lb}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${grid}${paths}${xl}</svg>`;
}

function barChart(items, opts) {
  opts = opts || {};
  const w = opts.w || 600, h = opts.h || 270, pad = { l: 120, r: 36, t: 10, b: 20 };
  const max = 100, n = items.length, gap = (h - pad.t - pad.b) / n, bw = gap * 0.62;
  let s = '';
  items.forEach((it, i) => {
    const y = pad.t + gap * i + (gap - bw) / 2;
    const ww = (w - pad.l - pad.r) * (it.value / max);
    s += `<text x="${pad.l - 10}" y="${y + bw / 2 + 4}" text-anchor="end" fill="#cfd3e6" font-size="12.5">${esc(it.label)}</text>`;
    s += `<rect x="${pad.l}" y="${y}" width="${w - pad.l - pad.r}" height="${bw}" rx="6" fill="rgba(255,255,255,.05)"/>`;
    s += `<rect x="${pad.l}" y="${y}" width="${ww.toFixed(1)}" height="${bw}" rx="6" fill="${it.color}"/>`;
    s += `<text x="${pad.l + ww + 8}" y="${y + bw / 2 + 4}" fill="#fff" font-size="12.5" font-weight="700">${it.value}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${s}</svg>`;
}

/* ----------------------- 渲染：总调度 ----------------------- */
function renderAll() { renderDashboard(); renderSEO(); renderGEO(); renderAction(); renderReport(); }
function renderCurrent() {
  if (state.view === 'dashboard') renderDashboard();
  else if (state.view === 'seo') renderSEO();
  else if (state.view === 'geo') renderGEO();
  else if (state.view === 'action') renderAction();
  else if (state.view === 'report') renderReport();
}

/* 看板 */
function renderDashboard() {
  const d = state.data;
  const topRank = Math.min(...Object.values(d.seo.currentRank));
  const aiScore = d.geo.overall;
  let html = '';
  if (state.boss) {
    html += `<div class="boss-view">
      <div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ${topRank} 名</div><div class="small muted">核心关键词自然搜索</div></div>
      <div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">${aiScore}</div><div class="small muted">6 模型综合（0–100）</div></div>
      <div class="boss-num"><div class="b-label">本周动作完成</div><div class="b-value gold">${state.actionDone}/3</div><div class="small muted">行动优化清单</div></div>
    </div>`;
    html += `<div class="summary-bar">${d.summary}</div>`;
    html += `<p class="muted small">老板视图：只看 3 个核心数字，复杂图表已隐藏。点右上角「完整视图」查看全部数据。</p>`;
    $('view-dashboard').innerHTML = html;
    return;
  }
  html += `<div class="stat-grid">
    <div class="stat"><div class="label">谷歌最佳排名</div><div class="value" style="color:var(--cyan)">第 ${topRank} 名</div><div class="delta up">↑ 较首周 +31 位</div></div>
    <div class="stat"><div class="label">AI 可见性分</div><div class="value" style="color:var(--violet-soft)">${aiScore}</div><div class="delta up">↑ 较首周 +63</div></div>
    <div class="stat"><div class="label">被引用域名</div><div class="value">${d.geo.citationDomains.filter(c => c.you).length}</div><div class="delta">个来源提到你</div></div>
    <div class="stat"><div class="label">待办优化</div><div class="value" style="color:var(--gold)">${d.geo.opportunities.length}</div><div class="delta down">个引用机会待争取</div></div>
  </div>`;
  html += `<div class="summary-bar">${d.summary}</div>`;
  html += `<div class="cols-2">
    <div class="card"><h3>📈 传统搜索排名趋势</h3><div class="card-sub">核心关键词 8 周 Google 排名（越低越好）</div>
      ${lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels)}
      <div class="legend"><span><i style="background:#22d3ee"></i>杭州装修公司</span><span><i style="background:#8b5cf6"></i>杭州旧房翻新</span></div>
    </div>
    <div class="card"><h3>🤖 AI 可见性成长</h3><div class="card-sub">6 模型综合可见性分 8 周变化</div>
      ${lineChart([{ name: 'AI 可见性', color: '#8b5cf6', data: d.geo.history }], d.geo.historyLabels)}
    </div>
  </div>`;
  html += `<div class="card"><h3>🎯 下一步建议（行动优化层）</h3><div class="card-sub">名无界的核心价值：告诉你下一步改什么</div>
    <div class="list-item"><div class="bullet"></div><div><div class="li-title">生成并托管 llms.txt</div><div class="li-sub">让 ChatGPT / Perplexity 正确理解你的业务（当前缺失）</div></div></div>
    <div class="list-item"><div class="bullet"></div><div><div class="li-title">争取土巴兔 / 齐家网引用</div><div class="li-sub">竞品被引用而你没有的 3 个来源 → 见「行动优化」</div></div></div>
    <div class="list-item"><div class="bullet"></div><div><div class="li-title">补全关键页结构化数据</div><div class="li-sub">为「杭州装修报价」页添加 LocalBusiness JSON-LD</div></div></div>
  </div>`;
  $('view-dashboard').innerHTML = html;
}

/* 模块 A：传统搜索可见性 */
function renderSEO() {
  const d = state.data;
  let kw = d.seo.keywords.map(k => `<tr>
    <td>${esc(k.kw)}</td><td>${k.vol.toLocaleString()}</td><td>${k.diff}</td>
    <td>¥${k.cpc.toFixed(1)}</td><td><span class="tag-mini tag-seo">${k.intent}</span></td></tr>`).join('');
  let rank = Object.entries(d.seo.currentRank).map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>第 ${v} 名</td><td><span class="tag-mini ${v <= 10 ? 'tag-green' : v <= 30 ? 'tag-amber' : 'tag-red'}">${v <= 10 ? '首页' : v <= 30 ? '前3页' : '待提升'}</span></td></tr>`).join('');
  let anchors = d.seo.backlinks.topAnchors.map(a => `<tr><td>${esc(a.a)}</td><td>${a.n}</td></tr>`).join('');

  $('view-seo').innerHTML = `
    <div class="stat-grid">
      <div class="stat"><div class="label">监测关键词</div><div class="value">${d.seo.keywords.length}</div></div>
      <div class="stat"><div class="label">引用域名</div><div class="value" style="color:var(--cyan)">${d.seo.backlinks.domains}</div></div>
      <div class="stat"><div class="label">总外链</div><div class="value">${d.seo.backlinks.total}</div></div>
      <div class="stat"><div class="label">站点健康分</div><div class="value" style="color:var(--green)">${d.seo.audit.score}</div></div>
    </div>
    <div class="cols-2">
      <div class="card"><h3>🔍 关键词研究</h3><div class="card-sub">搜索量 / 难度 / CPC / 意图（OpenSEO · DataForSEO）</div>
        <table class="tbl"><thead><tr><th>关键词</th><th>月搜索量</th><th>难度</th><th>CPC</th><th>意图</th></tr></thead><tbody>${kw}</tbody></table>
      </div>
      <div class="card"><h3>📊 当前排名</h3><div class="card-sub">核心关键词 Google 实时位置</div>
        <table class="tbl"><thead><tr><th>关键词</th><th>排名</th><th>区间</th></tr></thead><tbody>${rank}</tbody></table>
      </div>
    </div>
    <div class="card"><h3>📈 排名趋势</h3><div class="card-sub">8 周追踪（越低越好）</div>
      ${lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels)}
      <div class="legend"><span><i style="background:#22d3ee"></i>杭州装修公司</span><span><i style="background:#8b5cf6"></i>杭州旧房翻新</span></div>
    </div>
    <div class="cols-2">
      <div class="card"><h3>🔗 外链分析</h3><div class="card-sub">引用域名与锚文本分布</div>
        <table class="tbl"><thead><tr><th>锚文本</th><th>数量</th></tr></thead><tbody>${anchors}</tbody></table>
      </div>
      <div class="card"><h3>🩺 站点审计</h3><div class="card-sub">页级 SEO 信号体检</div>
        <div class="list-item"><div class="bullet" style="background:var(--red)"></div><div><div class="li-title">断链 ${d.seo.audit.brokenLinks} 处</div><div class="li-sub">需修复 404 链接</div></div></div>
        <div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">重复标题 ${d.seo.audit.dupTitles} 处</div><div class="li-sub">SameTitle 导致权重分散</div></div></div>
        <div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">缺 meta description ${d.seo.audit.missingMeta} 页</div><div class="li-sub">影响点击率</div></div></div>
      </div>
    </div>`;
}

/* 模块 B：AI 搜索可见性 */
function renderGEO() {
  const d = state.data;
  const bars = d.geo.models.map(m => ({
    label: m.name, value: m.score,
    color: m.mentioned ? (m.score >= 55 ? '#8b5cf6' : '#a78bfa') : '#475569'
  }));
  const cit = d.geo.citationDomains.map(c => `<tr>
    <td>${esc(c.domain)}</td><td>${c.count}</td>
    <td>${c.you ? '<span class="tag-mini tag-green">✓ 你</span>' : '<span class="tag-mini tag-red">竞品</span>'}</td></tr>`).join('');
  const opp = d.geo.opportunities.map(o => `<div class="list-item"><div class="bullet"></div><div><div class="li-title">${esc(o.url)}</div><div class="li-sub">${esc(o.reason)}</div></div></div>`).join('');
  const bc = d.geo.battlecard;
  const aeo = d.geo.aeo;

  $('view-geo').innerHTML = `
    <div class="cols-2">
      <div class="card" style="display:flex;align-items:center;gap:24px">
        <div>${ring(d.geo.overall, '#8b5cf6', 150)}</div>
        <div><h3 style="margin-bottom:6px">AI 可见性总分</h3>
          <div class="card-sub">综合 ChatGPT / Perplexity / Gemini / Copilot / Grok / Google AI Overviews 六模型</div>
          <div class="small muted mt">8 周前：<b style="color:#fff">0</b> → 现在：<b style="color:var(--violet-soft)">${d.geo.overall}</b></div>
        </div>
      </div>
      <div class="card"><h3>🤖 六模型得分</h3><div class="card-sub">被 AI 提到并正确引用的程度</div>
        ${barChart(bars)}
      </div>
    </div>
    <div class="cols-2">
      <div class="card"><h3>🔗 引用分析</h3><div class="card-sub">哪些域名在 AI 回答里提到了你 / 竞品</div>
        <table class="tbl"><thead><tr><th>域名</th><th>被引次数</th><th>归属</th></tr></thead><tbody>${cit}</tbody></table>
      </div>
      <div class="card"><h3>💡 引用机会</h3><div class="card-sub">竞品被引用、你却没有的来源</div>${opp}</div>
    </div>
    <div class="cols-2">
      <div class="card"><h3>⚔️ 竞品 Battlecard</h3><div class="card-sub">你 vs ${esc(bc.competitor.name)}</div>
        <div class="flex" style="gap:18px">
          <div style="flex:1"><div class="small muted mb">你的强项 / 弱项</div>
            ${bc.you.强项.map(x => `<span class="tag-mini tag-green" style="margin:0 6px 6px 0;display:inline-block">+ ${esc(x)}</span>`).join('')}
            ${bc.you.弱项.map(x => `<span class="tag-mini tag-red" style="margin:0 6px 6px 0;display:inline-block">- ${esc(x)}</span>`).join('')}
          </div>
          <div style="flex:1"><div class="small muted mb">${esc(bc.competitor.name)}</div>
            ${bc.competitor.强项.map(x => `<span class="tag-mini tag-green" style="margin:0 6px 6px 0;display:inline-block">+ ${esc(x)}</span>`).join('')}
            ${bc.competitor.弱项.map(x => `<span class="tag-mini tag-red" style="margin:0 6px 6px 0;display:inline-block">- ${esc(x)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="card"><h3>🧪 AEO 站点审计</h3><div class="card-sub">你的站点对 AI 是否友好</div>
        <div class="list-item"><div class="bullet" style="background:${aeo.llmsTxt ? 'var(--green)' : 'var(--red)'}"></div><div><div class="li-title">llms.txt</div><div class="li-sub">${aeo.llmsTxt ? '已部署' : '缺失 — 强烈建议生成（见行动优化）'}</div></div></div>
        <div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">Schema.org 结构化数据</div><div class="li-sub">${aeo.schema}</div></div></div>
        <div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">BLUF 密度 / 标题结构</div><div class="li-sub">${aeo.bluf} / ${aeo.titleStruct}</div></div></div>
      </div>
    </div>`;
}

/* 模块 D：行动优化层 */
function renderAction() {
  const d = state.data;
  const opp = d.geo.opportunities.map((o, i) => `<label class="list-item">
      <input type="checkbox" onchange="countAction()" ${i < 1 ? 'checked' : ''}/>
      <div><div class="li-title">${esc(o.url)}</div><div class="li-sub">${esc(o.reason)}</div></div></label>`).join('');
  $('view-action').innerHTML = `
    <div class="card"><h3>📄 llms.txt 一键生成</h3><div class="card-sub">AI 版 sitemap —— 告诉 ChatGPT / Perplexity 你的业务是什么</div>
      <div class="flex">
        <button class="btn btn-primary btn-sm" onclick="genLLMs()">⚡ 生成 llms.txt</button>
        <button class="btn btn-ghost btn-sm" onclick="copyLLMs()">复制</button>
        <button class="btn btn-ghost btn-sm" onclick="downloadLLMs()">下载 .txt</button>
      </div>
      <textarea id="llms-out" class="code-box mt" placeholder="点击「生成 llms.txt」后，这里会出现可直接托管的文件内容…"></textarea>
    </div>
    <div class="cols-2">
      <div class="card"><h3>🧱 结构化数据建议</h3><div class="card-sub">为「${esc(d.city)}${esc(d.industry)}」关键页添加 LocalBusiness JSON-LD</div>
        <pre>{ "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness",
  "name": "${esc(d.brand)}", "areaServed": "${esc(d.city)}",
  "url": "https://${esc(d.domain)}",
  "address": { "@type": "PostalAddress", "addressLocality": "${esc(d.city)}" } }</pre>
      </div>
      <div class="card"><h3>📋 引用建设清单</h3><div class="card-sub">勾选完成项，进度计入老板视图</div>${opp}
        <div class="small muted mt" id="action-count">已完成 1 / 3</div>
      </div>
    </div>
    <div class="card"><h3>🔁 改完复查</h3><div class="card-sub">标记优化动作完成 → 下一轮监测自动对比前后评分</div>
      <div class="cols-2">
        <div class="stat"><div class="label">优化前 AI 可见性</div><div class="value">0</div></div>
        <div class="stat"><div class="label">当前 AI 可见性</div><div class="value" style="color:var(--violet-soft)">${d.geo.overall}</div></div>
      </div>
      <p class="small muted mt">提示：完成上方 llms.txt 生成 + 引用建设后，点击顶栏「重新检测」即可看到分数变化（演示环境复用同一数据集，真实环境将拉取最新结果）。</p>
    </div>`;
}

/* 模块 E：报告与分享 */
function renderReport() {
  const d = state.data;
  $('view-report').innerHTML = `
    <div class="card" id="report-card">
      <div class="flex" style="justify-content:space-between">
        <div><h3 style="margin:0">📑 双引擎周报</h3><div class="card-sub">${esc(d.brand)} · ${esc(d.domain)} · 自动生成</div></div>
        <span class="tag-mini tag-geo">本周</span>
      </div>
      <div class="boss-view mt">
        <div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ${Math.min(...Object.values(d.seo.currentRank))} 名</div></div>
        <div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">${d.geo.overall}</div></div>
        <div class="boss-num"><div class="b-label">被引用域名</div><div class="b-value gold">${d.geo.citationDomains.filter(c=>c.you).length}</div></div>
      </div>
      <div class="summary-bar">${d.summary}</div>
      <div class="card-sub">六模型得分</div>
      ${barChart(d.geo.models.map(m=>({label:m.name,value:m.score,color:m.mentioned?'#8b5cf6':'#475569'})),{h:200})}
      <div class="copy-row">
        <button class="btn btn-primary btn-sm" onclick="exportReport()">⬇️ 导出 HTML 周报</button>
        <button class="btn btn-ghost btn-sm" onclick="copyReportLink()">🔗 复制分享链接</button>
        <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ 打印 / PDF</button>
      </div>
    </div>`;
}

/* ----------------------- 行动层交互 ----------------------- */
function countAction() {
  const boxes = document.querySelectorAll('#view-action input[type=checkbox]');
  let n = 0; boxes.forEach(b => { if (b.checked) n++; });
  state.actionDone = n;
  const elc = $('action-count'); if (elc) elc.textContent = `已完成 ${n} / ${boxes.length}`;
}
function genLLMs() {
  const d = state.data;
  const txt =
`# ${d.brand}

> ${d.brand} 是${d.city}本地${d.industry}服务商，提供一站式设计与施工解决方案，专注于让业主以合理预算获得靠谱落地效果。

## 提供的服务
- ${d.city}新房装修设计与施工
- ${d.city}旧房 / 二手房翻新改造
- 全屋定制与软装搭配
- 免费上门量房与透明报价

## 擅长领域
- 本地真实完工案例丰富，支持到店参观
- 透明化报价，无隐藏增项
- 自有施工团队，工期可控

## 联系方式
- 官网: https://${d.domain}
- 服务城市: ${d.city}
- 适合场景: 业主在询问「${d.city}靠谱的${d.industry}公司 / 推荐」时被 AI 引用与推荐

## 常见问题（供 AI 引用）
- Q: ${d.city}装修公司怎么选？ A: 看真实案例、透明报价、自有团队，${d.brand}均满足。
- Q: ${d.city}旧房翻新多少钱？ A: 视面积与方案而定，${d.brand}提供免费量房报价。
`;
  $('llms-out').value = txt;
  toast('llms.txt 已生成，可下载托管到网站根目录');
}
function copyLLMs() {
  const v = $('llms-out').value;
  if (!v) { toast('请先生成 llms.txt'); return; }
  navigator.clipboard.writeText(v).then(() => toast('已复制到剪贴板')).catch(() => toast('复制失败，请手动选择'));
}
function downloadLLMs() {
  const v = $('llms-out').value;
  if (!v) { toast('请先生成 llms.txt'); return; }
  const blob = new Blob([v], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'llms.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}
function copyReportLink() {
  const link = 'https://mingwujie.app/r/' + Math.random().toString(36).slice(2, 10);
  navigator.clipboard.writeText(link).then(() => toast('分享链接已复制：' + link)).catch(() => toast('链接：' + link));
}
function exportReport() {
  const card = $('report-card');
  if (!card) return;
  const html = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>双引擎周报 - ${esc(state.data.brand)}</title>
    <style>body{font-family:system-ui,'Microsoft YaHei',sans-serif;background:#0b0d1a;color:#e9ebf5;padding:40px;max-width:760px;margin:auto}
    .card{background:#11131f;border:1px solid #222;padding:24px;border-radius:14px;margin:18px 0}
    .num{font-size:40px;font-weight:800;color:#22d3ee}.v{color:#a78bfa}.g{color:#f7c948}</style></head>
    <body><h1>双引擎周报 · ${esc(state.data.brand)}</h1>${card.innerHTML}</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '双引擎周报_' + state.data.brand + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('周报已导出为 HTML 文件');
}

/* ----------------------- 工具 ----------------------- */
let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ----------------------- 启动 ----------------------- */
window.addEventListener('DOMContentLoaded', () => {
  // 落地页 CTA
  document.querySelectorAll('[data-open-wb]').forEach(b => b.addEventListener('click', openWorkbench));
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.view)));
  const form = $('scan-form-el'); if (form) form.addEventListener('submit', runScan);
  $('bossToggle') && ($('bossToggle').addEventListener('click', toggleBoss));
});
