/* ============================================================
   光体•名无界 — 工作台逻辑（v0.4）
   ------------------------------------------------------------
   v0.4 主题：真实性 / 有效性 / 实时性 / 通畅性
   - 【真实】新增「真实站点体检」：浏览器直接抓取 llms.txt、robots.txt、
     sitemap.xml 与首页 HTML 并真实解析，给出可复现的「技术就绪分」。
     跨域被拦时提供手动粘贴兜底，仍由本地解析器真实分析，不伪造。
   - 【有效】体检结果自动回写行动清单：llms.txt / robots / sitemap / JSON-LD
     四项可自动验证，改完重跑即变绿，不靠自我声称。
   - 【实时】记录 lastScanAt，展示数据新鲜度、建议复核日期与检测时间轴。
   - 【通畅】哈希路由（#/wb/geo 等）+ 浏览器前进后退 + 刷新保留视图 +
     各视图独立滚动位置 + 弹窗焦点陷阱 + toast 队列。
   ------------------------------------------------------------
   数据来源与真实性边界：
   - 【真实】技术就绪分、llms.txt / robots.txt / sitemap.xml 状态、
     首页 Title / Description / JSON-LD / OG / H1 / viewport / lang
     → 由浏览器对本域名的真实 HTTP 请求 + 本地解析得出。
   - 【演示】关键词搜索量 / 难度 / CPC / Google 排名 / 7 平台 AI 可见性
     → 需付费数据源，以下集成点预留；界面已明确标注为演示数据。
       SEO  = OpenSEO 自托管 API（GET /api/openseo/keywords|rankings|backlinks|audit）
       GEO  = GEO/AEO Tracker 自托管 API（POST /api/geo/scan，GET /api/geo/visibility|citations）
       替换 fetchBackend() 内的 buildDemoData(form) 即可切换为生产数据。
   ============================================================ */

'use strict';

/* ----------------------- 行业配置 ----------------------- */
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

/* 7 个 AI 平台 */
const AI_PLATFORMS = ['ChatGPT', '豆包', 'Perplexity', 'Gemini', 'Copilot', 'Grok', 'Google AI Overviews'];
const BASE_SCORES = [62, 41, 58, 45, 51, 38, 67];
const BASE_RANKS = [11, 22, 17, 28, 9];

/* ----------------------- 套餐配置 ----------------------- */
const PLANS = {
  free: {
    name: '体验版', price: '¥0 / 月',
    items: ['1 个域名 · 5 个关键词', '单平台 AI 可见性 1 次/月', '基础站点审计', 'llms.txt 生成与部署指引'],
    cta: '⚡ 免费开始体验', note: '免费开始，无需绑卡。'
  },
  growth: {
    name: '成长版', price: '¥99 / 月',
    items: ['3 域名 / 50 关键词周追踪', '7 平台 AI 监测周更', 'llms.txt 生成与托管', '双引擎周报（PDF / 链接）', '竞品 AI 引用对比'],
    cta: '✔ 预约成长版', note: '内测期免费使用，正式上线前 48 小时通知你再决定是否付费。'
  },
  flagship: {
    name: '旗舰版', price: '¥299 / 月',
    items: ['10 域名 / 200 关键词日更', '7 平台 AI 监测日更', '引用机会 + 竞品 Battlecard', 'AEO 审计', 'PDF 白标周报'],
    cta: '✔ 预约旗舰版', note: '内测期免费使用，正式上线前 48 小时通知你再决定是否付费。'
  }
};

/* ----------------------- 法务文本 ----------------------- */
const LEGAL = {
  privacy: '<h3 style="margin-bottom:12px">隐私政策（内测版）</h3>' +
    '<p class="small muted" style="line-height:1.8">' +
    '1. <b style="color:var(--text)">我们收集什么：</b>仅收集你主动填写的域名、品牌名、城市与行业，用于生成可见性报告。<br><br>' +
    '2. <b style="color:var(--text)">数据怎么存：</b>当前演示阶段，所有数据仅保存在你自己浏览器的本地存储（localStorage）中，<b style="color:var(--text)">不上传任何服务器</b>；你可在工作台「更多 → 清空本地数据」一键删除。正式版采用自托管部署，检测数据不与其他用户共享。<br><br>' +
    '3. <b style="color:var(--text)">第三方服务：</b>正式版检测依赖自托管 OpenSEO（数据源 DataForSEO）与 GEO/AEO Tracker（采集管道 Bright Data），均为用户自带 Key（BYOK），第三方仅接收待检测域名本身。<br><br>' +
    '4. <b style="color:var(--text)">你的权利：</b>随时清除浏览器本地数据；正式版提供一键导出与永久删除。<br><br>' +
    '5. 本政策为内测占位版本，正式版上线前将按《个人信息保护法》要求完整重写并公示。</p>',
  terms: '<h3 style="margin-bottom:12px">服务条款（内测版）</h3>' +
    '<p class="small muted" style="line-height:1.8">' +
    '1. <b style="color:var(--text)">服务性质：</b>本站为双引擎可见性工作台的内测演示版，检测结果为按行业参数化生成的演示数据，<b style="color:var(--text)">不构成对任何真实网站的真实检测结论</b>。<br><br>' +
    '2. <b style="color:var(--text)">不承诺条款：</b>我们不承诺任何「排名第一」「AI 必然推荐」效果；所有优化动作的效果以接入真实 API 后的前后对比数据为准。<br><br>' +
    '3. <b style="color:var(--text)">合规使用：</b>用户应仅检测自己拥有或已获授权的域名；不得利用本服务进行任何违反平台服务条款的自动化滥用。<br><br>' +
    '4. <b style="color:var(--text)">开源底座：</b>技术底座基于 MIT 协议开源项目（OpenSEO、GEO/AEO Tracker），相应开源许可适用于底层组件。<br><br>' +
    '5. 本条款为内测占位版本，正式版上线前将完整重写并公示。</p>'
};

/* ----------------------- 术语词典（新增） ----------------------- */
const GLOSSARY = {
  'GEO': { t: 'Generative Engine Optimization，生成式引擎优化', d: '让你的品牌 / 内容更容易被 ChatGPT、豆包这类 AI 在回答里提到并引用。类比：SEO 是让搜索引擎把你排在前面，GEO 是让 AI 愿意"说出你的名字"。' },
  'AEO': { t: 'Answer Engine Optimization，答案引擎优化', d: '把内容写成"一问一答"的直给格式，方便 AI 直接摘取你的答案。典型动作：开头先给结论（BLUF）、加 FAQ 结构化数据、用清晰的标题层级。' },
  'llms.txt': { t: '给 AI 看的网站说明书', d: '一个放在你网站根目录的纯文本文件，用 Markdown 结构告诉 AI"我是谁、提供什么服务、适合什么场景"。类似给搜索引擎的 sitemap.xml，但对象是大模型。命名固定为 llms.txt，必须能通过 https://你的域名/llms.txt 公开访问才生效。' },
  'BLUF': { t: 'Bottom Line Up Front，结论前置', d: '把最重要的结论放在段落最前面。AI 抓取内容时更倾向摘取开门见山的句子，而不是铺垫三段才给答案的写法。' },
  'SERP': { t: 'Search Engine Results Page，搜索结果页', d: '你在 Google / 百度 搜一个词之后看到的那一整页结果。排名"第 11 名"就是指在这页（或第二页）的位置。' },
  'Schema': { t: 'Schema.org 结构化数据', d: '藏在网页代码里、给机器看的一段 JSON-LD 说明（比如"这是一家杭州的装修公司，电话是…"）。它不影响肉眼看到的排版，但能帮搜索与 AI 准确理解你的页面。' },
  'CPC': { t: 'Cost Per Click，单次点击成本', d: '在搜索引擎投广告时，别人点一次你的广告你要付多少钱。CPC 越高说明这个词越值钱、商业意图越强。' },
  '关键词难度': { t: 'Keyword Difficulty', d: '0–100 的竞争度评分。一般 0–30 属于容易做上去，30–60 需要持续内容投入，60 以上通常要靠外链和长期积累。' },
  '引用域名': { t: 'Referring Domains', d: '有多少个不同的网站链接到你的站。比"总外链数"更能反映真实权重，因为一个网站给你 100 条链接通常只算 1 个引用域名。' },
  'AI 可见性分': { t: '本产品自定义指标（0–100）', d: '对 7 个 AI 平台逐一发起你行业的真实问句，按"品牌被提及 50% + 引用你的域名 30% + 提及排位 20%"加权后取平均。分数越高，说明 AI 越可能主动提到你。' },
  'Battlecard': { t: '竞品对比卡', d: '把"你 vs 竞品"在 AI 眼里的强项弱点并排列出来，方便快速看到差距在哪、该补什么。' }
};

/* ----------------------- 部署方案（新增 · 最后一公里） ----------------------- */
const DEPLOY = [
  {
    k: 'static', n: '静态托管（GitHub Pages / Vercel / Netlify / Cloudflare Pages）',
    steps: ['把生成的 llms.txt 保存到站点仓库的<b>根目录</b>（与 index.html 同级）', '提交并推送，等待平台自动部署完成', '访问 <code>https://你的域名/llms.txt</code> 确认能看到内容'],
    cmd: 'git add llms.txt && git commit -m "add llms.txt for AI crawlers" && git push'
  },
  {
    k: 'wp', n: 'WordPress 站点',
    steps: ['后台安装任意 FTP / 文件管理插件（如 File Manager），或直接用主机商的文件管理器', '进入网站<b>根目录</b>（通常名为 public_html 或 wwwroot）', '上传 llms.txt，不要放进 wp-content 等子目录'],
    cmd: null
  },
  {
    k: 'bt', n: '宝塔面板 / 虚拟主机',
    steps: ['宝塔面板 → 网站 → 找到你的站点 → 点「根目录」', '进入「文件」→ 上传 llms.txt 到根目录', '确认文件权限为 644、属主为 www'],
    cmd: 'chmod 644 /www/wwwroot/你的域名/llms.txt'
  },
  {
    k: 'nginx', n: '自建服务器（Nginx / Apache）',
    steps: ['用 scp / sftp 把文件传到站点的 web 根目录', '确认 Web 服务器对 .txt 返回 200（默认即可，无需额外配置）', '如需强制 MIME：在 Nginx 配置里为 .txt 指定 text/plain; charset=utf-8'],
    cmd: 'scp llms.txt root@你的服务器IP:/var/www/html/llms.txt'
  },
  {
    k: 'oss', n: '对象存储 / CDN（阿里云 OSS、腾讯云 COS 等）',
    steps: ['把 llms.txt 上传到 Bucket 的<b>根路径</b>', '把该对象的读权限设为「公共读」', '绑定自定义域名后访问 <code>https://你的域名/llms.txt</code> 验证'],
    cmd: null
  }
];

/* ============================================================
   v0.4 新增：真实站点体检（不需要任何 API Key）
   ------------------------------------------------------------
   浏览器可以直接请求下列公开资源，只要目标站点允许跨域读取。
   GitHub Pages / Vercel / Netlify / Cloudflare Pages 等静态托管对
   静态资源默认返回 Access-Control-Allow-Origin: *，通常可直接读取：
     https://域名/llms.txt      https://域名/robots.txt
     https://域名/sitemap.xml   https://域名/（首页 HTML）
   被跨域策略拦截时，降级为「手动粘贴内容」，仍由本地解析器真实分析，
   不做任何伪造。
   ============================================================ */

/* 主流 AI 爬虫 UA（用于解析 robots.txt） */
const AI_CRAWLERS = [
  { ua: 'GPTBot', who: 'OpenAI / ChatGPT' },
  { ua: 'OAI-SearchBot', who: 'OpenAI 搜索' },
  { ua: 'ClaudeBot', who: 'Anthropic / Claude' },
  { ua: 'PerplexityBot', who: 'Perplexity' },
  { ua: 'Bytespider', who: '字节 / 豆包' },
  { ua: 'Google-Extended', who: 'Google Gemini' },
  { ua: 'CCBot', who: 'Common Crawl（多家模型语料）' }
];

const AUDIT_TIMEOUT = 9000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* 带超时的文本抓取（失败一律返回结构化结果，不抛异常） */
async function fetchText(url, ms) {
  let ctrl = null, timer = null;
  try {
    if (typeof AbortController !== 'undefined') { ctrl = new AbortController(); timer = setTimeout(() => ctrl.abort(), ms || AUDIT_TIMEOUT); }
    const r = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: ctrl ? ctrl.signal : undefined });
    const t = await r.text();
    return { ok: r.ok, status: r.status, text: t };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: (e && e.name === 'AbortError') ? 'timeout' : 'blocked' };
  } finally { if (timer) clearTimeout(timer); }
}

/* 纯函数：解析 robots.txt（可在 Node 中单测） */
function parseRobotsTxt(text) {
  const out = { groups: [], sitemaps: [] };
  let cur = null;
  String(text == null ? '' : text).split(/\r?\n/).forEach(function (rawLine) {
    const line = rawLine.replace(/(^|\s)#.*$/, '').trim();
    if (!line) return;
    const i = line.indexOf(':');
    if (i < 0) return;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; out.groups.push(cur); }
      cur.agents.push(v.toLowerCase());
    } else if (k === 'allow' || k === 'disallow') {
      if (!cur) { cur = { agents: ['*'], rules: [] }; out.groups.push(cur); }
      cur.rules.push({ type: k, path: v });
    } else if (k === 'sitemap') {
      out.sitemaps.push(v);
    }
  });
  return out;
}

/* 纯函数：某个 UA 是否被全站屏蔽（blocked / allowed / unmentioned） */
function checkCrawlerAccess(parsed, ua) {
  const key = String(ua).toLowerCase();
  const exact = parsed.groups.filter(g => g.agents.indexOf(key) >= 0);
  const wild = parsed.groups.filter(g => g.agents.indexOf('*') >= 0);
  const groups = exact.length ? exact : wild;
  if (!groups.length) return 'unmentioned';
  let blocked = false, allowed = false;
  groups.forEach(function (g) {
    g.rules.forEach(function (r) {
      // 只判定「全站级」规则：路径为空(Disallow:)表示允许，'/' 表示全站
      if (r.type === 'allow' && (r.path === '/' || r.path === '')) allowed = true;
      if (r.type === 'disallow' && r.path === '/') blocked = true;
    });
  });
  if (blocked && !allowed) return 'blocked';
  return 'allowed';
}

