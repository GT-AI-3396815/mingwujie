/* ============================================================
   光体•名无界 — 工作台逻辑（演示态 v0.2）
   ------------------------------------------------------------
   ⚠️ 集成点说明（MVP 演示阶段使用按行业参数化生成的演示数据）：
   - 传统搜索(SEO) 数据来源 = OpenSEO 自托管 API
       GET /api/openseo/keywords?domain=&kw=
       GET /api/openseo/rankings?domain=&kw=
       GET /api/openseo/backlinks?domain=
       GET /api/openseo/audit?domain=
   - AI 搜索(GEO) 数据来源 = GEO/AEO Tracker 自托管 API
       POST /api/geo/scan  {domain, prompts}
       GET  /api/geo/visibility?domain=
       GET  /api/geo/citations?domain=
   将下方 fetchBackend() 内的 buildDemoData(form) 换成真实 fetch 即可上线。
   v0.2 修复：演示数据按行业/城市参数化（律所不再出现装修数据）；
   全站明确标注演示态；7 个 AI 平台口径统一（含豆包）。
   ============================================================ */

'use strict';

/* ----------------------- 行业配置（P0：按行业分支模板） ----------------------- */
const INDUSTRIES = {
  '装修': { schema: 'HomeAndConstructionBusiness', short: '装修',
    kws: ['装修公司', '家装设计', '旧房翻新', '装修报价', '靠谱装修'],
    services: ['新房装修设计与施工', '旧房 / 二手房翻新改造', '全屋定制与软装搭配', '免费上门量房与透明报价'],
    platforms: ['土巴兔', '齐家网', '大众点评', '本地生活论坛'],
    faq: [['装修公司怎么选？', '看真实完工案例、透明报价与自有施工团队。'], ['旧房翻新多少钱？', '视面积与方案而定，可预约免费量房获取报价。']] },
  '律所': { schema: 'LegalService', short: '律师事务所',
    kws: ['律师事务所', '法律咨询', '婚姻家事律师', '合同纠纷律师', '刑事辩护'],
    services: ['婚姻家事与继承法律服务', '合同纠纷与商事诉讼', '刑事辩护', '企业常年法律顾问'],
    platforms: ['华律网', '找法网', '知乎', '法律快车'],
    faq: [['怎么选择律师事务所？', '看专业领域匹配度、真实案例经验与收费透明度。'], ['请律师大概多少钱？', '按案件类型与复杂度计费，可先免费咨询评估。']] },
  '医美': { schema: 'MedicalClinic', short: '医美机构',
    kws: ['医美机构', '双眼皮手术', '皮肤管理', '注射美容', '靠谱医美'],
    services: ['眼部 / 鼻部精细化整形', '皮肤管理与光电项目', '注射类微整形', '术后修复与随访管理'],
    platforms: ['新氧', '大众点评', '小红书', '更美'],
    faq: [['怎么选择靠谱的医美机构？', '查验《医疗机构执业许可证》与医生执业资质，看真实案例。'], ['医美项目价格区间？', '不同项目差异较大，建议到院面诊后获取个性化方案。']] },
  '家政': { schema: 'HomeAndConstructionBusiness', short: '家政公司',
    kws: ['家政公司', '保洁服务', '月嫂育婴', '家电清洗', '开荒保洁'],
    services: ['日常保洁与开荒保洁', '月嫂 / 育婴师服务', '家电深度清洗', '收纳整理服务'],
    platforms: ['58同城', '天鹅到家', '大众点评', '美团'],
    faq: [['怎么选择家政公司？', '看阿姨实名认证、保险保障与明码标价。'], ['深度保洁怎么收费？', '按面积与服务内容计费，支持上门评估报价。']] },
  '电商': { schema: 'Organization', short: '品牌',
    kws: ['{brand}官网', '{brand}怎么样', '{brand}正品', '{brand}价格', '{brand}售后'],
    services: ['官方正品直营', '全渠道售后保障', '会员积分体系', '7 天无理由退换'],
    platforms: ['知乎', '小红书', '什么值得买', '行业垂媒'],
    faq: [['怎么辨别正品？', '认准官方旗舰店渠道与防伪溯源标识。'], ['售后政策是什么？', '7 天无理由退换，运费险全覆盖。']] },
  '教育': { schema: 'EducationalOrganization', short: '教育机构',
    kws: ['教育机构', '课程培训', '少儿编程', '成人职业培训', '考公考研'],
    services: ['体系化课程设计', '小班 / 一对一教学', '免费试听与入学测评', '学习效果跟踪反馈'],
    platforms: ['知乎', '大众点评', '小红书', '本地家长论坛'],
    faq: [['怎么选择培训机构？', '查验办学资质、师资背景与退费政策。'], ['课程怎么收费？', '按课时 / 学期计费，支持免费试听。']] },
  '餐饮': { schema: 'Restaurant', short: '餐厅',
    kws: ['餐厅推荐', '特色菜', '聚会餐厅', '宴请包间', '探店'],
    services: ['招牌特色菜品', '宴席 / 聚餐包间', '外卖与到店自取', '会员储值优惠'],
    platforms: ['大众点评', '美团', '小红书', '抖音本地生活'],
    faq: [['怎么选餐厅？', '看真实用户评价、招牌菜与门店环境。'], ['需要排队吗？', '支持线上取号与提前预订包间。']] },
  '汽修': { schema: 'AutoRepair', short: '汽修店',
    kws: ['汽修店', '汽车保养', '钣金喷漆', '汽车维修', '故障诊断'],
    services: ['常规保养与深度养护', '钣金喷漆', '故障诊断与维修', '事故车维修理赔协助'],
    platforms: ['大众点评', '途虎', '汽车之家', '本地车主论坛'],
    faq: [['怎么选择汽修店？', '看技师资质、配件来源与透明报价。'], ['保养多少钱？', '按车型与项目计费，支持线上先询价。']] },
  '宠物': { schema: 'LocalBusiness', short: '宠物店',
    kws: ['宠物店', '宠物美容', '宠物寄养', '宠物用品', '宠物洗护'],
    services: ['宠物美容洗护', '宠物寄养', '宠物医疗合作转诊', '用品与食品零售'],
    platforms: ['大众点评', '小红书', '美团', '本地宠物社群'],
    faq: [['怎么选宠物店？', '看美容师资质、环境卫生与真实用户评价。'], ['寄养怎么收费？', '按宠物体型与寄养天数计费，支持到店参观。']] },
  '其他': { schema: 'LocalBusiness', short: '企业',
    kws: ['{brand}官网', '{brand}怎么样', '{brand}口碑', '{brand}价格', '{brand}联系方式'],
    services: ['核心产品与服务', '本地化服务团队', '透明报价体系', '完善的售后保障'],
    platforms: ['知乎', '行业垂直媒体', '大众点评', '本地论坛'],
    faq: [['怎么了解这家企业？', '访问官网，查看真实案例与客户评价。'], ['如何联系咨询？', '通过官网或电话联系，支持免费咨询。']] }
};

