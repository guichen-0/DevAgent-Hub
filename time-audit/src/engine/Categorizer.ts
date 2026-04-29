import type { RawActivityEntry } from '../types.js';

interface CategoryRule {
  pattern: RegExp;
  category: string;
  subcategory: string;
}

// ─── Comprehensive Browser Rules ───

const BROWSER_RULES: CategoryRule[] = [
  // ── Development: Coding / Code Review ──
  { pattern: /github\.com|gitlab\.com|bitbucket\.org|gitee\.com/, category: 'Development', subcategory: 'Code Review' },
  { pattern: /git\./i, category: 'Development', subcategory: 'Git' },

  // ── Development: Research / Docs ──
  { pattern: /stackoverflow\.com|stackexchange\.com/, category: 'Development', subcategory: 'Tech Research' },
  { pattern: /developer\.mozilla\.org|docs\.microsoft\.com|docs\.github\.com|devdocs\.io/, category: 'Development', subcategory: 'Documentation' },
  { pattern: /developer\./i, category: 'Development', subcategory: 'Documentation' },
  { pattern: /npmjs\.com|pypi\.org|crates\.io|maven\.io|mvnrepository\.com/, category: 'Development', subcategory: 'Packages' },
  { pattern: /caniuse\.com|mdn\./i, category: 'Development', subcategory: 'Web Dev' },
  { pattern: /leetcode\.com|codeforces\.com|codewars\.com/, category: 'Development', subcategory: 'Coding Practice' },

  // ── Development: AI Assistant ──
  { pattern: /chatgpt\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com|bard\.google\.com/, category: 'Development', subcategory: 'AI Assistant' },
  { pattern: /copilot\.github\.com|perplexity\.ai/, category: 'Development', subcategory: 'AI Assistant' },
  { pattern: /cursor\.so|windsurf\.ai/, category: 'Development', subcategory: 'AI Assistant' },

  // ── Development: Local / Servers ──
  { pattern: /localhost|127\.0\.0\.1|0\.0\.0\.0/, category: 'Development', subcategory: 'Local Dev' },
  { pattern: /vercel\.app|netlify\.app|herokuapp\.com|railway\.app|fly\.io/, category: 'Development', subcategory: 'Deployment' },
  { pattern: /aws\.amazon\.com|console\.aws|cloud\.google|azure\.microsoft/, category: 'Development', subcategory: 'Cloud' },

  // ── Development: Chinese Tech ──
  { pattern: /csdn\.net|cnblogs\.com|juejin\.cn|juejin\.im|oschina\.net/, category: 'Development', subcategory: 'Tech Community' },
  { pattern: /segmentfault\.com|v2ex\.com|infoq\.cn/, category: 'Development', subcategory: 'Tech Community' },
  { pattern: /zhuanlan\.zhihu\.com.*(?:python|java|前端|后端|编程|代码|算法|数据库)/i, category: 'Development', subcategory: 'Tech Reading' },
  { pattern: /ruanyifeng\.com|zhangxinxu\.com/, category: 'Development', subcategory: 'Tech Blog' },

  // ── Development: Package / CI ──
  { pattern: /docker\.com|hub\.docker|docker\.io/, category: 'Development', subcategory: 'Docker' },
  { pattern: /jenkins\.io|github\.actions|circleci\.com|travis-ci\./, category: 'Development', subcategory: 'CI/CD' },
  { pattern: /stackblitz\.com|codesandbox\.io|replit\.com|glitch\.com/, category: 'Development', subcategory: 'Online IDE' },

  // ── Communication ──
  { pattern: /mail\.google\.com|outlook\.live|outlook\.office|mail\.qq\.com|mail\.163\.com/, category: 'Communication', subcategory: 'Email' },
  { pattern: /slack\.com|discord\.com|discord\.gg|teams\.microsoft\.com|mattermost/, category: 'Communication', subcategory: 'Chat' },
  { pattern: /messenger\.com|telegram\.org|t\.me|whatsapp\.com/, category: 'Communication', subcategory: 'Messaging' },
  { pattern: /weixin\.qq\.com|work\.weixin\.qq|wx\.qq\.com/, category: 'Communication', subcategory: 'WeChat' },
  { pattern: /dingtalk\.com|lark\.io|feishu\.cn/, category: 'Communication', subcategory: 'Work Chat' },
  { pattern: /zoom\.us|meet\.google\.com|meeting\.tencent\.com/, category: 'Communication', subcategory: 'Meetings' },

  // ── Social Media ──
  { pattern: /twitter\.com|x\.com/, category: 'Social', subcategory: 'Twitter' },
  { pattern: /reddit\.com/, category: 'Social', subcategory: 'Reddit' },
  { pattern: /zhihu\.com/, category: 'Social', subcategory: 'Zhihu' },
  { pattern: /weibo\.com|xiaohongshu\.com|xiaohongshu\.cn/, category: 'Social', subcategory: 'Social Media' },
  { pattern: /douban\.com/, category: 'Social', subcategory: 'Douban' },
  { pattern: /tieba\.baidu\.com/, category: 'Social', subcategory: 'Baidu Tieba' },
  { pattern: /bbs\.|forum\./i, category: 'Social', subcategory: 'Forum' },
  { pattern: /linkedin\.com/, category: 'Social', subcategory: 'LinkedIn' },
  { pattern: /instagram\.com|facebook\.com|fb\.com/, category: 'Social', subcategory: 'Social Media' },
  { pattern: /pinterest\.com|tumblr\.com/, category: 'Social', subcategory: 'Social Media' },

  // ── Entertainment: Video ──
  { pattern: /youtube\.com|youtu\.be/, category: 'Entertainment', subcategory: 'YouTube' },
  { pattern: /bilibili\.com|b23\.tv/, category: 'Entertainment', subcategory: 'Bilibili' },
  { pattern: /iqiyi\.com|youku\.com|tencent\.com\/v|v\.qq\.com/, category: 'Entertainment', subcategory: 'Video' },
  { pattern: /douyu\.com|huya\.com|twitch\.tv/, category: 'Entertainment', subcategory: 'Live Stream' },

  // ── Entertainment: Audio ──
  { pattern: /spotify\.com|music\.163\.com|kugou\.com|kuwo\.cn|qq\.com\/music/, category: 'Entertainment', subcategory: 'Music' },
  { pattern: /netease\.com\/music|xiaomi\.com\/music/, category: 'Entertainment', subcategory: 'Music' },
  { pattern: /podcasts\.google|podcasts\.apple|xiaoyuzhou\.fm/, category: 'Entertainment', subcategory: 'Podcast' },

  // ── Entertainment: Reading ──
  { pattern: /zhihu\.com\/?$|zhihu\.com\/topic/, category: 'Entertainment', subcategory: 'Reading' },
  { pattern: /medium\.com|zhuanlan\.zhihu\.com/, category: 'Entertainment', subcategory: 'Reading' },
  { pattern: /jianshu\.com/, category: 'Entertainment', subcategory: 'Reading' },
  { pattern: /manhua|dmzj|ac\.qq\.com/, category: 'Entertainment', subcategory: 'Comic' },
  { pattern: /novel|xiaoshuo|book\./i, category: 'Entertainment', subcategory: 'Reading' },

  // ── Entertainment: Gaming ──
  { pattern: /steamcommunity\.com|steampowered\.com/, category: 'Entertainment', subcategory: 'Gaming' },
  { pattern: /epicgames\.com|gog\.com|xbox\.com|playstation\.com/, category: 'Entertainment', subcategory: 'Gaming' },
  { pattern: /game\.|gamer\./i, category: 'Entertainment', subcategory: 'Gaming' },

  // ── News ──
  { pattern: /news\.\w+|\/news\//i, category: 'News', subcategory: 'News' },
  { pattern: /cnn\.com|bbc\.com|nytimes\.com|theguardian\.com/, category: 'News', subcategory: 'International' },
  { pattern: /thepaper\.cn|sohu\.com\/news|163\.com\/news|sina\.com\.cn/, category: 'News', subcategory: 'Chinese News' },
  { pattern: /hackernews|news\.ycombinator\.com/, category: 'News', subcategory: 'Tech News' },
  { pattern: /36kr\.com|huxiu\.com|latepost\.com|geekpark\.net/, category: 'News', subcategory: 'Tech News' },
  { pattern: /solidot\.org|solidot\./, category: 'News', subcategory: 'Tech News' },

  // ── Shopping ──
  { pattern: /taobao\.com|tmall\.com|jd\.com|pinduoduo\.com/, category: 'Shopping', subcategory: 'Online Shopping' },
  { pattern: /amazon\.\w+/, category: 'Shopping', subcategory: 'Amazon' },
  { pattern: /ebay\.com|shop\./i, category: 'Shopping', subcategory: 'Online Shopping' },
  { pattern: /dianping\.com|meituan\.com/, category: 'Shopping', subcategory: 'Local Services' },
  { pattern: /suning\.com|yihaodian/, category: 'Shopping', subcategory: 'Online Shopping' },

  // ── Finance ──
  { pattern: /bank|支付宝|alipay|paypal|stripe/i, category: 'Finance', subcategory: 'Payment' },
  { pattern: /alipay\.com/, category: 'Finance', subcategory: 'Alipay' },
  { pattern: /stock|finance|fund|invest/i, category: 'Finance', subcategory: 'Investment' },
  { pattern: /xueqiu\.com|eastmoney\.com/, category: 'Finance', subcategory: 'Investment' },
  { pattern: /coinmarketcap|coingecko|binance\.com|okx\.com/, category: 'Finance', subcategory: 'Crypto' },

  // ── Productivity ──
  { pattern: /notion\.so|notion\.site|evernote\.com|onenote/, category: 'Productivity', subcategory: 'Notes' },
  { pattern: /miro\.com|figma\.com|canva\.com|excalidraw\.com/, category: 'Productivity', subcategory: 'Design Tools' },
  { pattern: /trello\.com|asana\.com|notion.*task|linear\.app/, category: 'Productivity', subcategory: 'Task Management' },
  { pattern: /google\.com\/calendar|calendar\.google/, category: 'Productivity', subcategory: 'Calendar' },
  { pattern: /drive\.google\.com|dropbox\.com|box\.com|icloud\.com/, category: 'Productivity', subcategory: 'Cloud Storage' },
  { pattern: /pan\.baidu\.com|aliyundrive\.com|123pan\.com/, category: 'Productivity', subcategory: 'Cloud Storage' },
  { pattern: /translate\.google|deepl\.com|fanyi\.baidu\.com/, category: 'Productivity', subcategory: 'Translation' },

  // ── Education ──
  { pattern: /coursera\.org|udemy\.com|udacity\.com|edx\.org/, category: 'Education', subcategory: 'Online Course' },
  { pattern: /youtube.*(?:tutorial|course|lecture|lesson|learn)/i, category: 'Education', subcategory: 'Learning' },
  { pattern: /wikipedia\.org|wiki\./i, category: 'Education', subcategory: 'Reference' },
  { pattern: /baike\.baidu\.com/, category: 'Education', subcategory: 'Reference' },
  { pattern: /stackexchange|mathoverflow/, category: 'Education', subcategory: 'Q&A' },
  { pattern: /academic|scholar|researchgate|arxiv/, category: 'Education', subcategory: 'Academic Research' },

  // ── Travel & Local ──
  { pattern: /maps\.google|ditu\.baidu\.com|amap\.com|gaode\.com/, category: 'Travel', subcategory: 'Maps' },
  { pattern: /ctrip\.com|trip\.com|booking\.com|airbnb\.com/, category: 'Travel', subcategory: 'Travel Booking' },
  { pattern: /dianping\.com|大众点评/i, category: 'Travel', subcategory: 'Restaurants' },
  { pattern: /12306\.cn/, category: 'Travel', subcategory: 'Train' },
  { pattern: /fliggy|去哪|飞猪/i, category: 'Travel', subcategory: 'Travel' },

  // ── Search Engines ──
  { pattern: /google\.com\/search|google\.\w+\/search/, category: 'Search', subcategory: 'Google Search' },
  { pattern: /baidu\.com\/s|baidu\.com\/search/, category: 'Search', subcategory: 'Baidu Search' },
  { pattern: /bing\.com\/search|sogou\.com\/search/, category: 'Search', subcategory: 'Search Engine' },
  { pattern: /duckduckgo\.com/, category: 'Search', subcategory: 'Search Engine' },
];

// ─── Comprehensive File Rules ───

const FILE_RULES: CategoryRule[] = [
  // Languages
  { pattern: /\.(ts|tsx)$/i, category: 'Development', subcategory: 'TypeScript' },
  { pattern: /\.(js|jsx|mjs|cjs)$/i, category: 'Development', subcategory: 'JavaScript' },
  { pattern: /\.py$/i, category: 'Development', subcategory: 'Python' },
  { pattern: /\.(go|go\.mod|go\.sum)$/i, category: 'Development', subcategory: 'Go' },
  { pattern: /\.(rs|rlib)$/i, category: 'Development', subcategory: 'Rust' },
  { pattern: /\.java$/i, category: 'Development', subcategory: 'Java' },
  { pattern: /\.(cpp|cxx|cc|c|h|hpp)$/i, category: 'Development', subcategory: 'C/C++' },
  { pattern: /\.rb$/i, category: 'Development', subcategory: 'Ruby' },
  { pattern: /\.php$/i, category: 'Development', subcategory: 'PHP' },
  { pattern: /\.(cs|fs)$/i, category: 'Development', subcategory: '.NET' },
  { pattern: /\.swift$/i, category: 'Development', subcategory: 'Swift' },
  { pattern: /\.kt$/i, category: 'Development', subcategory: 'Kotlin' },
  { pattern: /\.dart$/i, category: 'Development', subcategory: 'Dart' },
  { pattern: /\.lua$/i, category: 'Development', subcategory: 'Lua' },
  { pattern: /\.sql$/i, category: 'Development', subcategory: 'SQL' },
  { pattern: /\.sh|\.bash|\.zsh|\.ps1$/i, category: 'Development', subcategory: 'Shell Script' },

  // Testing
  { pattern: /\.(test|spec|e2e|cy)\.[jt]sx?$/i, category: 'Development', subcategory: 'Testing' },
  { pattern: /__tests__|__mocks__/i, category: 'Development', subcategory: 'Testing' },
  { pattern: /\.(jest|vitest|mocha|cypress)\./i, category: 'Development', subcategory: 'Testing Config' },
  { pattern: /\.test\./i, category: 'Development', subcategory: 'Testing' },
  { pattern: /\.spec\./i, category: 'Development', subcategory: 'Testing' },

  // Frontend
  { pattern: /\.(css|scss|sass|less|styl)$/i, category: 'Development', subcategory: 'Styles' },
  { pattern: /\.html?$/i, category: 'Development', subcategory: 'HTML' },
  { pattern: /\.vue$/i, category: 'Development', subcategory: 'Vue' },
  { pattern: /\.svelte$/i, category: 'Development', subcategory: 'Svelte' },
  { pattern: /\.astro$/i, category: 'Development', subcategory: 'Astro' },
  { pattern: /tailwind\.config|postcss\.config/i, category: 'Development', subcategory: 'CSS Config' },

  // Config / Build
  { pattern: /\.(json|ya?ml|toml|xml|ini|conf|env)$/i, category: 'Development', subcategory: 'Config' },
  { pattern: /\.(eslint|prettier|babel|webpack|vite|rollup)\./i, category: 'Development', subcategory: 'Build Config' },
  { pattern: /package\.json|tsconfig\.json|\.npmrc/i, category: 'Development', subcategory: 'Project Config' },
  { pattern: /dockerfile|\.dockerignore|docker-compose\./i, category: 'Development', subcategory: 'Docker' },
  { pattern: /\.github\/|\.gitlab-ci|\.gitignore|\.gitattributes/i, category: 'Development', subcategory: 'CI/Config' },
  { pattern: /makefile|cmakelists/i, category: 'Development', subcategory: 'Build' },

  // Documentation
  { pattern: /\.(md|mdx|rst|adoc|txt|pdf)$/i, category: 'Development', subcategory: 'Documentation' },
  { pattern: /readme|changelog|contributing|license/i, category: 'Development', subcategory: 'Project Docs' },

  // Data
  { pattern: /\.(csv|tsv|xlsx?|jsonl)$/i, category: 'Development', subcategory: 'Data' },
  { pattern: /\.(graphql|gql)$/i, category: 'Development', subcategory: 'API' },
  { pattern: /\.(proto|thrift)$/i, category: 'Development', subcategory: 'API Schema' },

  // Design Assets
  { pattern: /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i, category: 'Design', subcategory: 'Images' },
  { pattern: /\.(psd|ai|sketch|fig|xd)$/i, category: 'Design', subcategory: 'Design Files' },
  { pattern: /\.(mp4|webm|mov|avi)$/i, category: 'Design', subcategory: 'Video' },
  { pattern: /\.(mp3|wav|flac|aac|ogg)$/i, category: 'Entertainment', subcategory: 'Audio' },

  // Unrecognized code files default to Coding
  { pattern: /\.\w+$/i, category: 'Development', subcategory: 'Coding' },
];

// ─── Git Rules ───

function categorizeGit(entry: RawActivityEntry): { category: string; subcategory: string } {
  const msg = (entry.metadata?.message as string) || entry.title || '';
  const detail = entry.detail || '';

  if (/fix|bug|hotfix|patch|issue|error/i.test(msg)) return { category: 'Development', subcategory: 'Bug Fix' };
  if (/feat|feature|add|new|implement/i.test(msg)) return { category: 'Development', subcategory: 'New Feature' };
  if (/refactor|rewrite|clean|simplify|reorganize/i.test(msg)) return { category: 'Development', subcategory: 'Refactor' };
  if (/docs|readme|comment|typo/i.test(msg)) return { category: 'Development', subcategory: 'Documentation' };
  if (/test|spec|mock/i.test(msg)) return { category: 'Development', subcategory: 'Testing' };
  if (/style|format|lint|prettier/i.test(msg)) return { category: 'Development', subcategory: 'Code Style' };
  if (/dep|upgrade|update|bump|version/i.test(msg)) return { category: 'Development', subcategory: 'Dependencies' };
  if (/config|conf|setting|env/i.test(msg)) return { category: 'Development', subcategory: 'Config' };
  if (/merge|branch|pr|pull/i.test(msg)) return { category: 'Development', subcategory: 'Merge' };
  if (/perf|performance|optimize|speed/i.test(msg)) return { category: 'Development', subcategory: 'Performance' };
  if (/ci|cd|deploy|release|build/i.test(msg)) return { category: 'Development', subcategory: 'CI/CD' };

  return { category: 'Development', subcategory: 'Git Commit' };
}

// ─── Main Categorize Function ───

export function categorize(entry: RawActivityEntry): { category: string; subcategory: string } {
  if (entry.category && entry.subcategory && entry.subcategory !== 'Other') {
    return { category: entry.category, subcategory: entry.subcategory };
  }

  switch (entry.source) {
    case 'browser':
      return categorizeByRules(entry.detail, BROWSER_RULES);
    case 'git':
      return categorizeGit(entry);
    case 'vscode':
      return { category: 'Development', subcategory: 'Coding' };
    case 'filesystem':
      return categorizeByRules(entry.detail, FILE_RULES);
    default:
      return { category: 'Uncategorized', subcategory: 'Other' };
  }
}

function categorizeByRules(text: string, rules: CategoryRule[]): { category: string; subcategory: string } {
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }
  return { category: 'Uncategorized', subcategory: 'Other' };
}