/* 纯函数：解析首页 head（可在 Node 中单测） */
function parseHead(html) {
  const t = String(html == null ? '' : html);
  const titleM = t.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  const descTag = t.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  let desc = '';
  if (descTag) { const c = descTag[0].match(/content=["']([\s\S]*?)["']/i); desc = c ? c[1].trim() : ''; }
  const h1Count = (t.match(/<h1[\s>]/gi) || []).length;
  const jsonLdCount = (t.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || []).length;
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(t);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(t);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(t);
  const langM = t.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(t);
  return { title, desc, h1Count, jsonLdCount, ogTitle, ogImage, hasViewport, lang: langM ? langM[1] : '', canonical };
}

/* 纯函数：把体检项汇总成技术就绪分 */
function auditScore(items) {
  let decided = 0, earned = 0, total = 0;
  items.forEach(function (it) {
    total += it.weight;
    if (it.status === 'blocked') return;
    decided += it.weight;
    if (it.status === 'pass') earned += it.weight;
    else if (it.status === 'warn') earned += it.weight * 0.5;
  });
  return {
    score: decided ? Math.round(earned / decided * 100) : null,
    coverage: total ? Math.round(decided / total * 100) : 0,
    decided: decided, total: total
  };
}

/* 各体检项构造器 */
function fileStatus(r) { return r.ok ? 'ok' : (r.status ? 'http' : 'unreachable'); }

function itemLlms(r, brand, domain) {
  const base = { id: 'llms', name: 'llms.txt 可访问性', cat: 'ai', weight: 15 };
  const st = fileStatus(r);
  if (st === 'unreachable') return Object.assign(base, { status: 'blocked', detail: '浏览器无法直接读取（跨域限制或站点不可达）。可用下方「手动粘贴」把文件内容贴进来，由本地解析器真实分析。', fix: '确认 https://' + domain + '/llms.txt 能在浏览器里直接打开' });
  if (st === 'http') return Object.assign(base, { status: 'fail', detail: '请求返回 HTTP ' + r.status + ' —— 文件不存在、路径不对或权限不足。', fix: '把 llms.txt 放到网站根目录（与 index.html 同级），确保访问返回 200' });
  const t = r.text;
  if (t.trim().length < 60) return Object.assign(base, { status: 'warn', detail: '文件存在，但内容只有 ' + t.trim().length + ' 字符，信息量不足，AI 难以据此理解你的业务。', fix: '补上「提供的服务 / 擅长领域 / 服务城市 / 常见问题」四段，建议 300 字符以上' });
  const hasBrand = brand ? t.toLowerCase().indexOf(String(brand).toLowerCase()) >= 0 : false;
  const hasDomain = t.indexOf(domain) >= 0;
  if (!hasBrand && !hasDomain) return Object.assign(base, { status: 'warn', detail: '文件已上线（' + t.length + ' 字符），但内容里没有出现品牌名「' + esc(brand || '') + '」或域名，AI 可能对不上号。', fix: '在 llms.txt 开头用一句话写清「X 是 Y 城市的 Z 服务商」' });
  return Object.assign(base, { status: 'pass', detail: '已上线（' + t.length + ' 字符），且包含品牌名 / 域名 ✓', fix: '' });
}

function itemRobots(r, domain) {
  const base = { id: 'robots', name: 'robots.txt 是否屏蔽 AI 爬虫', cat: 'ai', weight: 15 };
  const st = fileStatus(r);
  if (st === 'unreachable') return Object.assign(base, { status: 'blocked', detail: '浏览器无法直接读取。可用下方「手动粘贴」贴入 robots.txt 内容解析。', fix: '确认 https://' + domain + '/robots.txt 能直接打开' });
  if (st === 'http') return Object.assign(base, { status: 'warn', detail: '未找到 robots.txt（HTTP ' + r.status + '）。没有它不会阻止 AI 抓取，但你也失去了「明确欢迎 AI 引用」的声明机会。', fix: '新建 robots.txt，显式 Allow 主流 AI 爬虫，并用 Sitemap: 声明站点地图' });
  const parsed = parseRobotsTxt(r.text);
  const blocked = AI_CRAWLERS.filter(c => checkCrawlerAccess(parsed, c.ua) === 'blocked');
  if (blocked.length) return Object.assign(base, { status: 'fail', detail: '发现 ' + blocked.length + ' 个主流 AI 爬虫被明确屏蔽：' + blocked.map(c => c.ua + '（' + c.who + '）').join('、') + '。这些 AI 将永远读不到你的站点内容。', fix: '删掉对应的 Disallow: / 规则。若只想阻止训练、保留引用，请用 Google-Extended / CCBot 单独控制，不要连 GPTBot、ClaudeBot、PerplexityBot 一起封' });
  return Object.assign(base, { status: 'pass', detail: '7 个主流 AI 爬虫（GPTBot / OAI-SearchBot / ClaudeBot / PerplexityBot / Bytespider / Google-Extended / CCBot）均未被屏蔽 ✓', fix: '' });
}

function itemSitemap(r, domain) {
  const base = { id: 'sitemap', name: 'sitemap.xml 可访问性', cat: 'ai', weight: 8 };
  const st = fileStatus(r);
  if (st === 'unreachable') return Object.assign(base, { status: 'blocked', detail: '浏览器无法直接读取。', fix: '确认 https://' + domain + '/sitemap.xml 能直接打开' });
  if (st === 'http') return Object.assign(base, { status: 'fail', detail: '未找到 sitemap.xml（HTTP ' + r.status + '）—— 搜索引擎与 AI 缺少站点结构指引。', fix: '生成 sitemap.xml 放到根目录，并在 robots.txt 里用 Sitemap: 一行声明它' });
  const n = (r.text.match(/<url>/g) || []).length;
  return Object.assign(base, { status: 'pass', detail: '已上线' + (n ? '，含 ' + n + ' 条 URL' : '') + ' ✓', fix: '' });
}

function itemTitle(r, h) {
  const base = { id: 'title', name: '首页 Title 标签', cat: 'seo', weight: 10 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。可用下方「手动粘贴」贴入首页源码解析。', fix: '' });
  if (!h.title) return Object.assign(base, { status: 'fail', detail: '首页没有 <title> 标签。', fix: '补一个 title，格式建议「核心业务词 + 城市 + 品牌名」' });
  const len = h.title.length;
  if (len < 10) return Object.assign(base, { status: 'warn', detail: 'Title 偏短（' + len + ' 字符）：「' + esc(h.title) + '」，信息量不足。', fix: '扩到 15–30 个汉字，把「做什么 + 在哪 + 品牌」写进去' });
  if (len > 60) return Object.assign(base, { status: 'warn', detail: 'Title 偏长（' + len + ' 字符），搜索结果里会被截断。', fix: '压缩到 30 个汉字以内，把最重要的词放最前面' });
  return Object.assign(base, { status: 'pass', detail: '长度合适（' + len + ' 字符）：「' + esc(h.title) + '」✓', fix: '' });
}

function itemDesc(r, h) {
  const base = { id: 'desc', name: 'Meta Description', cat: 'seo', weight: 10 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (!h.desc) return Object.assign(base, { status: 'fail', detail: '首页缺少 meta description —— 搜索结果里会由引擎随机截取，点击率通常更低。', fix: '补一段 60–120 字的描述，把核心业务、服务城市、差异化卖点写清楚' });
  const len = h.desc.length;
  if (len < 40) return Object.assign(base, { status: 'warn', detail: 'Description 偏短（' + len + ' 字符）。', fix: '扩到 60–120 字' });
  if (len > 200) return Object.assign(base, { status: 'warn', detail: 'Description 偏长（' + len + ' 字符），会被截断。', fix: '压缩到 120 字以内' });
  return Object.assign(base, { status: 'pass', detail: '长度合适（' + len + ' 字符）✓', fix: '' });
}

function itemJsonLd(r, h) {
  const base = { id: 'jsonld', name: 'JSON-LD 结构化数据', cat: 'seo', weight: 15 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (h.jsonLdCount === 0) return Object.assign(base, { status: 'fail', detail: '首页没有检测到任何 JSON-LD 结构化数据 —— AI 只能靠正文猜你是做什么的。', fix: '至少加一段 ' + 'LocalBusiness / Organization 类型的 JSON-LD（可在「行动优化」一键生成）' });
  if (h.jsonLdCount === 1) return Object.assign(base, { status: 'pass', detail: '检测到 1 段 JSON-LD ✓', fix: '' });
  return Object.assign(base, { status: 'pass', detail: '检测到 ' + h.jsonLdCount + ' 段 JSON-LD ✓', fix: '' });
}

function itemOg(r, h) {
  const base = { id: 'og', name: 'OG / 社交分享标签', cat: 'seo', weight: 7 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (h.ogTitle && h.ogImage) return Object.assign(base, { status: 'pass', detail: 'og:title 与 og:image 均已配置 ✓', fix: '' });
  const miss = [];
  if (!h.ogTitle) miss.push('og:title');
  if (!h.ogImage) miss.push('og:image');
  return Object.assign(base, { status: 'warn', detail: '缺少 ' + miss.join(' / ') + ' —— 被分享到微信、飞书等平台时标题和缩略图会不可控。', fix: '补齐 og:title / og:description / og:image 三个标签' });
}

function itemH1(r, h) {
  const base = { id: 'h1', name: 'H1 标题结构', cat: 'seo', weight: 8 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (h.h1Count === 1) return Object.assign(base, { status: 'pass', detail: '恰好 1 个 H1 ✓', fix: '' });
  if (h.h1Count === 0) return Object.assign(base, { status: 'warn', detail: '首页没有 H1 —— 页面主题不明确，AI 抓取时难以判断页面主旨。', fix: '给页面主标题套上 <h1>，并让其中包含核心业务词' });
  return Object.assign(base, { status: 'warn', detail: '首页有 ' + h.h1Count + ' 个 H1，主题被分散。', fix: '只保留 1 个 H1 作为主标题，其余改为 H2 / H3' });
}

function itemViewport(r, h) {
  const base = { id: 'viewport', name: '移动端 viewport', cat: 'tech', weight: 7 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (h.hasViewport) return Object.assign(base, { status: 'pass', detail: '已声明 viewport，移动端可正常缩放 ✓', fix: '' });
  return Object.assign(base, { status: 'fail', detail: '缺少 viewport meta —— 手机上会以桌面宽度渲染，页面显示异常。', fix: '在 <head> 加入 <meta name="viewport" content="width=device-width, initial-scale=1">' });
}

function itemLang(r, h) {
  const base = { id: 'lang', name: 'HTML lang 语言声明', cat: 'tech', weight: 5 };
  if (!h) return Object.assign(base, { status: 'blocked', detail: '无法读取首页 HTML。', fix: '' });
  if (h.lang) return Object.assign(base, { status: 'pass', detail: '已声明 lang="' + esc(h.lang) + '" ✓', fix: '' });
  return Object.assign(base, { status: 'warn', detail: '<html> 未声明 lang 属性 —— 影响语音朗读与多语言识别。', fix: '写成 <html lang="zh-CN">' });
}

/* 执行一次真实体检 */
async function runRealAudit(domain, brand, onStep) {
  const base = 'https://' + domain;
  const step = (s, pct) => { if (typeof onStep === 'function') onStep(s, pct); };
  const items = [];

  step('正在真实抓取 /llms.txt …', 22);
  const llms = await fetchText(base + '/llms.txt');
  items.push(itemLlms(llms, brand, domain));

  step('正在抓取 /robots.txt 并检查 AI 爬虫是否被屏蔽…', 40);
  const robots = await fetchText(base + '/robots.txt');
  items.push(itemRobots(robots, domain));

  step('正在检查 /sitemap.xml …', 54);
  const sm = await fetchText(base + '/sitemap.xml');
  items.push(itemSitemap(sm, domain));

  step('正在解析首页 HTML（Title / Description / 结构化数据 / OG）…', 72);
  const home = await fetchText(base + '/');
  const head = home.ok ? parseHead(home.text) : null;
  items.push(itemTitle(home, head));
  items.push(itemDesc(home, head));
  items.push(itemJsonLd(home, head));
  items.push(itemOg(home, head));
  items.push(itemH1(home, head));
  items.push(itemViewport(home, head));
  items.push(itemLang(home, head));

  step('正在汇总技术就绪分…', 92);
  const s = auditScore(items);
  return { at: Date.now(), domain: domain, items: items, score: s.score, coverage: s.coverage, decided: s.decided, total: s.total, homeStatus: home.status || 0 };
}

/* 手动粘贴兜底：用真实内容替换被跨域拦截的项目 */
function mergePastedAudit(kind, text) {
  const site = state.site, d = state.data;
  if (!site || !site.audit || !site.audit.items) { toast('请先执行一次站点抓取'); return; }
  const brand = (site.form && site.form.brand) || '';
  const domain = (site.form && site.form.domain) || '';
  const map = {
    llms: () => [itemLlms({ ok: true, status: 200, text: text }, brand, domain)],
    robots: () => [itemRobots({ ok: true, status: 200, text: text }, domain)],
    html: () => {
      const h = parseHead(text);
      const fake = { ok: true, status: 200 };
      return [itemTitle(fake, h), itemDesc(fake, h), itemJsonLd(fake, h), itemOg(fake, h), itemH1(fake, h), itemViewport(fake, h), itemLang(fake, h)];
    }
  };
  if (!map[kind]) return;
  const fresh = map[kind]();
  const ids = fresh.map(i => i.id);
  site.audit.items = site.audit.items.filter(i => ids.indexOf(i.id) < 0).concat(fresh);
  const s = auditScore(site.audit.items);
  site.audit.score = s.score; site.audit.coverage = s.coverage; site.audit.decided = s.decided;
  upsertSite(site);
  state.data = composeData(site);
  renderAll();
  toast('已用你粘贴的内容完成真实解析（覆盖 ' + ids.length + ' 项）');
}
function pasteAuditLLMs() { const el = $('paste-llms'); if (!el) return; mergePastedAudit('llms', el.value); }
function pasteAuditRobots() { const el = $('paste-robots'); if (!el) return; mergePastedAudit('robots', el.value); }
function pasteAuditHtml() { const el = $('paste-html'); if (!el) return; mergePastedAudit('html', el.value); }

/* 单独重跑体检 */
async function rerunAudit() {
  const site = state.site;
  if (!site) { toast('请先完成一次检测'); return; }
  const btn = $('audit-refresh');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 抓取中…'; }
  const setStep = (s) => { const el = $('audit-progress'); if (el) el.textContent = s; };
  try {
    const a = await runRealAudit(site.form.domain, site.form.brand, setStep);
    site.audit = a;
    site.lastScanAt = a.at;
    upsertSite(site);
    state.data = composeData(site);
    renderAll();
    toast('真实抓取完成 · 技术就绪分 ' + (a.score === null ? '无法判定（全部被跨域拦截）' : a.score + ' 分（覆盖 ' + a.coverage + '%）'));
  } catch (e) {
    toast('抓取失败：' + (e && e.message ? e.message : '未知错误'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 重新真实抓取'; }
  }
}

/* ----------------------- 演示数据生成 ----------------------- */
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

  const vols = [5400, 2900, 1900, 3600, 880], diffs = [68, 55, 47, 61, 39], cpcs = [3.2, 2.8, 2.1, 4.0, 3.5];
  const keywords = cfg.kws.map((kw, i) => ({
    kw: kwName(kw),
    vol: Math.max(300, jit(vols[i], 400, i)),
    diff: Math.min(95, Math.max(20, jit(diffs[i], 6, i + 5))),
    cpc: Math.max(0.5, jit(Math.round(cpcs[i] * 10), 8, i + 10) / 10),
    intent: '商业', custom: false
  }));

  const ranks = BASE_RANKS.map((r, i) => Math.min(60, Math.max(3, jit(r, 4, i + 15))));
  const currentRank = {};
  keywords.forEach((k, i) => { currentRank[k.kw] = ranks[i]; });

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
  const citationDomains = cfg.platforms.map((p, i) => ({ domain: p, count: 14 - i * 2, you: i < 3 }));
  const opportunities = [
    { url: cfg.platforms[0] + ' · ' + city + cfg.short + '口碑榜', reason: '竞品被引用、' + brand + '未出现', how: '在' + cfg.platforms[0] + '完善商户主页，补齐真实完工案例与客户评价截图', done: true },
    { url: cfg.platforms[1] + ' · ' + city + cfg.short + '案例库', reason: '行业高频引用源', how: '以专业身份投稿 1 篇案例解析（含价格区间与避坑要点），文末留官网链接', done: false },
    { url: cfg.platforms[3] + ' · 本地用户问答帖', reason: '本地用户聚集', how: '以专家身份回答 5 个本地高频提问，回答里自然带出品牌与官网', done: false }
  ];
  const competitor = city + cfg.short + '同行「示例竞品」';

  const summary = '本周你在谷歌「' + keywords[0].kw + '」第 <b>' + ranks[0] + '</b> 名，AI 回答整体可见性 <b>' + overall + '</b> 分（7 个 AI 平台综合）。<span class="muted">[演示数据：按「' + form.industry + '·' + city + '」模拟生成]</span> 最该先做的一件事：生成并部署 <b>llms.txt</b>。';

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

/* ----------------------- 本地存储 ----------------------- */
const STORE_KEY = 'mwj.store.v4';
const STORE_KEY_OLD = 'mwj.store.v3';
let store = { sites: [], current: '' };

function normalizeSite(s) {
  s.form = s.form || { domain: '', brand: '', city: '', industry: '其他' };
  s.checks = s.checks || [];
  s.opps = s.opps || null;
  s.kws = s.kws || [];
  s.competitor = s.competitor || '';
  s.history = s.history || [];
  s.audit = s.audit || null;
  s.lastScanAt = s.lastScanAt || 0;
  s.createdAt = s.createdAt || Date.now();
  return s;
}
function loadStore() {
  try {
    let raw = localStorage.getItem(STORE_KEY);
    if (!raw) raw = localStorage.getItem(STORE_KEY_OLD);   // 从 v3 平滑迁移
    if (!raw) return false;
    const o = JSON.parse(raw);
    if (o && Array.isArray(o.sites)) {
      store = { sites: o.sites.map(normalizeSite), current: o.current || '' };
      return store.sites.length > 0;
    }
  } catch (e) { /* 存储损坏则忽略，避免阻断使用 */ }
  return false;
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 隐私模式等场景静默失败 */ }
}
function getSite(domain) {
  for (let i = 0; i < store.sites.length; i++) if (store.sites[i].form.domain === domain) return store.sites[i];
  return null;
}
function upsertSite(rec) {
  const i = store.sites.findIndex(s => s.form.domain === rec.form.domain);
  if (i >= 0) store.sites[i] = rec; else store.sites.push(rec);
  store.current = rec.form.domain;
  saveStore();
}
function newSiteRecord(form) {
  return { form: form, checks: [], opps: null, kws: [], competitor: '', history: [], audit: null, lastScanAt: 0, createdAt: Date.now() };
}

/* 把用户自定义内容叠加到演示数据上 */
function composeData(site) {
  const d = buildDemoData(site.form);
  if (site.kws && site.kws.length) {
    d.seo.keywords = site.kws.concat(d.seo.keywords);
    site.kws.forEach(k => { d.seo.currentRank[k.kw] = k.rank; });
  }
  if (site.opps && site.opps.length) {
    d.geo.opportunities = site.opps;
  } else {
    site.opps = d.geo.opportunities.map(o => ({ url: o.url, reason: o.reason, how: o.how, done: !!o.done }));
  }
  if (site.competitor) {
    d.geo.battlecard.competitor.name = site.competitor;
  }
  d.audit = site.audit || null;
  d.lastScanAt = site.lastScanAt || 0;
  d.site = site;
  return d;
}

/* 时间与新鲜度 */
function relTime(ts) {
  if (!ts) return '未知';
  const diff = Date.now() - ts;
  if (diff < 0) return '刚刚';
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时前';
  const dd = Math.floor(h / 24);
  return dd + ' 天前';
}
function freshness(ts) {
  if (!ts) return { label: '未检测', cls: 'tag-red', days: null };
  const dd = (Date.now() - ts) / 86400000;
  if (dd < 1) return { label: '数据新鲜', cls: 'tag-green', days: dd };
  if (dd < 7) return { label: '建议更新', cls: 'tag-amber', days: dd };
  return { label: '数据已过期', cls: 'tag-red', days: dd };
}
function nextReviewAt(ts) { return ts ? ts + 7 * 86400000 : null; }
function relFuture(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return '就在今天';
  const dd = Math.ceil(diff / 86400000);
  return dd + ' 天后（' + fmtTime(ts).replace(/ .*$/, '') + '）';
}

/* ----------------------- 全局状态 ----------------------- */
const VIEWS = ['dashboard', 'audit', 'seo', 'geo', 'action', 'report'];
const VIEW_LABEL = { dashboard: '双引擎看板', audit: '真实站点体检', seo: '传统搜索 SEO', geo: 'AI 搜索 GEO', action: '行动优化', report: '报告分享' };
const state = {
  loaded: false, view: 'dashboard', boss: false, data: null, site: null,
  scanning: false, scanDone: false, scroll: {}, lastFocus: null, routing: false
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 提示条工具 */
function hint(title, body) {
  return '<div class="hint"><span class="hint-ic">💡</span><div><b>' + title + '</b> ' + body + '</div></div>';
}
function term(key) { return '<span class="term" data-term="' + esc(key) + '" title="点击查看解释">' + esc(key) + '</span>'; }

/* 阈值判定：把冷冰冰的数字翻译成人话 */
function rankLevel(v) { return v <= 3 ? ['优秀', 'tag-green'] : v <= 10 ? ['首页', 'tag-green'] : v <= 30 ? ['前 3 页', 'tag-amber'] : ['待提升', 'tag-red']; }
function diffLevel(v) { return v < 30 ? ['容易', 'tag-green'] : v < 60 ? ['中等', 'tag-amber'] : ['困难', 'tag-red']; }
function healthLevel(v) { return v >= 80 ? ['健康', 'tag-green'] : v >= 60 ? ['一般', 'tag-amber'] : ['较差', 'tag-red']; }
function scoreLevel(v) { return v >= 70 ? ['良好', 'tag-green'] : v >= 40 ? ['中等', 'tag-amber'] : ['偏低', 'tag-red']; }

/* ----------------------- 后端集成桩 ----------------------- */
async function fetchBackend(form) {
  // TODO(MVP→上线): 替换为真实 OpenSEO + GEO/AEO Tracker API 调用
  // const seo = await fetch('/api/openseo/keywords?domain=' + form.domain).then(r => r.json());
  // const geo = await fetch('/api/geo/visibility?domain=' + form.domain).then(r => r.json());
  // return { ...真实数据, demo: false, ...form };
  return new Promise(resolve => {
    setTimeout(() => {
      const site = getSite(form.domain) || newSiteRecord(form);
      resolve(composeData(site));
    }, 1800);
  });
}

/* ----------------------- 路由（哈希）与视图切换 ----------------------- */
function mainEl() { return document.querySelector('.wb-main'); }

function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (!h) return { area: 'landing', view: null };
  if (h === 'wb') return { area: 'wb', view: null };
  const m = h.match(/^wb\/([^\/]+)$/);
  if (m) {
    // 视图名无效时留在工作台并回落到看板，不把用户弹回官网
    return { area: 'wb', view: VIEWS.indexOf(m[1]) >= 0 ? m[1] : 'dashboard' };
  }
  return { area: 'landing', view: null };
}
function setRoute(hash) {
  if (location.hash === hash) return;
  state.routing = true;
  try { location.hash = hash; } catch (e) { /* ignore */ }
  setTimeout(() => { state.routing = false; }, 0);
}
function showWorkbench() {
  $('landing').classList.add('hidden');
  $('workbench').classList.remove('hidden');
}
function showLanding() {
  $('workbench').classList.add('hidden');
  $('landing').classList.remove('hidden');
}
function openWorkbench(view) {
  if (view) state.view = view;
  showWorkbench();
  setRoute('#/wb/' + state.view);
  window.scrollTo(0, 0);
  const m = mainEl(); if (m) m.scrollTop = 0;
}
function backToLanding() {
  showLanding();
  setRoute('#/');
  window.scrollTo(0, 0);
}
function switchTab(name, fromRoute) {
  if (VIEWS.indexOf(name) < 0) name = 'dashboard';
  // 记住离开时的滚动位置
  if (state.loaded && state.view && state.scroll) {
    const m = mainEl();
    state.scroll[state.view] = { main: m ? m.scrollTop : 0, win: window.scrollY || 0 };
  }
  state.view = name;
  document.querySelectorAll('.nav-item').forEach(n => {
    const on = n.dataset.view === name;
    n.classList.toggle('active', on);
    n.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  VIEWS.forEach(v => {
    const el = $('view-' + v);
    if (el) el.classList.toggle('hidden', v !== name);
  });
  if (!fromRoute) setRoute('#/wb/' + name);
  if (state.loaded) renderCurrent();
  // 恢复该视图的滚动位置
  if (state.scroll && state.scroll[name]) {
    const m = mainEl();
    const s = state.scroll[name];
    if (m && m.scrollHeight > m.clientHeight + 8) m.scrollTop = s.main || 0;
    else window.scrollTo(0, s.win || 0);
  }
  const t = $('view-title-now'); if (t) t.textContent = VIEW_LABEL[name] || '';
}
function applyRoute() {
  if (state.routing) return;
  const r = parseHash();
  if (r.area === 'wb') {
    showWorkbench();
    if (r.view) switchTab(r.view, true);
  } else {
    showLanding();
  }
}
function toggleBoss() {
  state.boss = !state.boss;
  $('bossToggle').textContent = state.boss ? '完整视图' : '老板视图';
  if (state.loaded && state.view === 'dashboard') renderDashboard();
}

/* ----------------------- 站点管理（v0.3 新增） ----------------------- */
function renderSites() {
  const sel = $('siteSelect');
  if (!sel) return;
  if (!store.sites.length) {
    sel.innerHTML = '<option>尚未检测任何站点</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = store.sites.map(s =>
    '<option value="' + esc(s.form.domain) + '"' + (s.form.domain === store.current ? ' selected' : '') + '>' +
    esc(s.form.brand || s.form.domain) + ' · ' + esc(s.form.domain) + '</option>').join('');
  const rm = $('removeSite');
  if (rm) rm.classList.toggle('hidden', store.sites.length < 2);
}
/* 把站点信息回填到表单，保证「重新检测」可用 */
function syncForm(site) {
  if (!site || !site.form) return;
  const f = site.form;
  if ($('f-domain')) $('f-domain').value = f.domain || '';
  if ($('f-brand')) $('f-brand').value = f.brand || '';
  if ($('f-city')) $('f-city').value = f.city || '';
  if ($('f-industry') && f.industry) $('f-industry').value = f.industry;
  validateDomain(true);
}
function switchSite(domain) {
  const site = getSite(domain);
  if (!site) return;
  store.current = domain; saveStore();
  state.site = site;
  state.data = composeData(site);
  syncForm(site);
  state.loaded = true;
  state.actionDone = (site.checks || []).filter(Boolean).length;
  $('wb-domain').textContent = state.data.domain;
  $('wb-brand').textContent = state.data.brand;
  $('scan-form').classList.add('hidden');
  $('wb-content').classList.remove('hidden');
  showDemoMarks(site.audit);
  renderSites();
  renderAll();
  toast('已切换到 ' + (state.data.brand || state.data.domain));
}
function removeCurrentSite() {
  const site = getSite(store.current);
  if (!site) return;
  store.sites = store.sites.filter(s => s.form.domain !== store.current);
  const next = store.sites[store.sites.length - 1];
  store.current = next ? next.form.domain : '';
  saveStore();
  if (next) { switchSite(next.form.domain); }
  else { resetScan(); renderSites(); }
  toast('已移除该站点的本地记录');
}
function clearAllData() {
  closeModal();
  store = { sites: [], current: '' };
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_KEY_OLD); } catch (e) { }
  resetScan();
  renderSites();
  $('demoBadge').classList.add('hidden');
  $('demo-watermark').classList.add('hidden');
  const rb = $('realBadge'); if (rb) rb.classList.add('hidden');
  toast('已清空全部本地数据（浏览器本地存储）');
}
function showDemoMarks(audit) {
  const badge = $('demoBadge'); if (badge) badge.classList.remove('hidden');
  const wm = $('demo-watermark'); if (wm) wm.classList.remove('hidden');
  const rb = $('realBadge');
  if (rb) {
    const a = audit || (state.data && state.data.audit);
    const site = state.site;
    if (a && a.score !== null) {
      rb.classList.remove('hidden');
      rb.className = 'real-badge ' + freshness(site ? site.lastScanAt : a.at).cls.replace('tag-', 'rb-');
      rb.textContent = '✓ 真实抓取 · 技术就绪 ' + a.score + ' 分 · ' + relTime(site ? site.lastScanAt : a.at);
    } else if (a) {
      rb.classList.remove('hidden');
      rb.className = 'real-badge rb-warn';
      rb.textContent = '⚠ 站点未开放跨域读取 · 可手动粘贴解析';
    } else {
      rb.classList.add('hidden');
    }
  }
}

/* ----------------------- 表单 ----------------------- */
function fillSample() {
  $('f-domain').value = 'xinghe-decor.com';
  $('f-brand').value = '星河装饰';
  $('f-city').value = '杭州';
  $('f-industry').value = '装修';
  validateDomain(true);
  toast('已填入示例：杭州一家装修公司，可直接点「开始双引擎检测」');
}
function validateDomain(silent) {
  const el = $('f-domain'); const msg = $('domain-msg');
  if (!el || !msg) return true;
  const raw = (el.value || '').trim();
  if (!raw) { msg.className = 'field-msg'; msg.textContent = ''; return !silent; }
  const domain = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
    msg.className = 'field-msg ok';
    msg.textContent = '✓ 域名格式正确';
    return true;
  }
  msg.className = 'field-msg err';
  msg.textContent = '✗ 格式不对，示例：example.com（不要带 http:// 和路径）';
  return false;
}

/* ----------------------- 检测流程 ----------------------- */
async function runScan(e) {
  if (e) e.preventDefault();
  if (state.scanning) return;
  const raw = ($('f-domain').value || '').trim();
  const domain = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const brand = ($('f-brand').value || '').trim();
  const city = ($('f-city').value || '').trim();
  const industry = ($('f-industry').value || '').trim();
  if (!domain) { toast('请先输入你的网站域名'); $('f-domain').focus(); return; }
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
    toast('域名格式看起来不对，例如 example.com');
    $('f-domain').focus(); return;
  }
  $('f-domain').value = domain;

  state.scanning = true;
  state.scanDone = false;
  $('loading').classList.remove('hidden');
  const fill = $('load-bar-fill');
  let curPct = 4;
  const setStep = (s, pct) => {
    const el = $('load-step'); if (el) el.textContent = s;
    if (typeof pct === 'number') curPct = Math.max(curPct, pct);
    if (fill) fill.style.width = curPct + '%';
  };
  setStep('正在准备检测…', 6);

  const t0 = Date.now();
  try {
    // 真实抓取（真进度）与演示数据并行
    const auditPromise = runRealAudit(domain, brand, setStep);
    const d = await fetchBackend({ domain: domain, brand: brand, city: city, industry: industry });
    if (state.scanDone) return;
    const audit = await auditPromise;
    if (state.scanDone) return;

    // 保证加载动画不至于一闪而过
    const elapsed = Date.now() - t0;
    if (elapsed < 1400) await sleep(1400 - elapsed);
    if (state.scanDone) return;
    setStep('正在生成双引擎周报与行动清单…', 96);
    await sleep(220);
    if (state.scanDone) return;
    state.scanning = false;   // 必须复位，否则「重新检测」按钮会永久失效

    // 写入 / 更新站点记录
    const site = getSite(domain) || newSiteRecord({ domain: domain, brand: brand, city: city, industry: industry });
    site.form = { domain: domain, brand: brand, city: city, industry: industry };
    if (!site.checks) site.checks = [];
    site.audit = audit;
    site.lastScanAt = audit && audit.at ? audit.at : Date.now();
    // 历史快照：每次检测记录一次，用于「改完复查」真实对比
    site.history = site.history || [];
    site.history.push({
      t: site.lastScanAt,
      overall: d.geo.overall,
      rank: Math.min.apply(null, Object.values(d.seo.currentRank)),
      tech: audit ? audit.score : null,
      coverage: audit ? audit.coverage : 0
    });
    if (site.history.length > 24) site.history = site.history.slice(-24);

    state.site = site;
    state.data = composeData(site);   // 先补全 opportunities 等派生字段
    upsertSite(site);                 // 再落盘，保证存下来的是完整记录
    state.loaded = true;
    state.actionDone = (site.checks || []).filter(Boolean).length;
    if (fill) fill.style.width = '100%';
    $('loading').classList.add('hidden');
    $('wb-domain').textContent = state.data.domain;
    $('wb-brand').textContent = state.data.brand;
    $('scan-form').classList.add('hidden');
    $('wb-content').classList.remove('hidden');
    showDemoMarks(audit);
    renderSites();
    switchTab('dashboard');
    renderAll();
    const real = audit && audit.score !== null;
    toast(real
      ? '检测完成 · 真实抓取技术就绪分 ' + audit.score + ' 分（覆盖 ' + audit.coverage + '%）· 排名与 AI 可见性为演示数据'
      : '检测完成 · 站点未开放跨域读取，体检可改用「手动粘贴」解析');
  } catch (err) {
    state.scanning = false;
    $('loading').classList.add('hidden');
    toast('检测失败：' + (err && err.message ? err.message : '未知错误') + '，请重试');
  }
}
function cancelScan() {
  state.scanDone = true;
  state.scanning = false;
  $('loading').classList.add('hidden');
  toast('已取消本次检测');
}

/* ----------------------- 图表工具 ----------------------- */
function ring(percent, color, size) {
  size = size || 130;
  const r = (size - 16) / 2, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
  const cx = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="AI 可见性 ' + percent + ' 分（满分 100）">' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="rgba(255,255,255,.08)" stroke-width="11" fill="none"/>' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + color + '" stroke-width="11" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
    '<text x="' + cx + '" y="' + (cx + 4) + '" text-anchor="middle" fill="#fff" font-size="30" font-weight="800">' + percent + '</text>' +
    '<text x="' + cx + '" y="' + (cx + 26) + '" text-anchor="middle" fill="#8b90a8" font-size="12">/100</text></svg>';
}

function lineChart(series, labels, opts) {
  opts = opts || {};
  const w = opts.w || 600, h = opts.h || 250, pad = { l: 42, r: 18, t: 16, b: 30 };
  const all = series.reduce((a, s) => a.concat(s.data), []);
  if (!all.length) return '';
  let max = Math.max.apply(null, all) * 1.12 || 1, min = 0;
  const n = series[0].data.length;
  const X = i => pad.l + (w - pad.l - pad.r) * (i / (n - 1 || 1));
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
  return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="趋势折线图">' + grid + paths + xl + '</svg>';
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
  return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="各平台得分柱状图">' + s + '</svg>';
}

function legendOf(series) {
  return '<div class="legend">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>';
}

/* ----------------------- 渲染：总调度 ----------------------- */
function renderAll() { renderDashboard(); renderAudit(); renderSEO(); renderGEO(); renderAction(); renderReport(); }
function renderCurrent() {
  const map = { dashboard: renderDashboard, audit: renderAudit, seo: renderSEO, geo: renderGEO, action: renderAction, report: renderReport };
  if (map[state.view]) map[state.view]();
}

/* 上次检测对比（真实快照，不是写死文案） */
function sinceLastScan(site, d) {
  const h = (site && site.history) || [];
  if (h.length < 2) return null;
  const prev = h[h.length - 2], now = h[h.length - 1];
  return { overall: now.overall - prev.overall, rank: prev.rank - now.rank, when: prev.t };
}
function fmtTime(ts) {
  const dt = new Date(ts);
  return (dt.getMonth() + 1) + '月' + dt.getDate() + '日 ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
}

/* 看板 */
function renderDashboard() {
  if (!state.data) { renderEmpty('view-dashboard'); return; }
  const d = state.data, site = d.site;
  const ranks = Object.values(d.seo.currentRank);
  const topRank = Math.min.apply(null, ranks);
  const aiScore = d.geo.overall;
  const opps = d.geo.opportunities || [];
  const doneN = opps.filter(o => o.done).length;
  const last = sinceLastScan(site, d);
  const seoDelta = d.seo.rankTrend.series[0].data[0] - d.seo.rankTrend.series[0].data[7];
  const aiDelta = d.geo.history[7] - d.geo.history[0];
  const a = d.audit;
  const fr = freshness(site ? site.lastScanAt : 0);
  let html = '';

  // 数据来源标示：把「真实」和「演示」分清楚，不让用户误会
  html += '<div class="source-bar">' +
    '<span class="sb-chip real">🛰️ 真实抓取</span>' +
    '<span class="sb-txt">技术就绪分、llms.txt / robots.txt / sitemap 状态均为浏览器实际请求所得</span>' +
    '<span class="sb-chip ' + fr.cls + '">' + fr.label + ' · ' + relTime(site ? site.lastScanAt : 0) + '</span>' +
    '</div>';
  html += '<div class="source-bar" style="margin-top:-10px">' +
    '<span class="sb-chip demo">DEMO</span>' +
    '<span class="sb-txt">关键词搜索量、Google 排名、7 平台 AI 可见性为按行业参数化生成的演示数据（需付费数据源）</span>' +
    '</div>';

  if (state.boss) {
    html += '<div class="boss-view">' +
      '<div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ' + topRank + ' 名</div><div class="small muted">核心关键词自然搜索</div></div>' +
      '<div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">' + aiScore + '</div><div class="small muted">7 个 AI 平台综合（0–100）</div></div>' +
      '<div class="boss-num"><div class="b-label">技术就绪分</div><div class="b-value gold">' + (a && a.score !== null ? a.score : '—') + '</div><div class="small muted">真实抓取 · 覆盖 ' + (a ? a.coverage : 0) + '%</div></div></div>';
    html += '<div class="summary-bar">' + d.summary + '</div>';
    if (last) {
      html += '<div class="card"><h3>🔁 与上次检测对比</h3><div class="card-sub">上次检测：' + fmtTime(last.when) + '</div>' +
        '<div class="cols-2">' +
        '<div class="stat"><div class="label">AI 可见性变化</div><div class="value ' + (last.overall >= 0 ? 'delta up' : 'delta down') + '">' + (last.overall >= 0 ? '+' : '') + last.overall + '</div></div>' +
        '<div class="stat"><div class="label">最佳排名变化</div><div class="value ' + (last.rank >= 0 ? 'delta up' : 'delta down') + '">' + (last.rank >= 0 ? '↑ ' : '↓ ') + Math.abs(last.rank) + ' 位</div></div>' +
        '</div>' + hint('怎么读这两个数', '正数代表比上次进步。若显示 0，说明两次检测间没有变化——这在演示环境下是正常的（数据按域名确定性生成）。') + '</div>';
    }
    html += '<p class="muted small">老板视图：只看 3 个核心数字，复杂图表已隐藏。点右上角「完整视图」查看全部数据。</p>';
    $('view-dashboard').innerHTML = html;
    return;
  }

  html += '<div class="stat-grid">' +
    '<div class="stat"><div class="label">谷歌最佳排名</div><div class="value" style="color:var(--cyan)">第 ' + topRank + ' 名</div><div class="delta up">↑ 较首周 +' + seoDelta + ' 位</div></div>' +
    '<div class="stat"><div class="label">AI 可见性分</div><div class="value" style="color:var(--violet-soft)">' + aiScore + '</div><div class="delta up">↑ 较首周 +' + aiDelta + '</div></div>' +
    '<div class="stat"><div class="label">技术就绪分 <span class="tag-mini tag-green" style="font-size:10px">真实</span></div><div class="value" style="color:var(--gold)">' + (a && a.score !== null ? a.score : '—') + '</div>' +
    '<div class="delta ' + (a && a.score !== null && a.score >= 70 ? 'up' : '') + '">' + (a ? '抓取覆盖 ' + a.coverage + '%' : '尚未抓取') + '</div></div>' +
    '<div class="stat"><div class="label">待办优化</div><div class="value" style="color:var(--gold)">' + (opps.length - doneN) + '</div><div class="delta down">项未完成</div></div></div>';

  html += '<div class="summary-bar">' + d.summary + '</div>';

  // 实时性：复核提醒
  html += '<div class="card"><h3>🕒 数据新鲜度与复核节奏</h3><div class="card-sub">让「定期复查」变成习惯，而不是想起来才做</div>' +
    '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:6px">' +
    '<div class="stat"><div class="label">上次检测</div><div class="value" style="font-size:20px">' + relTime(site ? site.lastScanAt : 0) + '</div><div class="delta muted">' + (site && site.lastScanAt ? fmtTime(site.lastScanAt) : '—') + '</div></div>' +
    '<div class="stat"><div class="label">建议下次复核</div><div class="value" style="font-size:20px">' + relFuture(nextReviewAt(site ? site.lastScanAt : 0)) + '</div><div class="delta muted">每 7 天一次</div></div>' +
    '<div class="stat"><div class="label">已累计检测</div><div class="value" style="font-size:20px">' + ((site && site.history) ? site.history.length : 0) + ' 次</div><div class="delta muted">历史可对比</div></div></div>' +
    '<div class="copy-row"><button class="btn btn-primary btn-sm" onclick="runScan()">↻ 立即重新检测（含真实抓取）</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="switchTab(\'report\')">查看检测时间轴 →</button></div>' +
    hint('为什么要定期复查', 'AI 的答案和搜索引擎排名都会变。只测一次看到的是快照，连续测才能看出"改了到底有没有用"。') +
    '</div>';

  if (last) {
    html += '<div class="card"><h3>🔁 与上次检测对比</h3><div class="card-sub">上次检测：' + fmtTime(last.when) + ' · 这是你「改完复查」的闭环依据</div>' +
      '<div class="cols-2">' +
      '<div class="stat"><div class="label">AI 可见性变化</div><div class="value ' + (last.overall >= 0 ? 'delta up' : 'delta down') + '">' + (last.overall >= 0 ? '+' : '') + last.overall + '</div></div>' +
      '<div class="stat"><div class="label">最佳排名变化</div><div class="value ' + (last.rank >= 0 ? 'delta up' : 'delta down') + '">' + (last.rank >= 0 ? '↑ ' : '↓ ') + Math.abs(last.rank) + ' 位</div></div></div>' +
      hint('注意', '演示环境下同一域名两次检测结果一致（确定性生成），所以变化为 0 属正常。接入真实 API 后这里会体现真实波动。') + '</div>';
  }

  html += '<div class="cols-2">' +
    '<div class="card"><h3>📈 传统搜索排名趋势</h3><div class="card-sub">核心关键词 8 周 Google 排名（越低越好）</div>' +
    lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels) + legendOf(d.seo.rankTrend.series) +
    hint('这意味着什么', '两条线都在往下走（数值变小），说明关键词排名在稳步上升。若线条走平或反弹，就要检查内容更新频率和外链增长。') + '</div>' +
    '<div class="card"><h3>🤖 AI 可见性成长</h3><div class="card-sub">7 个 AI 平台综合可见性分 8 周变化</div>' +
    lineChart([{ name: 'AI 可见性', color: '#8b5cf6', data: d.geo.history }], d.geo.historyLabels) +
    hint('这意味着什么', '曲线从 0 起步说明起点是"AI 回答里完全没提到你"。目前主要靠外部引用推动；部署 llms.txt 是下一步拉升曲线最直接的动作。') + '</div></div>';

  html += '<div class="card"><h3>🎯 下一步做什么（按优先级排序）</h3><div class="card-sub">从"看见问题"到"动手改完"，这是名无界的核心价值</div>' +
    buildActionPlan(d).slice(0, 4).map(a =>
      '<div class="list-item"><span class="prio ' + a.prioCls + '">' + a.prio + '</span><div>' +
      '<div class="li-title">' + a.t + '</div><div class="li-sub">' + a.why + '</div></div></div>').join('') +
    '<button class="btn btn-ghost btn-sm" onclick="switchTab(\'action\')">前往「行动优化」动手做 →</button></div>';

  $('view-dashboard').innerHTML = html;
}

/* 行动清单生成（优先级 + 影响/难度/耗时） */
function buildActionPlan(d) {
  const cfg = INDUSTRIES[d.industry] || INDUSTRIES['其他'];
  const notYou = (d.geo.citationDomains || []).filter(c => !c.you).map(c => c.domain);
  return [
    { prio: 'P0', prioCls: 'p0', t: '生成并部署 llms.txt', why: '成本最低、见效最快的一步：让 AI 正确理解你的业务', eff: '高', diff: '低', eta: '10 分钟' },
    { prio: 'P0', prioCls: 'p0', t: '补齐 ' + cfg.schema + ' 结构化数据', why: '让搜索与 AI 准确识别你是做什么的、服务哪个城市', eff: '高', diff: '低', eta: '20 分钟' },
    { prio: 'P1', prioCls: 'p1', t: '争取 ' + (notYou[0] || cfg.platforms[0]) + ' 的引用', why: '竞品被引用了而你没有——这是当前最直接的可见性缺口', eff: '高', diff: '中', eta: '1–2 周' },
    { prio: 'P1', prioCls: 'p1', t: '产出 3 篇本地案例内容', why: 'AI 引用偏好"有具体事实"的内容：案例、价格区间、避坑要点', eff: '高', diff: '中', eta: '2 周' },
    { prio: 'P2', prioCls: 'p2', t: '修复站点技术问题（断链 / 重复标题 / 缺 meta）', why: '技术底子不干净会拖累所有优化的效果上限', eff: '中', diff: '低', eta: '30 分钟' },
    { prio: 'P2', prioCls: 'p2', t: '建立每月复查节奏', why: '把"检测 → 优化 → 复查"变成固定动作，才能看到趋势', eff: '中', diff: '低', eta: '每月 5 分钟' }
  ];
}

/* ----------------------- 模块 F：真实站点体检（v0.4 新增） ----------------------- */
function auditTag(status) {
  if (status === 'pass') return '<span class="tag-mini tag-green">✓ 通过</span>';
  if (status === 'warn') return '<span class="tag-mini tag-amber">! 待改进</span>';
  if (status === 'fail') return '<span class="tag-mini tag-red">✗ 未通过</span>';
  return '<span class="tag-mini tag-grey">－ 无法自动读取</span>';
}
function auditRow(it) {
  return '<div class="list-item audit-row"><div class="bullet" style="background:' +
    (it.status === 'pass' ? 'var(--green)' : it.status === 'warn' ? 'var(--amber)' : it.status === 'fail' ? 'var(--red)' : 'var(--muted-2)') +
    '"></div><div style="flex:1"><div class="li-title">' + it.name + ' ' + auditTag(it.status) + '</div>' +
    '<div class="li-sub">' + it.detail + '</div>' +
    (it.fix ? '<div class="li-sub" style="color:var(--cyan-soft)">怎么改：' + it.fix + '</div>' : '') +
    '</div></div>';
}
function renderAudit() {
  if (!state.data) { renderEmpty('view-audit'); return; }
  const d = state.data, site = d.site, a = d.audit;
  const fr = freshness(site ? site.lastScanAt : 0);
  let html = '';

  html += '<div class="source-bar">' +
    '<span class="sb-chip real">🛰️ 真实抓取</span>' +
    '<span class="sb-txt">llms.txt · robots.txt · sitemap.xml · 首页 HTML 由浏览器直接请求并解析</span>' +
    '<span class="sb-chip ' + fr.cls + '">' + fr.label + ' · ' + relTime(site ? site.lastScanAt : 0) + '</span>' +
    '</div>';

  if (!a) {
    html += '<div class="card" style="text-align:center;padding:48px 20px">' +
      '<div style="font-size:38px;margin-bottom:12px">🩺</div><h3>还没有真实体检数据</h3>' +
      '<p class="muted small mt mb">点击下方按钮，浏览器会真实请求你站点的 4 类公开资源并解析，全程不需要任何 API Key。</p>' +
      '<button class="btn btn-primary btn-sm" id="audit-refresh" onclick="rerunAudit()">🔄 立即真实抓取</button>' +
      '<div class="small muted mt" id="audit-progress"></div></div>';
    $('view-audit').innerHTML = html;
    return;
  }

  const groups = [
    { key: 'ai', title: '🤖 AI 爬虫可达性', sub: '决定 ChatGPT / 豆包 / Perplexity 能不能读到你的站点' },
    { key: 'seo', title: '🔍 搜索与社交可读性', sub: '搜索引擎与社交平台如何理解你的页面' },
    { key: 'tech', title: '🧱 技术基础', sub: '页面本身是否符合现代规范' }
  ];

  html += '<div class="cols-2">' +
    '<div class="card" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
    '<div>' + (a.score === null
      ? '<div class="ring-empty">无法判定</div>'
      : ring(a.score, a.score >= 70 ? '#34d399' : a.score >= 40 ? '#fbbf24' : '#fb7185', 150)) + '</div>' +
    '<div><h3 style="margin-bottom:6px">技术就绪分</h3>' +
    '<div class="card-sub">基于真实抓取结果加权（共 10 项检查）</div>' +
    '<div class="small muted mt">检测覆盖度：<b style="color:' + (a.coverage >= 70 ? 'var(--green)' : a.coverage >= 40 ? 'var(--amber)' : 'var(--red)') + '">' + a.coverage + '%</b>' +
    '　抓取时间：<b style="color:#fff">' + fmtTime(a.at) + '</b></div>' +
    '<div class="small muted mt">' + (a.coverage >= 70
      ? '覆盖度良好，这个分数可以直接作为优化基线。'
      : '覆盖度偏低 —— 多数检查被跨域策略拦截，建议用下方「手动粘贴」补齐后再看分数。') + '</div>' +
    '<div class="copy-row"><button class="btn btn-primary btn-sm" id="audit-refresh" onclick="rerunAudit()">🔄 重新真实抓取</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="exportCSV(\'audit\')">⬇️ 导出体检结果 CSV</button></div>' +
    '<div class="small muted mt" id="audit-progress"></div>' +
    '</div></div>' +
    '<div class="card"><h3>📌 这份体检为什么可信</h3>' +
    '<div class="card-sub">因为它不是你填的，是我们真的去抓的</div>' +
    (function () {
      const fails = a.items.filter(i => i.status === 'fail').length;
      const warns = a.items.filter(i => i.status === 'warn').length;
      const pass = a.items.filter(i => i.status === 'pass').length;
      const blocked = a.items.filter(i => i.status === 'blocked').length;
      return '<div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">' +
        '<div class="stat"><div class="label">通过</div><div class="value" style="color:var(--green);font-size:24px">' + pass + '</div></div>' +
        '<div class="stat"><div class="label">待改进</div><div class="value" style="color:var(--amber);font-size:24px">' + warns + '</div></div>' +
        '<div class="stat"><div class="label">未通过</div><div class="value" style="color:var(--red);font-size:24px">' + fails + '</div></div>' +
        '<div class="stat"><div class="label">读不到</div><div class="value" style="color:var(--muted);font-size:24px">' + blocked + '</div></div></div>';
    })() +
    hint('和演示数据的区别', '这一页的每一项都是浏览器真实请求 ' + esc(d.domain) + ' 得到的（HTTP 状态码、文件内容、HTML 解析结果）。排名与 AI 可见性仍需付费数据源，因此那两块仍标注为演示数据。') +
    '</div></div>';

  groups.forEach(function (g, gi) {
    const items = a.items.filter(i => i.cat === g.key);
    if (!items.length) return;
    html += '<div class="card"><h3>' + g.title + '</h3><div class="card-sub">' + g.sub + '</div>' +
      items.map(auditRow).join('') + '</div>';
  });

  // 手动粘贴兜底
  const blockedItems = a.items.filter(i => i.status === 'blocked');
  html += '<div class="card"><h3>✍️ 手动粘贴兜底（跨域被拦时用）</h3>' +
    '<div class="card-sub">部分站点不允许浏览器跨域读取。把内容复制粘贴进来，解析仍在你的浏览器里完成，数据不外传</div>' +
    (blockedItems.length
      ? '<div class="v-warn mb">有 ' + blockedItems.length + ' 项无法自动读取：' + blockedItems.map(i => i.name).join('、') + '。用下面的输入框补齐即可得到完整真实结果。</div>'
      : '<div class="v-ok mb">本次全部检查均已自动读取，无需手动补齐。</div>') +
    '<div class="paste-grid">' +
    '<div><label class="paste-label">① 粘贴 llms.txt 内容</label>' +
    '<textarea id="paste-llms" class="code-box" style="min-height:110px" placeholder="打开 https://' + esc(d.domain) + '/llms.txt ，全选复制后粘贴到这里"></textarea>' +
    '<button class="btn btn-ghost btn-sm mt" onclick="pasteAuditLLMs()">解析 llms.txt</button></div>' +
    '<div><label class="paste-label">② 粘贴 robots.txt 内容</label>' +
    '<textarea id="paste-robots" class="code-box" style="min-height:110px" placeholder="打开 https://' + esc(d.domain) + '/robots.txt ，全选复制后粘贴到这里"></textarea>' +
    '<button class="btn btn-ghost btn-sm mt" onclick="pasteAuditRobots()">解析 robots.txt（含 AI 爬虫屏蔽检查）</button></div>' +
    '<div><label class="paste-label">③ 粘贴首页源码</label>' +
    '<textarea id="paste-html" class="code-box" style="min-height:110px" placeholder="在首页按 Ctrl+U 查看源代码，全选复制后粘贴到这里"></textarea>' +
    '<button class="btn btn-ghost btn-sm mt" onclick="pasteAuditHtml()">解析首页 head</button></div>' +
    '</div></div>';

  $('view-audit').innerHTML = html;
}

/* 检测历史时间轴（报告页用） */
function renderTimeline(site) {
  const h = (site && site.history) || [];
  if (h.length < 1) return '<p class="muted small">还没有检测记录。</p>';
  const rows = h.slice().reverse().map(function (r, idx) {
    const prev = h.slice().reverse()[idx + 1];
    const dv = prev ? r.overall - prev.overall : null;
    return '<tr><td>' + fmtTime(r.t) + '</td>' +
      '<td>' + r.overall + (dv === null ? '' : ' <span class="tag-mini ' + (dv >= 0 ? 'tag-green' : 'tag-red') + '">' + (dv >= 0 ? '+' : '') + dv + '</span>') + '</td>' +
      '<td>第 ' + r.rank + ' 名</td>' +
      '<td>' + (r.tech === null || r.tech === undefined ? '<span class="muted">—</span>' : r.tech + ' 分') + '</td>' +
      '<td><span class="tag-mini ' + (r.coverage >= 70 ? 'tag-green' : r.coverage >= 40 ? 'tag-amber' : 'tag-red') + '">' + (r.coverage || 0) + '%</span></td></tr>';
  }).join('');
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>检测时间</th><th>AI 可见性</th><th>最佳排名</th><th>技术就绪</th><th>抓取覆盖</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

/* 模块 A：传统搜索可见性 */
function renderSEO() {
  if (!state.data) { renderEmpty('view-seo'); return; }
  const d = state.data;
  const kw = d.seo.keywords.map((k, i) =>
    '<tr><td>' + esc(k.kw) + (k.custom ? ' <span class="tag-mini tag-seo">自建</span>' : '') + '</td><td>' + k.vol.toLocaleString() + '</td>' +
    '<td>' + k.diff + ' <span class="tag-mini ' + diffLevel(k.diff)[1] + '">' + diffLevel(k.diff)[0] + '</span></td>' +
    '<td>¥' + Number(k.cpc).toFixed(1) + '</td><td><span class="tag-mini tag-seo">' + esc(k.intent) + '</span></td>' +
    '<td>' + (k.custom ? '<button class="link-btn" onclick="removeKeyword(' + i + ')">删除</button>' : '<span class="muted">—</span>') + '</td></tr>').join('');

  const rank = Object.entries(d.seo.currentRank).map(([k, v]) => {
    const lv = rankLevel(v);
    return '<tr><td>' + esc(k) + '</td><td>第 ' + v + ' 名</td><td><span class="tag-mini ' + lv[1] + '">' + lv[0] + '</span></td></tr>';
  }).join('');

  const anchors = d.seo.backlinks.topAnchors.map(a => '<tr><td>' + esc(a.a) + '</td><td>' + a.n + '</td></tr>').join('');
  const a = d.seo.audit, hv = healthLevel(a.score);

  $('view-seo').innerHTML =
    '<div class="stat-grid">' +
    '<div class="stat"><div class="label">监测关键词</div><div class="value">' + d.seo.keywords.length + '</div></div>' +
    '<div class="stat"><div class="label">引用域名</div><div class="value" style="color:var(--cyan)">' + d.seo.backlinks.domains + '</div><div class="delta muted">' + term('引用域名') + '</div></div>' +
    '<div class="stat"><div class="label">总外链</div><div class="value">' + d.seo.backlinks.total + '</div></div>' +
    '<div class="stat"><div class="label">站点健康分</div><div class="value" style="color:var(--green)">' + a.score + '</div><div class="delta"><span class="tag-mini ' + hv[1] + '">' + hv[0] + '</span></div></div></div>' +

    '<div class="card"><h3>➕ 添加我想盯的关键词</h3><div class="card-sub">行业模板只有 5 个通用词，这里加上你自己最在意的词（会保存到本地）</div>' +
    '<div class="kw-add">' +
    '<input id="kw-new" type="text" placeholder="例如 杭州老房翻新哪家好" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addKeyword();}">' +
    '<button class="btn btn-primary btn-sm" onclick="addKeyword()">添加</button></div></div>' +

    '<div class="cols-2">' +
    '<div class="card"><h3>🔍 关键词研究</h3><div class="card-sub">搜索量 / 难度 / CPC / 意图（OpenSEO · DataForSEO）</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>关键词</th><th>月搜索量</th><th>难度</th><th>CPC</th><th>意图</th><th></th></tr></thead><tbody>' + kw + '</tbody></table></div>' +
    hint('怎么用这张表', '先做「搜索量高 + 难度低」的词。难度 60 以上的词（如「' + esc(d.seo.keywords[0].kw) + '」）通常要靠长期内容积累，不适合作为第一个突破口。') + '</div>' +
    '<div class="card"><h3>📊 当前排名</h3><div class="card-sub">核心关键词 Google 实时位置</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>关键词</th><th>排名</th><th>区间</th></tr></thead><tbody>' + rank + '</tbody></table></div>' +
    hint('为什么排第几很重要', '排在第 1 页（前 10 名）才可能带来自然点击。第 11 名和第 30 名的实际流量差距，往往有几十倍。') + '</div></div>' +

    '<div class="card"><h3>📈 排名趋势</h3><div class="card-sub">8 周追踪（越低越好）</div>' +
    lineChart(d.seo.rankTrend.series, d.seo.rankTrend.labels) + legendOf(d.seo.rankTrend.series) + '</div>' +

    '<div class="cols-2">' +
    '<div class="card"><h3>🔗 外链分析</h3><div class="card-sub">引用域名与锚文本分布</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>锚文本</th><th>数量</th></tr></thead><tbody>' + anchors + '</tbody></table></div></div>' +
    '<div class="card"><h3>🩺 站点审计</h3><div class="card-sub">页级 SEO 信号体检 —— 每项都附修复动作</div>' +
    auditItem('var(--red)', '断链 ' + a.brokenLinks + ' 处', '全站导出 404 链接，逐个改指向或用 301 跳转到相关页') +
    auditItem('var(--amber)', '重复标题 ' + a.dupTitles + ' 处', '给每个页面写唯一 Title，格式建议「核心词 + 城市 + 品牌名」') +
    auditItem('var(--amber)', '缺 meta description ' + a.missingMeta + ' 页', '补 60–80 字描述，把关键词和卖点写进去（影响搜索点击率）') +
    '</div></div>' +

    '<div class="copy-row">' +
    '<button class="btn btn-ghost btn-sm" onclick="exportCSV(\'seo\')">⬇️ 导出 SEO 数据（CSV / Excel 可开）</button></div>';
}

function auditItem(color, title, how) {
  return '<div class="list-item"><div class="bullet" style="background:' + color + '"></div><div>' +
    '<div class="li-title">' + title + '</div><div class="li-sub">修复：' + how + '</div></div></div>';
}

/* 模块 B：AI 搜索可见性 */
function renderGEO() {
  if (!state.data) { renderEmpty('view-geo'); return; }
  const d = state.data;
  const cfg = INDUSTRIES[d.industry] || INDUSTRIES['其他'];
  const bars = d.geo.models.map(m => ({
    label: m.name, value: m.score,
    color: m.mentioned ? (m.score >= 55 ? '#8b5cf6' : '#a78bfa') : '#475569'
  }));
  const cit = d.geo.citationDomains.map(c => '<tr><td>' + esc(c.domain) + '</td><td>' + c.count + '</td><td>' +
    (c.you ? '<span class="tag-mini tag-green">✓ 你</span>' : '<span class="tag-mini tag-red">竞品</span>') + '</td></tr>').join('');

  const modelRows = d.geo.models.map(m =>
    '<div class="model-row"><div class="mr-name">' + esc(m.name) + '</div>' +
    '<div class="mr-score">' + m.score + '</div>' +
    '<div class="mr-tag">' + (m.mentioned ? '<span class="tag-mini ' + scoreLevel(m.score)[1] + '">已提及 · ' + scoreLevel(m.score)[0] + '</span>' : '<span class="tag-mini tag-red">未提及</span>') + '</div>' +
    '<div class="mr-cite">' + (m.citations && m.citations.length ? '引用来源：' + esc(m.citations.join('、')) : '<span class="muted">无引用来源</span>') + '</div></div>').join('');

  const opp = (d.geo.opportunities || []).map((o, i) =>
    '<div class="list-item"><div class="bullet" style="background:' + (o.done ? 'var(--green)' : 'var(--gold)') + '"></div><div style="flex:1">' +
    '<div class="li-title">' + esc(o.url) + '</div>' +
    '<div class="li-sub">为什么：' + esc(o.reason) + '</div>' +
    '<div class="li-sub" style="color:var(--cyan-soft)">怎么做：' + esc(o.how || '补充真实案例与专业内容，建立可被引用的公开页面') + '</div></div>' +
    '<button class="link-btn" onclick="removeOpp(' + i + ')">删除</button></div>').join('');

  const bc = d.geo.battlecard, aeo = d.geo.aeo;
  const tag = (x, cls) => '<span class="tag-mini ' + cls + '" style="margin:0 6px 6px 0;display:inline-block">' + esc(x) + '</span>';

  $('view-geo').innerHTML =
    '<div class="cols-2">' +
    '<div class="card" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
    '<div>' + ring(d.geo.overall, '#8b5cf6', 150) + '</div>' +
    '<div><h3 style="margin-bottom:6px">' + term('AI 可见性分') + '</h3>' +
    '<div class="card-sub">综合 ' + esc(AI_PLATFORMS.join(' / ')) + ' 共 7 个平台</div>' +
    '<div class="small muted mt">8 周前：<b style="color:#fff">' + d.geo.history[0] + '</b> → 现在：<b style="color:var(--violet-soft)">' + d.geo.overall + '</b></div>' +
    '<div class="small muted mt"><a href="#" onclick="openMethodology();return false" class="inline-link">评分口径怎么算的？→</a></div></div></div>' +
    '<div class="card"><h3>🤖 7 平台得分</h3><div class="card-sub">被 AI 提到并正确引用的程度</div>' + barChart(bars) +
    hint('怎么读这张图', '柱子越短说明该平台越"不认识"你。低于 40 分（深灰）表示 AI 回答里完全没提到你的品牌——这些就是优先要攻的平台。') + '</div></div>' +

    '<div class="card"><h3>📋 逐平台明细（哪个平台提了你、引用了谁）</h3><div class="card-sub">把笼统的分数拆到每个 AI 平台上</div>' +
    '<div class="model-list">' + modelRows + '</div></div>' +

    '<div class="cols-2">' +
    '<div class="card"><h3>🔗 引用分析</h3><div class="card-sub">哪些域名在 AI 回答里提到了你 / 竞品</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>域名</th><th>被引次数</th><th>归属</th></tr></thead><tbody>' + cit + '</tbody></table></div></div>' +
    '<div class="card"><h3>💡 引用机会</h3><div class="card-sub">竞品被引用、你却没有的来源 —— 每条都给了做法</div>' + opp +
    '<div class="kw-add mt"><input id="opp-new" type="text" placeholder="例如 ' + esc(cfg.platforms[0] + ' · ' + d.city + cfg.short + '案例页') + '"><button class="btn btn-ghost btn-sm" onclick="addOpp()">加一条</button></div></div></div>' +

    '<div class="cols-2">' +
    '<div class="card"><h3>⚔️ 竞品 <span class="term" data-term="Battlecard" title="点击查看解释">Battlecard</span></h3>' +
    '<div class="card-sub">你 vs ' + esc(bc.competitor.name) + '</div>' +
    '<div class="kw-add mb"><input id="comp-input" type="text" placeholder="填竞品域名或名字，对比会更贴近实际" value="' + esc(d.site && d.site.competitor ? d.site.competitor : '') + '"><button class="btn btn-ghost btn-sm" onclick="setCompetitor()">更新</button></div>' +
    '<div class="flex" style="gap:18px">' +
    '<div style="flex:1;min-width:140px"><div class="small muted mb">你的强项 / 弱项</div>' +
    bc.you['强项'].map(x => tag('+ ' + x, 'tag-green')).join('') + bc.you['弱项'].map(x => tag('- ' + x, 'tag-red')).join('') + '</div>' +
    '<div style="flex:1;min-width:140px"><div class="small muted mb">' + esc(bc.competitor.name) + '</div>' +
    bc.competitor['强项'].map(x => tag('+ ' + x, 'tag-green')).join('') + bc.competitor['弱项'].map(x => tag('- ' + x, 'tag-red')).join('') + '</div></div></div>' +
    '<div class="card"><h3>🧪 <span class="term" data-term="AEO" title="点击查看解释">AEO</span> 站点审计</h3><div class="card-sub">你的站点对 AI 是否友好</div>' +
    aeoItem(aeo.llmsTxt ? 'var(--green)' : 'var(--red)', 'llms.txt', aeo.llmsTxt ? '已部署' : '缺失 —— 去「行动优化」一键生成并部署') +
    aeoItem('var(--amber)', 'Schema.org 结构化数据', esc(aeo.schema) + ' —— 建议补齐 ' + (INDUSTRIES[d.industry] ? INDUSTRIES[d.industry].schema : 'LocalBusiness')) +
    aeoItem('var(--amber)', term('BLUF') + ' 密度 / 标题结构', esc(aeo.bluf) + ' / ' + esc(aeo.titleStruct) + ' —— 把结论放在段落开头，用 H2/H3 分层') +
    '</div></div>';
}

function aeoItem(color, title, sub) {
  return '<div class="list-item"><div class="bullet" style="background:' + color + '"></div><div>' +
    '<div class="li-title">' + title + '</div><div class="li-sub">' + sub + '</div></div></div>';
}

/* 可自动验证的行动（由真实体检实时判定） */
function renderAutoChecks(d, site) {
  const a = d.audit;
  const AUTO = [
    { id: 'llms', label: '部署 llms.txt', how: '生成 → 下载 → 传到网站根目录（与 index.html 同级）' },
    { id: 'robots', label: 'robots.txt 不屏蔽 AI 爬虫', how: '删除针对 GPTBot / ClaudeBot / PerplexityBot / Bytespider 的 Disallow: / 规则' },
    { id: 'sitemap', label: 'sitemap.xml 可访问', how: '生成站点地图放到根目录，并在 robots.txt 用 Sitemap: 声明' },
    { id: 'jsonld', label: '首页含 JSON-LD 结构化数据', how: '把下方「结构化数据」代码贴进页面 <head>' }
  ];
  const rows = AUTO.map(function (x) {
    const it = (a && a.items) ? a.items.filter(i => i.id === x.id)[0] : null;
    let badge, cls, dot;
    if (!it) { badge = '尚未抓取'; cls = 'tag-grey'; dot = 'var(--muted-2)'; }
    else if (it.status === 'pass') { badge = '✓ 已通过 · 自动验证'; cls = 'tag-green'; dot = 'var(--green)'; }
    else if (it.status === 'warn') { badge = '! 部分通过'; cls = 'tag-amber'; dot = 'var(--amber)'; }
    else if (it.status === 'fail') { badge = '✗ 未通过'; cls = 'tag-red'; dot = 'var(--red)'; }
    else { badge = '－ 需手动粘贴'; cls = 'tag-grey'; dot = 'var(--muted-2)'; }
    return '<div class="list-item"><div class="bullet" style="background:' + dot + '"></div><div style="flex:1">' +
      '<div class="li-title">' + esc(x.label) + ' <span class="tag-mini ' + cls + '">' + badge + '</span></div>' +
      '<div class="li-sub">做法：' + esc(x.how) + '</div></div></div>';
  }).join('');
  return '<div class="card"><h3>✅ 可自动验证的行动</h3>' +
    '<div class="card-sub">这 4 项由真实抓取实时判定 —— 你今天改完，下次重跑就会变绿，不用自己说「做完了」</div>' + rows +
    (a ? '' : hint('还没有体检数据', '先到「真实站点体检」跑一次抓取，这里才能自动判定。')) +
    '<button class="btn btn-ghost btn-sm mt" onclick="switchTab(\'audit\')">前往真实站点体检 →</button></div>';
}

/* 模块 D：行动优化层 */
function renderAction() {
  if (!state.data) { renderEmpty('view-action'); return; }
  const d = state.data, site = d.site;
  const cfg = INDUSTRIES[d.industry] || INDUSTRIES['其他'];
  const opps = d.geo.opportunities || [];
  const opp = opps.map((o, i) =>
    '<label class="list-item"><input type="checkbox" ' + (o.done ? 'checked' : '') + ' onchange="toggleOpp(' + i + ',this.checked)"/>' +
    '<div style="flex:1"><div class="li-title">' + esc(o.url) + '</div>' +
    '<div class="li-sub">' + esc(o.reason) + '</div>' +
    '<div class="li-sub" style="color:var(--cyan-soft)">做法：' + esc(o.how || '补充真实案例与专业内容，建立可被引用的公开页面') + '</div></div>' +
    '<button class="link-btn" onclick="event.preventDefault();removeOpp(' + i + ')">删除</button></label>').join('');

  $('view-action').innerHTML =
    renderAutoChecks(d, site) +
    '<div class="card" id="llms-card"><h3>📄 第一步：<span class="term" data-term="llms.txt" title="点击查看解释">llms.txt</span> 一键生成 + 部署</h3>' +
    '<div class="card-sub">AI 版 sitemap —— 告诉 ChatGPT / 豆包 / Perplexity 你的业务是什么（已按「' + esc(d.industry) + '」行业生成）</div>' +
    '<div class="copy-row">' +
    '<button class="btn btn-primary btn-sm" onclick="genLLMs()">⚡ 生成 llms.txt</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="copyLLMs()">复制内容</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="downloadLLMs()">下载 llms.txt</button></div>' +
    '<textarea id="llms-out" class="code-box mt" placeholder="点击「生成 llms.txt」后，这里会出现可直接托管的文件内容…" aria-label="llms.txt 内容"></textarea>' +

    '<div class="steps-box mt"><div class="sb-title">🚀 三步上线（这是最关键的一步，别停在"生成"）</div>' +
    '<ol class="sb-list">' +
    '<li><b>下载文件</b> —— 点上方「下载 llms.txt」，得到文件本身</li>' +
    '<li><b>传到网站根目录</b> —— 与 index.html 同级。展开下方你用的托管环境，照着做</li>' +
    '<li><b>验证能访问</b> —— 必须能通过 <code>https://' + esc(d.domain) + '/llms.txt</code> 公开打开，才算成功</li>' +
    '</ol>' +
    '<div class="copy-row"><button class="btn btn-primary btn-sm" onclick="verifyLLMs()">🔍 验证是否已上线</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="openUrlSafe(\'https://' + esc(d.domain) + '/llms.txt\')">在新窗口打开验证链接</button></div>' +
    '<div id="llms-verify" class="verify-box"></div>' +

    '<details class="dp"><summary>我用的是「静态托管」（GitHub Pages / Vercel / Netlify / Cloudflare Pages）</summary><div class="dp-body">' +
    '<ol class="sb-list">' + DEPLOY[0].steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
    '<div class="cmd-row"><code>' + esc(DEPLOY[0].cmd) + '</code><button class="btn btn-ghost btn-sm" onclick="copyText(\'' + esc(DEPLOY[0].cmd).replace(/'/g, "\\'") + '\')">复制命令</button></div>' +
    '</div></details>' +
    '<details class="dp"><summary>我用的是「WordPress 站点」</summary><div class="dp-body"><ol class="sb-list">' + DEPLOY[1].steps.map(s => '<li>' + s + '</li>').join('') + '</ol></div></details>' +
    '<details class="dp"><summary>我用的是「宝塔面板 / 虚拟主机」</summary><div class="dp-body"><ol class="sb-list">' + DEPLOY[2].steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
    '<div class="cmd-row"><code>' + esc(DEPLOY[2].cmd) + '</code><button class="btn btn-ghost btn-sm" onclick="copyText(\'' + esc(DEPLOY[2].cmd).replace(/'/g, "\\'") + '\')">复制命令</button></div></div></details>' +
    '<details class="dp"><summary>我用的是「自建服务器 Nginx / Apache」</summary><div class="dp-body"><ol class="sb-list">' + DEPLOY[3].steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
    '<div class="cmd-row"><code>' + esc(DEPLOY[3].cmd) + '</code><button class="btn btn-ghost btn-sm" onclick="copyText(\'' + esc(DEPLOY[3].cmd).replace(/'/g, "\\'") + '\')">复制命令</button></div></div></details>' +
    '<details class="dp"><summary>我用的是「对象存储 / CDN」（阿里云 OSS、腾讯云 COS）</summary><div class="dp-body"><ol class="sb-list">' + DEPLOY[4].steps.map(s => '<li>' + s + '</li>').join('') + '</ol></div></details>' +
    '</div></div>' +

    '<div class="cols-2">' +
    '<div class="card"><h3>🧱 第二步：结构化数据（<span class="term" data-term="Schema" title="点击查看解释">Schema</span>）</h3>' +
    '<div class="card-sub">为「' + esc(d.city) + esc(cfg.short) + '」关键页添加 ' + esc(cfg.schema) + ' JSON-LD，让 AI 准确知道你服务谁、在哪</div>' +
    '<pre id="jsonld-out">' + esc(buildJsonLd(d, cfg)) + '</pre>' +
    '<div class="copy-row"><button class="btn btn-ghost btn-sm" onclick="copyJSONLD()">复制代码</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="downloadJSONLD()">下载 .json</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="validateJSONLD()">校验格式</button></div>' +
    '<div id="jsonld-verify" class="verify-box"></div>' +
    hint('贴到哪里', '把这段代码放进对应页面的 &lt;head&gt; 里（或通过 GTM / 插件注入）。改完可以到 Google 的 Rich Results Test 免费验证。') + '</div>' +
    '<div class="card"><h3>📋 第三步：引用建设清单</h3><div class="card-sub">勾选完成项，进度会保存到本地并计入老板视图</div>' + opp +
    '<div class="kw-add"><input id="opp-new2" type="text" placeholder="加一条你自己的引用机会"><button class="btn btn-ghost btn-sm" onclick="addOpp()">添加</button></div>' +
    '<div class="small muted mt" id="action-count">已完成 ' + opps.filter(o => o.done).length + ' / ' + opps.length + '</div></div></div>' +

    '<div class="card"><h3>🗂️ 完整行动清单（按优先级）</h3><div class="card-sub">影响 × 难度 × 耗时，帮你决定先做哪件</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>优先级</th><th>动作</th><th>影响</th><th>难度</th><th>预计耗时</th></tr></thead><tbody>' +
    buildActionPlan(d).map(a => '<tr><td><span class="prio ' + a.prioCls + '">' + a.prio + '</span></td><td>' + a.t + '<div class="li-sub">' + a.why + '</div></td><td>' + a.eff + '</td><td>' + a.diff + '</td><td>' + a.eta + '</td></tr>').join('') +
    '</tbody></table></div></div>' +

    '<div class="card"><h3>🔁 改完复查</h3><div class="card-sub">优化闭环：做完上面的事 → 回顶栏点「重新检测」→ 看板会显示与上次的真实对比</div>' +
    '<div class="cols-2">' +
    '<div class="stat"><div class="label">优化前 AI 可见性</div><div class="value">' + d.geo.history[0] + '</div></div>' +
    '<div class="stat"><div class="label">当前 AI 可见性</div><div class="value" style="color:var(--violet-soft)">' + d.geo.overall + '</div></div></div>' +
    '<p class="small muted mt">ⓘ 演示环境说明：当前分数为按行业模拟生成的演示数据。接入真实 OpenSEO + GEO Tracker API 后，「重新检测」将拉取最新真实结果并自动对比。</p></div>';
}

function buildJsonLd(d, cfg) {
  const obj = {
    '@context': 'https://schema.org',
    '@type': cfg.schema,
    name: d.brand,
    url: 'https://' + d.domain,
    areaServed: d.city,
    description: d.brand + '，' + d.city + '本地' + cfg.short + '服务商。',
    address: { '@type': 'PostalAddress', addressLocality: d.city, addressCountry: 'CN' },
    makesOffer: cfg.services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })),
    mainEntity: cfg.faq.map(p => ({
      '@type': 'Question', name: p[0],
      acceptedAnswer: { '@type': 'Answer', text: p[1] }
    }))
  };
  return JSON.stringify(obj, null, 2);
}

/* 模块 E：报告与分享 */
function renderReport() {
  if (!state.data) { renderEmpty('view-report'); return; }
  const d = state.data, site = d.site, a = d.audit;
  const now = Date.now();
  const passN = a ? a.items.filter(i => i.status === 'pass').length : 0;
  const failN = a ? a.items.filter(i => i.status === 'fail').length : 0;
  const warnN = a ? a.items.filter(i => i.status === 'warn').length : 0;
  const blockedN = a ? a.items.filter(i => i.status === 'blocked').length : 0;

  $('view-report').innerHTML =
    '<div class="card" id="report-card">' +
    '<div class="flex" style="justify-content:space-between">' +
    '<div><h3 style="margin:0">📑 双引擎周报</h3><div class="card-sub">' + esc(d.brand) + ' · ' + esc(d.domain) + ' · 生成于 ' + fmtTime(now) + '</div></div>' +
    '<span class="tag-mini tag-geo">本周</span></div>' +
    '<div class="boss-view mt">' +
    '<div class="boss-num"><div class="b-label">谷歌最佳排名</div><div class="b-value cyan">第 ' + Math.min.apply(null, Object.values(d.seo.currentRank)) + ' 名</div></div>' +
    '<div class="boss-num"><div class="b-label">AI 可见性分</div><div class="b-value violet">' + d.geo.overall + '</div></div>' +
    '<div class="boss-num"><div class="b-label">技术就绪分</div><div class="b-value gold">' + (a && a.score !== null ? a.score : '—') + '</div></div></div>' +
    '<div class="summary-bar">' + d.summary + '</div>' +

    '<h4 style="margin:22px 0 8px;font-size:15px">🔎 数据来源与时间戳（哪些真实、哪些演示，一张表说清）</h4>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>数据块</th><th>来源</th><th>类型</th><th>时间</th></tr></thead><tbody>' +
    '<tr><td>技术就绪分 / llms.txt / robots.txt / sitemap / 首页元数据</td><td>浏览器直接请求你的站点</td><td><span class="tag-mini tag-green">真实抓取</span></td><td>' + (a ? fmtTime(a.at) : '—') + '</td></tr>' +
    '<tr><td>关键词搜索量 / 难度 / CPC</td><td>DataForSEO（演示）</td><td><span class="tag-mini tag-amber">演示数据</span></td><td>' + fmtTime(now) + '</td></tr>' +
    '<tr><td>Google 排名</td><td>OpenSEO（演示）</td><td><span class="tag-mini tag-amber">演示数据</span></td><td>' + fmtTime(now) + '</td></tr>' +
    '<tr><td>7 平台 AI 可见性 / 引用分析</td><td>GEO/AEO Tracker（演示）</td><td><span class="tag-mini tag-amber">演示数据</span></td><td>' + fmtTime(now) + '</td></tr>' +
    '</tbody></table></div>' +

    (a ? '<h4 style="margin:22px 0 8px;font-size:15px">🩺 站点体检摘要（真实抓取）</h4>' +
      '<div class="stat-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:10px">' +
      '<div class="stat"><div class="label">通过</div><div class="value" style="color:var(--green);font-size:24px">' + passN + '</div></div>' +
      '<div class="stat"><div class="label">待改进</div><div class="value" style="color:var(--amber);font-size:24px">' + warnN + '</div></div>' +
      '<div class="stat"><div class="label">未通过</div><div class="value" style="color:var(--red);font-size:24px">' + failN + '</div></div>' +
      '<div class="stat"><div class="label">读不到</div><div class="value" style="color:var(--muted);font-size:24px">' + blockedN + '</div></div>' +
      '<div class="stat"><div class="label">覆盖度</div><div class="value" style="font-size:24px">' + a.coverage + '%</div></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>检查项</th><th>结果</th><th>说明</th></tr></thead><tbody>' +
      a.items.map(i => '<tr><td>' + i.name + '</td><td>' + auditTag(i.status) + '</td><td class="small muted">' + i.detail + '</td></tr>').join('') +
      '</tbody></table></div>'
      : '<div class="v-warn mt">尚未进行真实抓取，可在「真实站点体检」页跑一次。</div>') +

    '<h4 style="margin:22px 0 8px;font-size:15px">🤖 7 平台得分（演示数据）</h4>' +
    barChart(d.geo.models.map(m => ({ label: m.name, value: m.score, color: m.mentioned ? '#8b5cf6' : '#475569' })), { h: 220 }) +

    '<h4 style="margin:22px 0 8px;font-size:15px">🕒 检测时间轴（累计 ' + ((site && site.history) ? site.history.length : 0) + ' 次）</h4>' +
    renderTimeline(site) +

    '<div class="copy-row mt">' +
    '<button class="btn btn-primary btn-sm" onclick="exportReport()">⬇️ 导出 HTML 周报（浅色 · 可直接打印/转 PDF）</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="exportCSV(\'all\')">⬇️ 导出全部数据 CSV</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="copyShareText()">📋 复制微信分享文案</button></div>' +
    hint('发给谁、怎么发', '导出后是一个浅色底的 HTML 文件，双击用浏览器打开 → Ctrl+P 可直接另存为 PDF 发给客户或老板。要发微信，点「复制分享文案」粘贴即可。') +
    '<p class="small muted mt">ⓘ 内测期暂不支持外部分享链接（避免伪造 URL），正式版将生成带鉴权的只读分享页。</p></div>';
}

/* 空状态兜底 */
function renderEmpty(viewId) {
  $(viewId).innerHTML = '<div class="card" style="text-align:center;padding:60px 20px">' +
    '<div style="font-size:40px;margin-bottom:12px">🛰️</div><h3>还没有检测数据</h3>' +
    '<p class="muted small mt">先填写你的网站信息，跑一次双引擎检测，这里就会出现数据。</p>' +
    '<button class="btn btn-primary btn-sm mt" onclick="resetScan()">去检测</button></div>';
}
function resetScan() {
  $('wb-content').classList.add('hidden');
  $('scan-form').classList.remove('hidden');
  setRoute('#/wb');
  window.scrollTo(0, 0);
  const m = mainEl(); if (m) m.scrollTop = 0;
}

/* ----------------------- 行动层交互 ----------------------- */
function toggleOpp(i, val) {
  const site = state.site; if (!site) return;
  if (!site.opps) return;
  site.opps[i].done = !!val;
  state.actionDone = site.opps.filter(o => o.done).length;
  upsertSite(site);
  countAction();
  toast(val ? '已标记完成（进度已保存）' : '已取消完成标记');
}
function removeOpp(i) {
  const site = state.site; if (!site || !site.opps) return;
  site.opps.splice(i, 1);
  upsertSite(site);
  state.data = composeData(site);
  renderGEO(); renderAction();
  toast('已删除该条，可随时再添加');
}
function addOpp() {
  const el = $('opp-new') || $('opp-new2');
  if (!el) return;
  const v = (el.value || '').trim();
  if (!v) { toast('请先输入内容'); el.focus(); return; }
  const site = state.site; if (!site) return;
  if (!site.opps) site.opps = [];
  site.opps.push({ url: v, reason: '你手动添加的引用机会', how: '针对该来源产出可被引用的内容，并在其中自然带上你的官网链接', done: false });
  el.value = '';
  upsertSite(site);
  state.data = composeData(site);
  renderGEO(); renderAction();
  toast('已添加，记得做完后回来勾选');
}
function countAction() {
  const boxes = document.querySelectorAll('#view-action input[type=checkbox]');
  let n = 0; boxes.forEach(b => { if (b.checked) n++; });
  state.actionDone = n;
  const elc = $('action-count'); if (elc) elc.textContent = '已完成 ' + n + ' / ' + boxes.length;
}
function addKeyword() {
  const el = $('kw-new'); if (!el) return;
  const v = (el.value || '').trim();
  if (!v) { toast('请输入一个关键词'); el.focus(); return; }
  const site = state.site; if (!site) return;
  if (!site.kws) site.kws = [];
  if (site.kws.some(k => k.kw === v)) { toast('这个词已经在列表里了'); return; }
  const h = hashStr(v);
  site.kws.push({ kw: v, vol: 300 + (h % 2200), diff: 25 + (h % 55), cpc: Math.round((1 + (h % 35) / 10) * 10) / 10, intent: '商业', custom: true, rank: 3 + (h % 45) });
  el.value = '';
  upsertSite(site);
  state.data = composeData(site);
  renderSEO();
  toast('已添加「' + v + '」（已保存到本地）');
}
function removeKeyword(i) {
  const site = state.site; if (!site || !site.kws) return;
  const k = state.data.seo.keywords[i];
  if (!k || !k.custom) { toast('行业模板关键词不支持删除'); return; }
  const idx = site.kws.findIndex(x => x.kw === k.kw);
  if (idx >= 0) site.kws.splice(idx, 1);
  upsertSite(site);
  state.data = composeData(site);
  renderSEO();
  toast('已删除「' + k.kw + '」');
}
function setCompetitor() {
  const el = $('comp-input'); if (!el) return;
  const v = (el.value || '').trim();
  const site = state.site; if (!site) return;
  site.competitor = v;
  upsertSite(site);
  state.data = composeData(site);
  renderGEO();
  toast(v ? '竞品已更新为「' + v + '」' : '已清空竞品名称');
}

/* llms.txt */
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
  toast('llms.txt 已生成 · 下一步点「下载 llms.txt」然后传到网站根目录');
}
function copyLLMs() {
  const v = $('llms-out').value;
  if (!v) { toast('请先生成 llms.txt'); return; }
  copyText(v, '已复制 llms.txt 内容');
}
function downloadLLMs() {
  const v = $('llms-out').value;
  if (!v) { toast('请先生成 llms.txt'); return; }
  downloadText('llms.txt', v, 'text/plain;charset=utf-8');
  toast('已下载 llms.txt，请上传到网站根目录');
}
async function verifyLLMs() {
  const d = state.data; if (!d) return;
  const url = 'https://' + d.domain + '/llms.txt';
  const box = $('llms-verify');
  if (box) box.innerHTML = '<span class="muted">正在检查 ' + esc(url) + ' …</span>';
  let html = '';
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) {
      const t = await r.text();
      const hasBrand = t.indexOf(d.brand) >= 0;
      html = '<div class="v-ok">✅ 文件已可公开访问（HTTP 200）。' +
        (hasBrand ? '内容里已包含你的品牌名「' + esc(d.brand) + '」——部署成功。' :
          '但内容里<b>没有找到品牌名「' + esc(d.brand) + '」</b>，可能部署的不是刚生成的文件，建议重新上传。') + '</div>';
    } else {
      html = '<div class="v-err">❌ 服务器返回 HTTP ' + r.status + '。说明文件还没放到正确位置——请确认它是放在网站<b>根目录</b>（与首页同级），而不是子文件夹里。</div>';
    }
  } catch (e) {
    html = '<div class="v-warn">⚠️ 浏览器跨域策略阻止了直接读取（<b>这是正常现象，不代表没部署</b>）。已为你打开验证链接，请在新窗口里看一眼：能看到你的 llms.txt 内容就算成功；显示 404 就说明还没传对位置。</div>';
    openUrlSafe(url);
  }
  // 顺带给出浏览器缓存提示
  if (box) box.innerHTML = html + '<div class="small muted mt">ⓘ 刚上传的文件可能有 CDN 缓存，等 1–5 分钟再验证一次。</div>';
}
function copyJSONLD() {
  const t = $('jsonld-out'); if (!t) return;
  copyText(t.textContent, '结构化数据代码已复制，贴到页面的 <head> 里即可');
}
function downloadJSONLD() {
  const t = $('jsonld-out'); if (!t) return;
  downloadText('schema-' + (state.data ? state.data.domain : 'site') + '.json', t.textContent, 'application/json;charset=utf-8');
  toast('已下载 JSON 文件');
}
function validateJSONLD() {
  const t = $('jsonld-out'); const box = $('jsonld-verify');
  if (!t || !box) return;
  try {
    const o = JSON.parse(t.textContent);
    box.innerHTML = '<div class="v-ok">✅ 格式校验通过。类型：' + esc(o['@type']) + '，包含 ' + (o.makesOffer ? o.makesOffer.length : 0) + ' 项服务、' + (o.mainEntity ? o.mainEntity.length : 0) + ' 组 FAQ。可以放心贴到页面里。</div>';
  } catch (e) {
    box.innerHTML = '<div class="v-err">❌ 格式有问题：' + esc(e.message) + '</div>';
  }
}
function openUrlSafe(url) {
  try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { toast('请手动复制链接打开：' + url); }
}
function copyText(text, okMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg || '已复制到剪贴板'))
      .catch(() => fallbackCopy(text, okMsg));
  } else { fallbackCopy(text, okMsg); }
}
function fallbackCopy(text, okMsg) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    toast(ok ? (okMsg || '已复制到剪贴板') : '复制失败，请手动选中复制');
  } catch (e) { toast('复制失败，请手动选中复制'); }
}
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ----------------------- 导出 ----------------------- */
function exportReport() {
  if (!state.data || !$('report-card')) return;
  const d = state.data;
  const opps = d.geo.opportunities || [];
  // 浅色版式，打印 / 转 PDF 友好
  const rows = [
    ['谷歌最佳排名', '第 ' + Math.min.apply(null, Object.values(d.seo.currentRank)) + ' 名'],
    ['AI 可见性分', d.geo.overall + ' / 100'],
    ['被引用域名', d.geo.citationDomains.filter(c => c.you).length + ' 个'],
    ['行动清单完成', opps.filter(o => o.done).length + ' / ' + opps.length]
  ];
  const kwRows = d.seo.keywords.map(k => '<tr><td>' + esc(k.kw) + '</td><td>' + k.vol.toLocaleString() + '</td><td>' + k.diff + '</td><td>¥' + Number(k.cpc).toFixed(1) + '</td></tr>').join('');
  const modelRows = d.geo.models.map(m => '<tr><td>' + esc(m.name) + '</td><td>' + m.score + '</td><td>' + (m.mentioned ? '已提及' : '未提及') + '</td><td>' + esc((m.citations || []).join('、') || '—') + '</td></tr>').join('');
  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<title>双引擎周报 - ' + esc(d.brand) + '</title>' +
    '<style>' +
    'body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#fff;color:#1a1c2b;padding:36px;max-width:800px;margin:auto;line-height:1.65}' +
    'h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #e6e8f0}' +
    '.meta{color:#7a7f96;font-size:13px;margin-bottom:22px}' +
    '.kpi{display:flex;gap:14px;flex-wrap:wrap;margin:18px 0}' +
    '.kpi div{flex:1;min-width:150px;border:1px solid #e6e8f0;border-radius:12px;padding:16px;background:#fafbff}' +
    '.kpi b{display:block;font-size:26px;font-weight:800;color:#0f766e;margin-top:4px}' +
    '.kpi span{font-size:12.5px;color:#7a7f96}' +
    'table{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px}' +
    'th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef0f6}' +
    'th{color:#7a7f96;font-weight:600;font-size:12.5px}' +
    'ul{margin:8px 0 0 18px}li{margin-bottom:6px;font-size:14px}' +
    '.note{margin-top:26px;padding-top:14px;border-top:1px dashed #dcdfe9;color:#8b90a8;font-size:12.5px}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h1>双引擎可见性周报</h1>' +
    '<div class="meta">' + esc(d.brand) + ' · ' + esc(d.domain) + ' · 行业：' + esc(d.industry) + ' · 生成时间：' + new Date().toLocaleString('zh-CN') + '</div>' +
    '<div class="kpi">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>' +
    '<h2>一句话总结</h2><p>' + d.summary.replace(/<span class="muted">[\s\S]*?<\/span>/, '').replace(/<\/?b>/g, '') + '</p>' +
    '<h2>各 AI 平台明细</h2><table><thead><tr><th>平台</th><th>得分</th><th>状态</th><th>引用来源</th></tr></thead><tbody>' + modelRows + '</tbody></table>' +
    '<h2>关键词表现</h2><table><thead><tr><th>关键词</th><th>月搜索量</th><th>难度</th><th>CPC</th></tr></thead><tbody>' + kwRows + '</tbody></table>' +
    '<h2>下一步行动清单</h2><ul>' + buildActionPlan(d).map(a => '<li><b>[' + a.prio + '] ' + a.t + '</b> —— ' + a.why + '（影响 ' + a.eff + ' / 难度 ' + a.diff + ' / 约 ' + a.eta + '）</li>').join('') + '</ul>' +
    '<div class="note">本报告由 光体•名无界 生成。当前为内测演示版，数据为按行业参数化生成的演示数据，不构成对真实网站的实际检测结论。技术底座：OpenSEO + GEO/AEO Tracker（均为 MIT 开源，自托管集成）。</div>' +
    '</body></html>';
  downloadText('双引擎周报_' + d.brand + '_' + new Date().toISOString().slice(0, 10) + '.html', html, 'text/html;charset=utf-8');
  toast('周报已导出（浅色版，双击打开后 Ctrl+P 可存为 PDF）');
}
function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCSV(scope) {
  if (!state.data) { toast('请先完成检测'); return; }
  const d = state.data;
  const lines = [];
  lines.push(['# 双引擎可见性数据导出', d.brand, d.domain, new Date().toLocaleString('zh-CN')].map(csvCell).join(','));
  lines.push('');
  if (scope === 'seo' || scope === 'all') {
    lines.push('【关键词研究】');
    lines.push(['关键词', '月搜索量', '难度', '难度评级', 'CPC(¥)', '搜索意图', '来源'].map(csvCell).join(','));
    d.seo.keywords.forEach(k => lines.push([k.kw, k.vol, k.diff, diffLevel(k.diff)[0], Number(k.cpc).toFixed(1), k.intent, k.custom ? '自建' : '行业模板'].map(csvCell).join(',')));
    lines.push('');
    lines.push('【当前排名】');
    lines.push(['关键词', '排名', '评级'].map(csvCell).join(','));
    Object.entries(d.seo.currentRank).forEach(([k, v]) => lines.push([k, v, rankLevel(v)[0]].map(csvCell).join(',')));
    lines.push('');
    lines.push('【外链锚文本】');
    lines.push(['锚文本', '数量'].map(csvCell).join(','));
    d.seo.backlinks.topAnchors.forEach(a => lines.push([a.a, a.n].map(csvCell).join(',')));
    lines.push('');
  }
  if (scope === 'all') {
    lines.push('【AI 平台可见性】');
    lines.push(['平台', '得分', '是否提及', '引用来源'].map(csvCell).join(','));
    d.geo.models.forEach(m => lines.push([m.name, m.score, m.mentioned ? '是' : '否', (m.citations || []).join(' / ')].map(csvCell).join(',')));
    lines.push('');
    lines.push('【引用域名】');
    lines.push(['域名', '被引次数', '归属'].map(csvCell).join(','));
    d.geo.citationDomains.forEach(c => lines.push([c.domain, c.count, c.you ? '你' : '竞品'].map(csvCell).join(',')));
    lines.push('');
    lines.push('【行动清单】');
    lines.push(['优先级', '动作', '原因', '影响', '难度', '预计耗时'].map(csvCell).join(','));
    buildActionPlan(d).forEach(a => lines.push([a.prio, a.t, a.why, a.eff, a.diff, a.eta].map(csvCell).join(',')));
    lines.push('');
    lines.push('【引用机会】');
    lines.push(['来源', '原因', '做法', '是否完成'].map(csvCell).join(','));
    (d.geo.opportunities || []).forEach(o => lines.push([o.url, o.reason, o.how || '', o.done ? '已完成' : '未完成'].map(csvCell).join(',')));
  }
  if (scope === 'audit' || scope === 'all') {
    const a = state.data.audit;
    lines.push('【真实站点体检】' + (a ? '抓取时间 ' + fmtTime(a.at) + '，技术就绪分 ' + (a.score === null ? '无法判定' : a.score) + '，覆盖度 ' + a.coverage + '%' : '尚未抓取'));
    lines.push(['检查项', '结果', '说明', '修复建议'].map(csvCell).join(','));
    if (a) a.items.forEach(it => lines.push([
      it.name,
      it.status === 'pass' ? '通过' : it.status === 'warn' ? '待改进' : it.status === 'fail' ? '未通过' : '无法读取',
      it.detail, it.fix || ''
    ].map(csvCell).join(',')));
    lines.push('');
  }
  if (scope === 'all') {
    lines.push('【检测时间轴】');
    lines.push(['检测时间', 'AI 可见性', '最佳排名', '技术就绪分', '抓取覆盖度%'].map(csvCell).join(','));
    ((state.data.site && state.data.site.history) || []).forEach(h => lines.push([
      fmtTime(h.t), h.overall, h.rank, (h.tech === null || h.tech === undefined) ? '' : h.tech, h.coverage || 0
    ].map(csvCell).join(',')));
    lines.push('');
  }
  downloadText('名无界数据_' + d.domain + '_' + new Date().toISOString().slice(0, 10) + '.csv',
    '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8');
  toast('CSV 已导出（含 BOM，Excel 打开中文不乱码）');
}
function copyShareText() {
  if (!state.data) return;
  const d = state.data;
  const opps = d.geo.opportunities || [];
  const t = '【双引擎可见性周报】' + d.brand + '（' + d.domain + '）\n' +
    '· 谷歌最佳排名：第 ' + Math.min.apply(null, Object.values(d.seo.currentRank)) + ' 名\n' +
    '· AI 可见性分：' + d.geo.overall + ' / 100（7 个 AI 平台综合）\n' +
    '· 被 AI 引用来源：' + d.geo.citationDomains.filter(c => c.you).length + ' 个\n' +
    '· 行动清单进度：' + opps.filter(o => o.done).length + ' / ' + opps.length + '\n\n' +
    '本周最该先做的一件事：生成并部署 llms.txt（约 10 分钟）。\n' +
    '—— 由 光体•名无界 生成（内测演示数据）';
  copyText(t, '分享文案已复制，可直接粘贴到微信/钉钉');
}