/* 7 个 AI 平台（P0：口径统一，含豆包） */
const AI_PLATFORMS = ['ChatGPT', '豆包', 'Perplexity', 'Gemini', 'Copilot', 'Grok', 'Google AI Overviews'];
const BASE_SCORES = [62, 41, 58, 45, 51, 38, 67];
const BASE_RANKS = [11, 22, 17, 28, 9];

/* ----------------------- 套餐配置 ----------------------- */
const PLANS = {
  free: {
    name: '体验版', price: '¥0 / 月',
    items: ['1 个域名 · 5 个关键词', '单平台 AI 可见性 1 次/月', '基础站点审计', 'llms.txt 生成（每月 1 次）'],
    cta: '⚡ 免费开始体验', note: '免费开始，无需绑卡。'
  },
  growth: {
    name: '成长版', price: '¥99 / 月',
    items: ['3 域名 / 50 关键词周追踪', '7 平台 AI 监测周更', 'llms.txt 生成与托管', '双引擎周报', '竞品 AI 引用对比'],
    cta: '✔ 预约成长版', note: '内测期免费使用，正式上线前 48 小时通知你再决定是否付费。'
  },
  flagship: {
    name: '旗舰版', price: '¥299 / 月',
    items: ['10 域名 / 200 关键词日更', '7 平台 AI 监测日更', '引用机会 + 竞品 Battlecard', 'AEO 审计', 'PDF 白标周报'],
    cta: '✔ 预约旗舰版', note: '内测期免费使用，正式上线前 48 小时通知你再决定是否付费。'
  }
};

const LEGAL = {
  privacy: `<h3 style="margin-bottom:12px">隐私政策（内测版）</h3>
    <p class="small muted" style="line-height:1.8">
    1. <b style="color:var(--text)">我们收集什么：</b>仅收集你主动填写的域名、品牌名、城市与行业，用于生成可见性报告。<br><br>
    2. <b style="color:var(--text)">数据怎么存：</b>当前演示阶段，所有数据仅保存在你自己的浏览器本地，不上传服务器；正式版采用自托管部署，检测数据不与其他用户共享。<br><br>
    3. <b style="color:var(--text)">第三方服务：</b>检测依赖自托管 OpenSEO（数据源 DataForSEO）与 GEO/AEO Tracker（采集管道 Bright Data），均为用户自带 Key（BYOK），第三方仅接收待检测域名本身。<br><br>
    4. <b style="color:var(--text)">你的权利：</b>可随时清除浏览器本地数据；正式版提供一键导出与永久删除。<br><br>
    5. 本政策为内测占位版本，正式版上线前将按《个人信息保护法》要求完整重写并公示。</p>`,
  terms: `<h3 style="margin-bottom:12px">服务条款（内测版）</h3>
    <p class="small muted" style="line-height:1.8">
    1. <b style="color:var(--text)">服务性质：</b>本站为双引擎可见性工作台的内测演示版，检测结果为按行业参数化生成的演示数据，不构成对任何真实网站的真实检测结论。<br><br>
    2. <b style="color:var(--text)">不承诺条款：</b>我们不承诺任何「排名第一」「AI 必然推荐」效果；所有优化动作的效果以接入真实 API 后的前后对比数据为准。<br><br>
    3. <b style="color:var(--text)">合规使用：</b>用户应仅检测自己拥有或已获授权的域名；不得利用本服务进行任何违反平台服务条款的自动化滥用。<br><br>
    4. <b style="color:var(--text)">开源底座：</b>技术底座基于 MIT 协议开源项目（OpenSEO、GEO/AEO Tracker），相应开源许可适用于底层组件。<br><br>
    5. 本条款为内测占位版本，正式版上线前将完整重写并公示。</p>`
};

