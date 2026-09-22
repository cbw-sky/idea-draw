// ═══ 灵感老虎机本地存储 ═══

export interface DrawRecord {
  id: string;
  words: string[];           // 抽到的关键词
  poolSnapshot?: string[];   // 抽取时的关键词池快照
  source: 'pool' | 'theme';
  sourceName?: string;      // 主题名（如果是主题生成）
  createdAt: number;
}

export interface Theme {
  id: string;
  name: string;
  words: string[];
  createdAt: number;
}

const KEYWORDS_KEY = 'inspire-keywords';
const THEMES_KEY = 'inspire-themes';
const HISTORY_KEY = 'inspire-history';

// ── 关键词池 ──
export function loadKeywords(): string[] {
  try {
    const data = localStorage.getItem(KEYWORDS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load keywords:', e);
  }
  return [];
}

export function saveKeywords(words: string[]): void {
  try {
    localStorage.setItem(KEYWORDS_KEY, JSON.stringify(words));
  } catch (e) {
    console.error('Failed to save keywords:', e);
  }
}

// ── 主题库 ──
export function loadThemes(): Theme[] {
  try {
    const data = localStorage.getItem(THEMES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load themes:', e);
  }
  return [];
}

export function saveThemes(themes: Theme[]): void {
  try {
    localStorage.setItem(THEMES_KEY, JSON.stringify(themes));
  } catch (e) {
    console.error('Failed to save themes:', e);
  }
}

// ── 抽取历史 ──
export function loadHistory(): DrawRecord[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [];
}

export function saveHistory(records: DrawRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function addHistoryRecord(record: DrawRecord): DrawRecord[] {
  const records = loadHistory();
  records.unshift(record);
  // 限制最多保留 200 条
  const trimmed = records.slice(0, 200);
  saveHistory(trimmed);
  return trimmed;
}

export function clearHistory(): void {
  saveHistory([]);
}

export function removeHistoryRecord(id: string): DrawRecord[] {
  const records = loadHistory().filter(r => r.id !== id);
  saveHistory(records);
  return records;
}

// ── 工具函数 ──
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return '昨天';
  if (days < 7) return days + '天前';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── 默认主题（首次使用时填充）──
export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'default-1',
    name: '自然风光',
    words: ['山川', '河流', '森林', '海洋', '星空', '月光', '风暴', '黎明', '黄昏', '雪原', '沙漠', '彩虹', '闪电', '迷雾', '花海', '悬崖', '溪流', '日出', '落叶', '浮云', '苔藓', '雨后', '潮汐', '极光', '薄雾'],
    createdAt: Date.now(),
  },
  {
    id: 'default-2',
    name: '情感心理',
    words: ['孤独', '渴望', '狂喜', '忧伤', '愤怒', '温柔', '恐惧', '怀念', '嫉妒', '释然', '痴迷', '心碎', '初恋', '离别', '重逢', '暗恋', '挣扎', '妥协', '觉醒', '沉沦', '悔恨', '眷恋', '茫然', '安宁', '悸动'],
    createdAt: Date.now(),
  },
  {
    id: 'default-3',
    name: '科技未来',
    words: ['人工智能', '虚拟现实', '量子', '芯片', '算法', '数据流', '神经网', '全息', '纳米', '星际', '深空', '赛博', '仿生', '云脑', '矩阵', '终端', '光子', '暗物质', '奇点', '涌现', '量子纠缠', '空间站', '机械臂', '元宇宙', '二进制'],
    createdAt: Date.now(),
  },
  {
    id: 'default-4',
    name: '奇幻冒险',
    words: ['魔法', '巨龙', '精灵', '咒语', '预言', '神器', '暗影', '圣光', '巫师', '古堡', '秘境', '符文', '幻兽', '时空门', '炼金', '梦境', '勇者', '诅咒', '星辰', '遗迹', '水晶', '卷轴', '召唤', '远征', '冒险者'],
    createdAt: Date.now(),
  },
  {
    id: 'default-5',
    name: '日常诗意',
    words: ['咖啡', '书页', '雨伞', '信件', '窗台', '街角', '晚餐', '旧椅', '暖灯', '花园', '单车', '胶片', '日记', '茶杯', '晚风', '旧物', '街灯', '窗帘', '面包', '唱片', '墨水', '盆栽', '瓷杯', '草席', '木梯'],
    createdAt: Date.now(),
  },
  {
    id: 'default-6',
    name: '抽象哲思',
    words: ['时间', '记忆', '存在', '虚无', '永恒', '瞬间', '悖论', '混沌', '秩序', '自由', '命运', '真理', '幻象', '本质', '边界', '流转', '镜像', '深渊', '碎片', '缝隙', '回响', '沉默', '断裂', '永恒', '间隙'],
    createdAt: Date.now(),
  },
  {
    id: 'default-7',
    name: '色彩光影',
    words: ['赤红', '靛蓝', '翠绿', '金黄', '紫罗兰', '银白', '橙黄', '青碧', '嫣红', '墨黑', '雪白', '琥珀', '玫瑰', '珊瑚', '薰衣草', '孔雀蓝', '暮色', '晨曦', '余晖', '暗涌', '斑驳', '流光', '霞光', '阴影', '眩光'],
    createdAt: Date.now(),
  },
  {
    id: 'default-8',
    name: '动作动态',
    words: ['奔跑', '坠落', '飞翔', '潜行', '凝视', '呐喊', '起舞', '追逐', '躲藏', '攀爬', '漂泊', '旋转', '停驻', '突围', '回望', '出发', '流淌', '迸发', '沉降', '漂浮', '跃迁', '滑行', '潜入', '回旋', '跃出'],
    createdAt: Date.now(),
  },
];