/* ----------------------- 弹窗（套餐 / 法务 / 方法论 / 术语） ----------------------- */
function selectPlan(key) {
  const p = PLANS[key];
  if (!p) return;
  $('modal-body').innerHTML =
    '<div class="modal-kicker">选择套餐</div>' +
    '<h3 style="margin:8px 0 2px">' + p.name + '</h3>' +
    '<div class="modal-price">' + p.price + '</div>' +
    '<ul class="modal-list">' + p.items.map(i => '<li><span>✓</span>' + esc(i) + '</li>').join('') + '</ul>' +
    '<div class="pay-note"><span class="pay-chip">💳 微信支付</span><span class="pay-chip">💰 支付宝</span><span class="pay-chip">🏦 对公转账</span></div>' +
    '<p class="small muted mt">' + esc(p.note) + '</p>' +
    '<p class="small muted">内测期支付通道尚未开通：点击下方按钮即视为预约席位，正式上线前 48 小时通知你再决定是否付费，期间一切功能免费。</p>' +
    '<div class="copy-row"><button class="btn btn-primary" onclick="reservePlan(\'' + key + '\')">' + esc(p.cta) + '</button>' +
    '<button class="btn btn-ghost" onclick="closeModal()">再想想</button></div>';
  openModalUI();
}
function reservePlan(key) {
  closeModal();
  toast('已预约「' + PLANS[key].name + '」席位（内测免费）→ 正在打开工作台');
  openWorkbench();
}
function openLegal(kind) {
  $('modal-body').innerHTML = LEGAL[kind] || '';
  openModalUI();
}
function openMethodology() {
  $('modal-body').innerHTML = '<h3 style="margin-bottom:12px">AI 可见性分 · 评分口径</h3>' +
    '<p class="small muted" style="line-height:1.8">' +
    '对 <b style="color:var(--text)">7 个 AI 平台</b>（ChatGPT / 豆包 / Perplexity / Gemini / Copilot / Grok / Google AI Overviews）逐一发起你所在行业的真实用户问句，每个平台按：<br><br>' +
    '· 品牌是否被提及 —— 权重 <b style="color:var(--cyan-soft)">50%</b><br>' +
    '· 是否引用你的域名 / 内容 —— 权重 <b style="color:var(--cyan-soft)">30%</b><br>' +
    '· 提及排位（越靠前分越高）—— 权重 <b style="color:var(--cyan-soft)">20%</b><br><br>' +
    '加权得出单平台得分（0–100），再取 7 平台平均值即总分。所有明细在工作台「AI 搜索 GEO」可逐项查看。<br><br>' +
    '<b style="color:var(--text)">为什么公开口径：</b>市面上 GEO 工具普遍不告诉你分数怎么来的。我们认为只有口径透明，你才能判断这个分数的变化是否值得信。</p>';
  openModalUI();
}
function openTerm(key) {
  const g = GLOSSARY[key];
  if (!g) { toast('暂未收录该术语，可在页面底部「术语表」查看全部'); return; }
  $('modal-body').innerHTML = '<div class="modal-kicker">术语解释</div>' +
    '<h3 style="margin:8px 0 4px">' + esc(key) + '</h3>' +
    '<div class="card-sub" style="margin-bottom:14px">' + esc(g.t) + '</div>' +
    '<p style="font-size:14.5px;line-height:1.85">' + esc(g.d) + '</p>' +
    '<div class="copy-row"><button class="btn btn-ghost btn-sm" onclick="closeModal()">知道了</button></div>';
  openModalUI();
}
function openHelp() {
  $('modal-body').innerHTML = '<div class="modal-kicker">需要帮助</div>' +
    '<h3 style="margin:8px 0 10px">联系我们</h3>' +
    '<p class="small muted" style="line-height:1.9">' +
    '· <b style="color:var(--text)">产品与商务：</b>通过页脚 GitHub 仓库提 Issue，或在工作台内留言（正式版开放）<br>' +
    '· <b style="color:var(--text)">想直接上手：</b>建议先点「免费自检」跑一次，再按「行动优化」的三步走<br>' +
    '· <b style="color:var(--text)">技术底座：</b><a class="inline-link" href="https://github.com/GT-AI-3396815/mingwujie" target="_blank" rel="noopener">本项目仓库</a> · OpenSEO · GEO/AEO Tracker（均为 MIT 开源）<br><br>' +
    '<b style="color:var(--text)">内测期响应：</b>工作日 24 小时内回复。正式版将提供微信客服与电话支持。</p>' +
    '<div class="copy-row"><button class="btn btn-ghost btn-sm" onclick="closeModal()">关闭</button></div>';
  openModalUI();
}
/* 无障碍：可聚焦元素收集 + 弹窗焦点陷阱 */
function focusables(root) {
  if (!root || !root.querySelectorAll) return [];
  const sel = 'button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';
  let list = [];
  try { list = Array.prototype.slice.call(root.querySelectorAll(sel)); } catch (e) { list = []; }
  return list.filter(function (el) { return !el.disabled && el.offsetParent !== null; });
}
function openModalUI() {
  const m = $('modal'); if (!m) return;
  if (!state.lastFocus) state.lastFocus = document.activeElement;
  m.classList.remove('hidden');
  setTimeout(function () {
    const f = focusables(m);
    if (f.length) { try { f[0].focus(); } catch (e) { } }
  }, 30);
}
function closeModal() {
  const m = $('modal'); if (m) m.classList.add('hidden');
  const back = state.lastFocus;
  state.lastFocus = null;
  if (back && back.focus) { try { back.focus(); } catch (e) { } }
}
function trapTab(e) {
  const m = $('modal');
  if (!m || m.classList.contains('hidden')) return false;
  const f = focusables(m);
  if (f.length < 2) return false;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); return true; }
  if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); return true; }
  return false;
}