/* ----------------------- 演示数据生成（按行业参数化） ----------------------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildDemoData(form) {
  const cfg = INDUSTRIES[form.industry] || INDUSTRIES['其他'];
  const brand = form.brand || form.domain.split('.')[0];
  const city = form.city || '本地';
  const h = hashStr(form.domain || 'demo');
  const jit = (base, spread, idx) => base + ((h >> (idx * 3)) % (spread * 2 + 1)) - spread;
  const kwName = (kw) => kw.indexOf('{brand}') >= 0 ? kw.replace('{brand}', brand) : city + kw;

  // 关键词（数值按域名 hash 轻微抖动，确定性可复现）
  const vols = [5400, 2900, 1900, 3600, 880], diffs = [68, 55, 47, 61, 39], cpcs = [3.2, 2.8, 2.1, 4.0, 3.5];
  const keywords = cfg.kws.map((kw, i) => ({
    kw: kwName(kw),
    vol: Math.max(300, jit(vols[i], 400, i)),
    diff: Math.min(95, Math.max(20, jit(diffs[i], 6, i + 5))),
    cpc: Math.max(0.5, jit(Math.round(cpcs[i] * 10), 8, i + 10) / 10),
    intent: '商业'
  }));

  // 当前排名（末周 = 趋势终点）
  const ranks = BASE_RANKS.map((r, i) => Math.min(60, Math.max(3, jit(r, 4, i + 15))));
  const currentRank = {};
  keywords.forEach((k, i) => { currentRank[k.kw] = ranks[i]; });

  // 8 周排名趋势：起点 = 终点 + 31/33
  const rankTrend = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    series: [
      { name: keywords[0].kw, color: '#22d3ee', data: [] },
      { name: keywords[2].kw, color: '#8b5cf6', data: [] }
    ]
  };
  rankTrend.series[0].data = Array.from({ length: 8 }, (_, i) => Math.max(3, Math.round(ranks[0] + 31 - i * 4.4)));
  rankTrend.series[1].data = Array.from({ length: 8 }, (_, i) => Math.max(3, Math.round(ranks[2] + 33 - i * 4.7)));

  const scores = BASE_SCORES.map((s, i) => Math.min(95, Math.max(15, jit(s, 5, i + 20))));
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const models = AI_PLATFORMS.map((name, i) => ({
    name: name, score: scores[i],
    mentioned: scores[i] >= 40,
    citations: scores[i] >= 40 ? [cfg.platforms[i % cfg.platforms.length], cfg.platforms[(i + 1) % cfg.platforms.length]] : []
  }));

  const history = [0, 12, 25, 33, 41, 48, 55, overall];
  const citationDomains = cfg.platforms.map((p, i) => ({
    domain: p, count: 14 - i * 2, you: i < 3
  }));
  const opportunities = [
    { url: cfg.platforms[0] + ' · ' + city + cfg.short + '口碑榜', reason: '竞品被引用、' + brand + '未出现，建议补充真实案例 / 客户评价' },
    { url: cfg.platforms[1] + ' · ' + city + cfg.short + '案例库', reason: '行业高频引用源，建议以专业身份投稿内容' },
    { url: cfg.platforms[3] + ' · 本地用户问答帖', reason: '本地用户聚集，适合以专家身份答疑获取引用' }
  ];
  const competitor = city + cfg.short + '同行「示例竞品」';

  const summary = '本周你在谷歌「' + keywords[0].kw + '」第 <b>' + ranks[0] + '</b> 名（较首周 ↑31 位），AI 回答整体可见性 <b>' + overall + '</b> 分（7 个 AI 平台综合，含豆包）。<span class="muted">[演示数据：按「' + form.industry + '·' + city + '」模拟生成]</span> 建议优先补全 <b>llms.txt</b> 并争取 ' + cfg.platforms[0] + ' / ' + cfg.platforms[1] + ' 等来源引用。';

  return {
    domain: form.domain, brand: brand, city: city, industry: form.industry,
    demo: true,
    seo: {
      keywords: keywords, rankTrend: rankTrend, currentRank: currentRank,
      backlinks: {
        domains: jit(23, 4, 30), total: jit(156, 20, 31),
        topAnchors: [
          { a: keywords[0].kw, n: jit(31, 4, 32) },
          { a: brand + '官网', n: jit(24, 3, 33) },
          { a: keywords[1].kw, n: jit(18, 3, 34) },
          { a: keywords[2].kw, n: jit(12, 3, 35) }
        ]
      },
      audit: { brokenLinks: jit(3, 2, 36), dupTitles: jit(5, 2, 37), missingMeta: jit(8, 3, 38), score: jit(72, 6, 39) }
    },
    geo: {
      models: models, overall: overall, history: history,
      historyLabels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      citationDomains: citationDomains, opportunities: opportunities,
      battlecard: {
        you: { '强项': ['本地真实案例丰富', 'Google 排名上升快'], '弱项': ['AI 引用源少', 'llms.txt 缺失'] },
        competitor: { name: competitor, '强项': ['高权重平台被引多', 'AI 概述常驻'], '弱项': ['Google 自然排名靠后'] }
      },
      aeo: { llmsTxt: false, schema: '部分', bluf: '中等', titleStruct: '良好' }
    },
    summary: summary
  };
}

/* ----------------------- 全局状态 ----------------------- */
const state = { loaded: false, view: 'dashboard', boss: false, data: null, actionDone: 0 };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ----------------------- 后端集成桩 ----------------------- */
async function fetchBackend(form) {
  // TODO(MVP→上线): 替换为真实 OpenSEO + GEO/AEO Tracker API 调用
  // const seo = await fetch('/api/openseo/keywords?domain='+form.domain).then(r=>r.json());
  // const geo = await fetch('/api/geo/visibility?domain='+form.domain).then(r=>r.json());
  // return { ...真实数据, demo:false, ...form };
  return buildDemoData(form);
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
    const el = $('view-' + v);
    if (el) el.classList.toggle('hidden', v !== name);
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
  const raw = ($('f-domain').value || '').trim();
  const domain = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const brand = ($('f-brand').value || '').trim();
  const city = ($('f-city').value || '').trim();
  const industry = ($('f-industry').value || '').trim();
  if (!domain) { toast('请先输入你的网站域名'); return; }
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
    toast('域名格式看起来不对，例如 example.com'); return;
  }
  $('f-domain').value = domain;

  $('loading').classList.remove('hidden');
  const steps = [
    '正在连接 OpenSEO 拉取排名数据…（演示环境）',
    '正在向 7 个 AI 平台发起可见性探测…（演示环境）',
    '正在分析引用来源与竞品 battlecard…',
    '正在生成双引擎周报…'
  ];
  let i = 0;
  $('load-step').textContent = steps[0];
  const timer = setInterval(() => { i = (i + 1) % steps.length; $('load-step').textContent = steps[i]; }, 700);

  fetchBackend({ domain: domain, brand: brand, city: city, industry: industry }).then(d => {
    clearInterval(timer);
    state.data = d;
    state.loaded = true;
    state.actionDone = 1;
    $('loading').classList.add('hidden');
    $('wb-domain').textContent = d.domain;
    $('wb-brand').textContent = d.brand;
    $('scan-form').classList.add('hidden');
    $('wb-content').classList.remove('hidden');
    const badge = $('demoBadge'); if (badge) badge.classList.remove('hidden');
    const wm = $('demo-watermark'); if (wm) wm.classList.remove('hidden');
    switchTab('dashboard');
    renderAll();
    toast('双引擎检测完成 · 演示数据（按行业模拟生成，接入真实 API 后实时检测）');
  }).catch(err => {
    clearInterval(timer);
    $('loading').classList.add('hidden');
    toast('检测失败：' + (err && err.message ? err.message : '未知错误') + '，请重试');
  });
}