/* toast 队列：多条提示依次显示，不再互相打断 */
let toastQ = [], toastBusy = false;
function toast(msg) {
  toastQ.push(msg);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = $('toast'); if (!t) { toastBusy = false; toastQ = []; return; }
  if (!toastQ.length) { toastBusy = false; t.classList.remove('show'); return; }
  toastBusy = true;
  t.textContent = toastQ.shift();
  t.classList.add('show');
  setTimeout(function () {
    t.classList.remove('show');
    setTimeout(nextToast, 240);
  }, 2800);
}

/* 回到顶部 */
function initScrollTop() {
  const m = mainEl();
  const btn = $('toTop');
  if (!btn) return;
  const onScroll = () => {
    const y = (m && m.scrollHeight > m.clientHeight + 8) ? m.scrollTop : (window.scrollY || 0);
    btn.classList.toggle('hidden', y < 420);
  };
  if (m && m.addEventListener) m.addEventListener('scroll', onScroll, { passive: true });
  if (window.addEventListener) window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
function scrollTopNow() {
  const m = mainEl();
  if (m && m.scrollHeight > m.clientHeight + 8 && m.scrollTo) m.scrollTo({ top: 0, behavior: 'smooth' });
  else if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------- 启动 ----------------------- */
window.addEventListener('DOMContentLoaded', () => {
  // 事件绑定
  document.querySelectorAll('[data-open-wb]').forEach(b => b.addEventListener('click', () => openWorkbench()));
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.view)));
  document.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => selectPlan(b.dataset.plan)));
  document.querySelectorAll('[data-legal]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openLegal(b.dataset.legal); }));
  document.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openHelp(); }));
  // 术语：全局委托，点击任意 .term 打开词典
  document.addEventListener('click', (e) => {
    const el = e.target.closest ? e.target.closest('.term') : null;
    if (el) { e.preventDefault(); openTerm(el.dataset.term); }
  });
  const form = $('scan-form-el'); if (form) form.addEventListener('submit', runScan);
  const bt = $('bossToggle'); if (bt) bt.addEventListener('click', toggleBoss);
  const dl = $('f-domain'); if (dl) dl.addEventListener('input', () => validateDomain(true));
  const ss = $('siteSelect'); if (ss) ss.addEventListener('change', () => switchSite(ss.value));
  const tb = $('toTop'); // 滚动按钮由 initScrollTop 控制显隐

  // 键盘：Esc 关弹窗、Tab 在弹窗内循环
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('modal').classList.contains('hidden')) closeModal(); return; }
    if (e.key === 'Tab') trapTab(e);
  });

  // 路由：浏览器前进 / 后退
  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('popstate', applyRoute);

  // 恢复上次检测（刷新不丢数据、也不丢当前页面）
  const has = loadStore();
  renderSites();
  if (has && store.current) {
    const site = getSite(store.current);
    if (site) {
      state.site = site;
      state.data = composeData(site);
      state.loaded = true;
      state.actionDone = (site.checks || []).filter(Boolean).length;
      syncForm(site);
      $('wb-domain').textContent = state.data.domain;
      $('wb-brand').textContent = state.data.brand;
      $('scan-form').classList.add('hidden');
      $('wb-content').classList.remove('hidden');
      showDemoMarks(site.audit);
      renderAll();
      const back = $('resumeBar');
      if (back) {
        back.classList.remove('hidden');
        back.querySelector('b').textContent = state.data.brand || state.data.domain;
      }
    }
  }
  // 按当前地址决定落地页还是工作台（支持刷新后停留原视图）
  applyRoute();
  initScrollTop();
});

/* 供 HTML 内联事件使用 */
window.openWorkbench = openWorkbench; window.backToLanding = backToLanding; window.switchTab = switchTab;
window.toggleBoss = toggleBoss; window.runScan = runScan; window.cancelScan = cancelScan;
window.exportReport = exportReport; window.exportCSV = exportCSV; window.copyShareText = copyShareText;
window.genLLMs = genLLMs; window.copyLLMs = copyLLMs; window.downloadLLMs = downloadLLMs; window.verifyLLMs = verifyLLMs;
window.copyJSONLD = copyJSONLD; window.downloadJSONLD = downloadJSONLD; window.validateJSONLD = validateJSONLD;
window.addKeyword = addKeyword; window.removeKeyword = removeKeyword; window.setCompetitor = setCompetitor;
window.addOpp = addOpp; window.removeOpp = removeOpp; window.toggleOpp = toggleOpp; window.countAction = countAction;
window.selectPlan = selectPlan; window.reservePlan = reservePlan; window.openLegal = openLegal;
window.openMethodology = openMethodology; window.openTerm = openTerm; window.openHelp = openHelp; window.closeModal = closeModal;
window.fillSample = fillSample; window.resetScan = resetScan; window.switchSite = switchSite;
window.removeCurrentSite = removeCurrentSite; window.clearAllData = clearAllData; window.copyText = copyText;
window.openUrlSafe = openUrlSafe;
window.rerunAudit = rerunAudit; window.pasteAuditLLMs = pasteAuditLLMs; window.pasteAuditRobots = pasteAuditRobots;
window.pasteAuditHtml = pasteAuditHtml; window.scrollTopNow = scrollTopNow;
window.renderAll = renderAll; window.renderCurrent = renderCurrent; window.switchSite = switchSite;