/* ----------------------- 图表工具 ----------------------- */
function ring(percent, color, size) {
  size = size || 130;
  const r = (size - 16) / 2, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
  const cx = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="rgba(255,255,255,.08)" stroke-width="11" fill="none"/>' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + color + '" stroke-width="11" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
    '<text x="' + cx + '" y="' + (cx + 4) + '" text-anchor="middle" fill="#fff" font-size="30" font-weight="800">' + percent + '</text>' +
    '<text x="' + cx + '" y="' + (cx + 26) + '" text-anchor="middle" fill="#8b90a8" font-size="12">/100</text></svg>';
}

function lineChart(series, labels, opts) {
  opts = opts || {};
  const w = opts.w || 600, h = opts.h || 250, pad = { l: 42, r: 18, t: 16, b: 30 };
  const all = series.flatMap(s => s.data);
  if (!all.length) return '';
  let max = Math.max(...all) * 1.12 || 1, min = 0;
  const n = series[0].data.length;
  const X = i => pad.l + (w - pad.l - pad.r) * (i / (n - 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  let grid = '', paths = '';
  for (let g = 0; g <= 4; g++) {
    const yy = pad.t + (h - pad.t - pad.b) * g / 4;
    const val = Math.round(max - (max - min) * g / 4);
    grid += '<line x1="' + pad.l + '" y1="' + yy + '" x2="' + (w - pad.r) + '" y2="' + yy + '" stroke="rgba(255,255,255,.06)"/>';
    grid += '<text x="' + (pad.l - 7) + '" y="' + (yy + 4) + '" text-anchor="end" fill="#6b7190" font-size="10">' + val + '</text>';
  }
  series.forEach(s => {
    const d = s.data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
    paths += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.5"/>';
    s.data.forEach((v, i) => { paths += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3" fill="' + s.color + '"/>'; });
  });
  let xl = '';
  (labels || []).forEach((lb, i) => { xl += '<text x="' + X(i) + '" y="' + (h - 8) + '" text-anchor="middle" fill="#6b7190" font-size="10">' + lb + '</text>'; });
  return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + paths + xl + '</svg>';
}

function barChart(items, opts) {
  opts = opts || {};
  const w = opts.w || 600, h = opts.h || 270, pad = { l: 148, r: 36, t: 10, b: 20 };
  const max = 100, n = items.length, gap = (h - pad.t - pad.b) / n, bw = gap * 0.62;
  let s = '';
  items.forEach((it, i) => {
    const y = pad.t + gap * i + (gap - bw) / 2;
    const ww = (w - pad.l - pad.r) * (it.value / max);
    s += '<text x="' + (pad.l - 10) + '" y="' + (y + bw / 2 + 4) + '" text-anchor="end" fill="#cfd3e6" font-size="12.5">' + esc(it.label) + '</text>';
    s += '<rect x="' + pad.l + '" y="' + y + '" width="' + (w - pad.l - pad.r) + '" height="' + bw + '" rx="6" fill="rgba(255,255,255,.05)"/>';
    s += '<rect x="' + pad.l + '" y="' + y + '" width="' + ww.toFixed(1) + '" height="' + bw + '" rx="6" fill="' + it.color + '"/>';
    s += '<text x="' + (pad.l + ww + 8) + '" y="' + (y + bw / 2 + 4) + '" fill="#fff" font-size="12.5" font-weight="700">' + it.value + '</text>';
  });
  return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + s + '</svg>';
}

function legendOf(series) {
  return '<div class="legend">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>';
}

/* ----------------------- 渲染：总调度 ----------------------- */
function renderAll() { renderDashboard(); renderSEO(); renderGEO(); renderAction(); renderReport(); }
function renderCurrent() {
  const map = { dashboard: renderDashboard, seo: renderSEO, geo: renderGEO, action: renderAction, report: renderReport };
  if (map[state.view]) map[state.view]();
}

/* 看板 */
function renderDashboard() {
  if (!state.data) { renderEmpty('view-dashboard'); return; }
  const d = state.data;
  const ranks = Object.values(d.seo.currentRank);
  const topRank = Math.min(...ranks);
  const aiScore = d.geo.overall;
  const seoDelta = d.seo.rankTrend.series[0].data[0] - d.seo.rankTrend.series[0].data[7]; // P3：从数据计算
  const aiDelta = d.geo.history[7] - d.geo.history[0];
  let html = '';
  if (state.boss) {
    html += '<div class="boss-view">' +
      '<div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ' + topRank + ' 名</div><div class="small muted">核心关键词自然搜索</div></div>' +
      '<div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">' + aiScore + '</div><div class="small muted">7 个 AI 平台综合（0–100）</div></div>' +
      '<div class="boss-num"><div class="b-label">本周动作完成</div><div class="b-value gold">' + state.actionDone + '/3</div><div class="small muted">行动优化清单</div></div></div>';
    html += '<div class="summary-bar">' + d.summary + '</div>';
    html += '<p class="muted small">老板视图：只看 3 个核心数字，复杂图表已隐藏。点右上角「完整视图」查看全部数据。</p>';
    $('view-dashboard').innerHTML = html;
    return;
  }
  html += '<div class="stat-grid">' +
    '<div class="stat"><div class="label">谷歌最佳排名</div><div class="value" style="color:var(--cyan)">第 ' + topRank + ' 名</div><div class="delta up">↑ 较首周 +' + seoDelta + ' 位</div></div>' +
    '<div class="stat"><div class="label">AI 可见性分</div><div class="value" style="color:var(--violet-soft)">' + aiScore + '</div><div class="delta up">↑ 较首周 +' + aiDelta + '</div></div>' +
    '<div class="stat"><div class="label">被引用域名</div><div class="value">' + d.geo.citationDomains.filter(c => c.you).length + '</div><div class="delta">个来源提到你</div></div>' +
    '<div class="stat"><div class="label">待办优化</div><div class="value" style="color:var(--gold)">' + d.geo.opportunities.length + '</div><div class="delta down">个引用机会待争取</div></div></div>';
  html += '<div class="summary-bar">' + d.summary + '</div>';
  html += '<div class="cols-2">' +
    '<div class="card"><h3>📈 传统搜索排名趋势</h3><div class="card-sub">核心关键词 8 周 Google 排名（越低越好）</div>' +
    lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels) + legendOf(d.seo.rankTrend.series) + '</div>' +
    '<div class="card"><h3>🤖 AI 可见性成长</h3><div class="card-sub">7 个 AI 平台综合可见性分 8 周变化</div>' +
    lineChart([{ name: 'AI 可见性', color: '#8b5cf6', data: d.geo.history }], d.geo.historyLabels) + '</div></div>';
  const notYou = d.geo.citationDomains.filter(c => !c.you).map(c => c.domain).join(' / ');
  html += '<div class="card"><h3>🎯 下一步建议（行动优化层）</h3><div class="card-sub">名无界的核心价值：告诉你下一步改什么</div>' +
    '<div class="list-item"><div class="bullet"></div><div><div class="li-title">生成并托管 llms.txt</div><div class="li-sub">让 ChatGPT / 豆包 / Perplexity 正确理解你的业务（当前缺失）</div></div></div>' +
    '<div class="list-item"><div class="bullet"></div><div><div class="li-title">争取 ' + esc(notYou) + ' 引用</div><div class="li-sub">竞品被引用而你没有的来源 → 见「行动优化」</div></div></div>' +
    '<div class="list-item"><div class="bullet"></div><div><div class="li-title">补全关键页结构化数据</div><div class="li-sub">为「' + esc(d.seo.keywords[0].kw) + '」页添加 ' + (INDUSTRIES[d.industry] ? INDUSTRIES[d.industry].schema : 'LocalBusiness') + ' JSON-LD</div></div></div></div>';
  $('view-dashboard').innerHTML = html;
}

/* 模块 A：传统搜索可见性 */
function renderSEO() {
  if (!state.data) { renderEmpty('view-seo'); return; }
  const d = state.data;
  let kw = d.seo.keywords.map(k => '<tr><td>' + esc(k.kw) + '</td><td>' + k.vol.toLocaleString() + '</td><td>' + k.diff + '</td><td>¥' + k.cpc.toFixed(1) + '</td><td><span class="tag-mini tag-seo">' + k.intent + '</span></td></tr>').join('');
  let rank = Object.entries(d.seo.currentRank).map(([k, v]) =>
    '<tr><td>' + esc(k) + '</td><td>第 ' + v + ' 名</td><td><span class="tag-mini ' + (v <= 10 ? 'tag-green' : v <= 30 ? 'tag-amber' : 'tag-red') + '">' + (v <= 10 ? '首页' : v <= 30 ? '前3页' : '待提升') + '</span></td></tr>').join('');
  let anchors = d.seo.backlinks.topAnchors.map(a => '<tr><td>' + esc(a.a) + '</td><td>' + a.n + '</td></tr>').join('');

  $('view-seo').innerHTML =
    '<div class="stat-grid">' +
    '<div class="stat"><div class="label">监测关键词</div><div class="value">' + d.seo.keywords.length + '</div></div>' +
    '<div class="stat"><div class="label">引用域名</div><div class="value" style="color:var(--cyan)">' + d.seo.backlinks.domains + '</div></div>' +
    '<div class="stat"><div class="label">总外链</div><div class="value">' + d.seo.backlinks.total + '</div></div>' +
    '<div class="stat"><div class="label">站点健康分</div><div class="value" style="color:var(--green)">' + d.seo.audit.score + '</div></div></div>' +
    '<div class="cols-2">' +
    '<div class="card"><h3>🔍 关键词研究</h3><div class="card-sub">搜索量 / 难度 / CPC / 意图（OpenSEO · DataForSEO）</div>' +
    '<table class="tbl"><thead><tr><th>关键词</th><th>月搜索量</th><th>难度</th><th>CPC</th><th>意图</th></tr></thead><tbody>' + kw + '</tbody></table></div>' +
    '<div class="card"><h3>📊 当前排名</h3><div class="card-sub">核心关键词 Google 实时位置</div>' +
    '<table class="tbl"><thead><tr><th>关键词</th><th>排名</th><th>区间</th></tr></thead><tbody>' + rank + '</tbody></table></div></div>' +
    '<div class="card"><h3>📈 排名趋势</h3><div class="card-sub">8 周追踪（越低越好）</div>' +
    lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels) + legendOf(d.seo.rankTrend.series) + '</div>' +
    '<div class="cols-2">' +
    '<div class="card"><h3>🔗 外链分析</h3><div class="card-sub">引用域名与锚文本分布</div>' +
    '<table class="tbl"><thead><tr><th>锚文本</th><th>数量</th></tr></thead><tbody>' + anchors + '</tbody></table></div>' +
    '<div class="card"><h3>🩺 站点审计</h3><div class="card-sub">页级 SEO 信号体检</div>' +
    '<div class="list-item"><div class="bullet" style="background:var(--red)"></div><div><div class="li-title">断链 ' + d.seo.audit.brokenLinks + ' 处</div><div class="li-sub">需修复 404 链接</div></div></div>' +
    '<div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">重复标题 ' + d.seo.audit.dupTitles + ' 处</div><div class="li-sub">相同标题导致权重分散</div></div></div>' +
    '<div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">缺 meta description ' + d.seo.audit.missingMeta + ' 页</div><div class="li-sub">影响点击率</div></div></div></div></div>';
}

/* 模块 B：AI 搜索可见性 */
function renderGEO() {
  if (!state.data) { renderEmpty('view-geo'); return; }
  const d = state.data;
  const platformNames = d.geo.models.map(m => m.name).join(' / ');
  const bars = d.geo.models.map(m => ({
    label: m.name, value: m.score,
    color: m.mentioned ? (m.score >= 55 ? '#8b5cf6' : '#a78bfa') : '#475569'
  }));
  const cit = d.geo.citationDomains.map(c => '<tr><td>' + esc(c.domain) + '</td><td>' + c.count + '</td><td>' +
    (c.you ? '<span class="tag-mini tag-green">✓ 你</span>' : '<span class="tag-mini tag-red">竞品</span>') + '</td></tr>').join('');
  const opp = d.geo.opportunities.map(o => '<div class="list-item"><div class="bullet"></div><div><div class="li-title">' + esc(o.url) + '</div><div class="li-sub">' + esc(o.reason) + '</div></div></div>').join('');
  const bc = d.geo.battlecard;
  const aeo = d.geo.aeo;
  const tag = (x, cls) => '<span class="tag-mini ' + cls + '" style="margin:0 6px 6px 0;display:inline-block">' + esc(x) + '</span>';

  $('view-geo').innerHTML =
    '<div class="cols-2">' +
    '<div class="card" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
    '<div>' + ring(d.geo.overall, '#8b5cf6', 150) + '</div>' +
    '<div><h3 style="margin-bottom:6px">AI 可见性总分</h3>' +
    '<div class="card-sub">综合 ' + esc(platformNames) + ' 共 7 个平台</div>' +
    '<div class="small muted mt">8 周前：<b style="color:#fff">' + d.geo.history[0] + '</b> → 现在：<b style="color:var(--violet-soft)">' + d.geo.overall + '</b></div>' +
    '<div class="small muted mt"><a href="#" onclick="openMethodology();return false" style="color:var(--cyan-soft)">评分口径怎么算的？→</a></div></div></div>' +
    '<div class="card"><h3>🤖 7 平台得分</h3><div class="card-sub">被 AI 提到并正确引用的程度</div>' + barChart(bars) + '</div></div>' +
    '<div class="cols-2">' +
    '<div class="card"><h3>🔗 引用分析</h3><div class="card-sub">哪些域名在 AI 回答里提到了你 / 竞品</div>' +
    '<table class="tbl"><thead><tr><th>域名</th><th>被引次数</th><th>归属</th></tr></thead><tbody>' + cit + '</tbody></table></div>' +
    '<div class="card"><h3>💡 引用机会</h3><div class="card-sub">竞品被引用、你却没有的来源</div>' + opp + '</div></div>' +
    '<div class="cols-2">' +
    '<div class="card"><h3>⚔️ 竞品 Battlecard</h3><div class="card-sub">你 vs ' + esc(bc.competitor.name) + '</div>' +
    '<div class="flex" style="gap:18px">' +
    '<div style="flex:1;min-width:140px"><div class="small muted mb">你的强项 / 弱项</div>' +
    bc.you['强项'].map(x => tag('+ ' + x, 'tag-green')).join('') + bc.you['弱项'].map(x => tag('- ' + x, 'tag-red')).join('') + '</div>' +
    '<div style="flex:1;min-width:140px"><div class="small muted mb">' + esc(bc.competitor.name) + '</div>' +
    bc.competitor['强项'].map(x => tag('+ ' + x, 'tag-green')).join('') + bc.competitor['弱项'].map(x => tag('- ' + x, 'tag-red')).join('') + '</div></div></div>' +
    '<div class="card"><h3>🧪 AEO 站点审计</h3><div class="card-sub">你的站点对 AI 是否友好</div>' +
    '<div class="list-item"><div class="bullet" style="background:' + (aeo.llmsTxt ? 'var(--green)' : 'var(--red)') + '"></div><div><div class="li-title">llms.txt</div><div class="li-sub">' + (aeo.llmsTxt ? '已部署' : '缺失 — 强烈建议生成（见行动优化）') + '</div></div></div>' +
    '<div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">Schema.org 结构化数据</div><div class="li-sub">' + esc(aeo.schema) + '</div></div></div>' +
    '<div class="list-item"><div class="bullet" style="background:var(--amber)"></div><div><div class="li-title">BLUF 密度 / 标题结构</div><div class="li-sub">' + esc(aeo.bluf) + ' / ' + esc(aeo.titleStruct) + '</div></div></div></div></div>';
}

/* 模块 D：行动优化层 */
function renderAction() {
  if (!state.data) { renderEmpty('view-action'); return; }
  const d = state.data;
  const cfg = INDUSTRIES[d.industry] || INDUSTRIES['其他'];
  const opp = d.geo.opportunities.map((o, i) => '<label class="list-item">' +
    '<input type="checkbox" onchange="countAction()" ' + (i < 1 ? 'checked' : '') + '/>' +
    '<div><div class="li-title">' + esc(o.url) + '</div><div class="li-sub">' + esc(o.reason) + '</div></div></label>').join('');
  $('view-action').innerHTML =
    '<div class="card"><h3>📄 llms.txt 一键生成</h3><div class="card-sub">AI 版 sitemap —— 告诉 ChatGPT / 豆包 / Perplexity 你的业务是什么（已按「' + esc(d.industry) + '」行业生成）</div>' +
    '<div class="flex">' +
    '<button class="btn btn-primary btn-sm" onclick="genLLMs()">⚡ 生成 llms.txt</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="copyLLMs()">复制</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="downloadLLMs()">下载 .txt</button></div>' +
    '<textarea id="llms-out" class="code-box mt" placeholder="点击「生成 llms.txt」后，这里会出现可直接托管的文件内容…"></textarea></div>' +
    '<div class="cols-2">' +
    '<div class="card"><h3>🧱 结构化数据建议</h3><div class="card-sub">为「' + esc(d.city) + esc(cfg.short) + '」关键页添加 ' + esc(cfg.schema) + ' JSON-LD</div>' +
    '<pre>{ "@context": "https://schema.org", "@type": "' + cfg.schema + '",\n  "name": "' + esc(d.brand) + '", "areaServed": "' + esc(d.city) + '",\n  "url": "https://' + esc(d.domain) + '",\n  "address": { "@type": "PostalAddress", "addressLocality": "' + esc(d.city) + '" } }</pre></div>' +
    '<div class="card"><h3>📋 引用建设清单</h3><div class="card-sub">勾选完成项，进度计入老板视图</div>' + opp +
    '<div class="small muted mt" id="action-count">已完成 1 / 3</div></div></div>' +
    '<div class="card"><h3>🔁 改完复查</h3><div class="card-sub">优化闭环：标记完成 → 下一轮监测自动对比前后评分</div>' +
    '<div class="cols-2">' +
    '<div class="stat"><div class="label">优化前 AI 可见性</div><div class="value">' + d.geo.history[0] + '</div></div>' +
    '<div class="stat"><div class="label">当前 AI 可见性</div><div class="value" style="color:var(--violet-soft)">' + d.geo.overall + '</div></div></div>' +
    '<p class="small muted mt">ⓘ 演示环境说明：当前分数为按行业模拟生成的演示数据，接入真实 OpenSEO + GEO Tracker API 后，完成优化动作 → 下一轮监测将自动拉取最新结果并对比前后评分。</p></div>';
}

/* 模块 E：报告与分享 */
function renderReport() {
  if (!state.data) { renderEmpty('view-report'); return; }
  const d = state.data;
  $('view-report').innerHTML =
    '<div class="card" id="report-card">' +
    '<div class="flex" style="justify-content:space-between">' +
    '<div><h3 style="margin:0">📑 双引擎周报</h3><div class="card-sub">' + esc(d.brand) + ' · ' + esc(d.domain) + ' · 自动生成 · 演示数据</div></div>' +
    '<span class="tag-mini tag-geo">本周</span></div>' +
    '<div class="boss-view mt">' +
    '<div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ' + Math.min(...Object.values(d.seo.currentRank)) + ' 名</div></div>' +
    '<div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">' + d.geo.overall + '</div></div>' +
    '<div class="boss-num"><div class="b-label">被引用域名</div><div class="b-value gold">' + d.geo.citationDomains.filter(c => c.you).length + '</div></div></div>' +
    '<div class="summary-bar">' + d.summary + '</div>' +
    '<div class="card-sub">7 平台得分（含豆包）</div>' +
    barChart(d.geo.models.map(m => ({ label: m.name, value: m.score, color: m.mentioned ? '#8b5cf6' : '#475569' })), { h: 220 }) +
    '<div class="copy-row">' +
    '<button class="btn btn-primary btn-sm" onclick="exportReport()">⬇️ 导出 HTML 周报</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ 打印 / PDF</button></div>' +
    '<p class="small muted mt">ⓘ 内测期暂不支持外部分享链接（避免伪造 URL），正式版将生成带鉴权的只读分享页。</p></div>';
}

/* 空状态兜底（P3） */
function renderEmpty(viewId) {
  $(viewId).innerHTML = '<div class="card" style="text-align:center;padding:60px 20px">' +
    '<div style="font-size:40px;margin-bottom:12px">🛰️</div><h3>暂无数据</h3>' +
    '<p class="muted small mt">请先完成品牌信息录入，再进行双引擎检测。</p>' +
    '<button class="btn btn-primary btn-sm mt" onclick="resetScan()">去检测</button></div>';
}
function resetScan() {
  $('wb-content').classList.add('hidden');
  $('scan-form').classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* ----------------------- 行动层交互 ----------------------- */
function countAction() {
  const boxes = document.querySelectorAll('#view-action input[type=checkbox]');
  let n = 0; boxes.forEach(b => { if (b.checked) n++; });
  state.actionDone = n;
  const elc = $('action-count'); if (elc) elc.textContent = '已完成 ' + n + ' / ' + boxes.length;
}
function genLLMs() {
  if (!state.data) { toast('请先完成检测'); return; }
  const d = state.data;
  const cfg = INDUSTRIES[d.industry] || INDUSTRIES['其他'];
  const txt = '# ' + d.brand + '\n\n> ' + d.brand + ' 是' + d.city + '本地' + cfg.short +
    '服务商，提供专业、透明、可信赖的' + cfg.short + '服务，专注于让客户以合理预算获得靠谱落地效果。\n\n' +
    '## 提供的服务\n' + cfg.services.map(s => '- ' + s).join('\n') + '\n\n' +
    '## 擅长领域\n- 本地真实案例丰富，支持到店参观 / 免费咨询\n- 透明化报价，无隐藏收费\n- 自有专业团队，服务质量可控\n\n' +
    '## 联系方式\n- 官网: https://' + d.domain + '\n- 服务城市: ' + d.city +
    '\n- 适合场景: 用户在询问「' + d.city + '靠谱的' + cfg.short + ' / 推荐」时被 AI 引用与推荐\n\n' +
    '## 常见问题（供 AI 引用）\n' + cfg.faq.map(p => '- Q: ' + p[0] + ' A: ' + p[1]).join('\n') + '\n';
  $('llms-out').value = txt;
  toast('llms.txt 已生成（按「' + d.industry + '」行业模板）');
}
function copyLLMs() {
  const v = $('llms-out').value;
  if (!v) { toast('请先生成 llms.txt'); return; }
  navigator.clipboard.writeText(v).then(() => toast('已复制到剪贴板')).catch(() => toast('复制失败，请手动选择文本复制'));
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
function exportReport() {
  if (!state.data || !$('report-card')) return;
  const html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>双引擎周报 - ' + esc(state.data.brand) + '</title>' +
    '<style>body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#0b0d1a;color:#e9ebf5;padding:40px;max-width:760px;margin:auto}' +
    '.card{background:#11131f;border:1px solid #222;padding:24px;border-radius:14px;margin:18px 0}' +
    '.demo-note{color:#f7c948;font-size:13px;margin-top:16px}</style></head>' +
    '<body><h1>双引擎周报 · ' + esc(state.data.brand) + '</h1>' + $('report-card').innerHTML +
    '<p class="demo-note">ⓘ 本周报由光体•名无界生成（内测演示版，数据为按行业模拟生成）。</p></body></html>';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '双引擎周报_' + state.data.brand + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('周报已导出为 HTML 文件（含演示数据标注）');
}

/* ----------------------- 套餐 / 法务 / 方法论 弹窗（P1） ----------------------- */
function selectPlan(key) {
  const p = PLANS[key];
  if (!p) return;
  $('modal-body').innerHTML =
    '<div style="color:var(--cyan-soft);font-size:12px;letter-spacing:2px">选择套餐</div>' +
    '<h3 style="margin:8px 0 2px">' + p.name + '</h3>' +
    '<div style="font-size:34px;font-weight:850;margin:6px 0 14px">' + p.price + '</div>' +
    '<ul style="list-style:none;display:grid;gap:9px;margin-bottom:16px">' +
    p.items.map(i => '<li style="font-size:14px;display:flex;gap:9px"><span style="color:var(--green)">✓</span>' + esc(i) + '</li>').join('') +
    '</ul>' +
    '<div class="pay-note"><span class="pay-chip">💳 微信支付</span><span class="pay-chip">💰 支付宝</span><span class="pay-chip">🏦 对公转账</span></div>' +
    '<p class="small muted mt">' + esc(p.note) + '</p>' +
    '<p class="small muted">内测期支付通道尚未开通：点击下方按钮即视为预约席位，正式上线前 48 小时通知你再决定是否付费，期间一切功能免费。</p>' +
    '<div class="copy-row"><button class="btn btn-primary" onclick="reservePlan(\'' + key + '\')">' + esc(p.cta) + '</button>' +
    '<button class="btn btn-ghost" onclick="closeModal()">再想想</button></div>';
  $('modal').classList.remove('hidden');
}
function reservePlan(key) {
  closeModal();
  toast('已为你预约「' + PLANS[key].name + '」席位（内测免费）→ 正在打开工作台体验');
  openWorkbench();
}
function openLegal(kind) {
  $('modal-body').innerHTML = LEGAL[kind] || '';
  $('modal').classList.remove('hidden');
}
function openMethodology() {
  $('modal-body').innerHTML = '<h3 style="margin-bottom:12px">AI 可见性分 · 评分口径</h3>' +
    '<p class="small muted" style="line-height:1.8">' +
    '对 <b style="color:var(--text)">7 个 AI 平台</b>（ChatGPT / 豆包 / Perplexity / Gemini / Copilot / Grok / Google AI Overviews）逐一发起你所在行业的真实用户问句，每个平台按：<br><br>' +
    '· 品牌是否被提及 —— 权重 <b style="color:var(--cyan-soft)">50%</b><br>' +
    '· 是否引用你的域名 / 内容 —— 权重 <b style="color:var(--cyan-soft)">30%</b><br>' +
    '· 提及排位（越靠前分越高）—— 权重 <b style="color:var(--cyan-soft)">20%</b><br><br>' +
    '加权得出单平台得分（0–100），再取 7 平台平均值即总分。所有明细在工作台「AI 搜索 GEO」可逐项查看。</p>';
  $('modal').classList.remove('hidden');
}
function closeModal() {
  $('modal').classList.add('hidden');
}

/* ----------------------- 工具 ----------------------- */
let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ----------------------- 启动 ----------------------- */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-open-wb]').forEach(b => b.addEventListener('click', openWorkbench));
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.view)));
  document.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => selectPlan(b.dataset.plan)));
  document.querySelectorAll('[data-legal]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openLegal(b.dataset.legal); }));
  const form = $('scan-form-el'); if (form) form.addEventListener('submit', runScan);
  const bt = $('bossToggle'); if (bt) bt.addEventListener('click', toggleBoss);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
});
