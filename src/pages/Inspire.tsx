import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Dices,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  Theme,
  DrawRecord,
  loadKeywords,
  saveKeywords,
  loadThemes,
  saveThemes,
  addHistoryRecord,
  generateId,
  DEFAULT_THEMES,
} from '@/utils/storage';
import HistoryPanel from './History';

const MAX_DRAW = 10; // 最多抽取数量（下拉菜单 1-10）
const MAX_APPEND_AT_ONCE = 50; // 一次性从主题追加关键词的最大数量上限

interface ReelState {
  word: string;
  phase: 'idle' | 'spinning' | 'stopped';
  target: string;
  stopDelay: number;
}

function Reel({ reel, fontSize }: { reel: ReelState; fontSize: string }) {
  const isSpinning = reel.phase === 'spinning';
  const isStopped = reel.phase === 'stopped';
  const isEmpty = reel.phase === 'idle';

  return (
    <div className={`reel-container ${isSpinning ? 'reel-spinning' : ''} ${isStopped ? 'reel-stopped' : ''}`}>
      <span className="reel-word" style={{ fontSize }}>
        {isEmpty ? '—' : reel.word}
      </span>
    </div>
  );
}

export default function Inspire() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [drawCount, setDrawCount] = useState(3);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [customInput, setCustomInput] = useState('');
  const [reels, setReels] = useState<ReelState[]>(() =>
    Array(3).fill(null).map(() => ({ word: '', phase: 'idle' as const, target: '', stopDelay: 0 })),
  );
  const [copied, setCopied] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  // 主题编辑器状态
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeNameInput, setThemeNameInput] = useState('');
  const [themeWordsInput, setThemeWordsInput] = useState('');

  // 从主题追加关键词到池的数量
  const [appendCount, setAppendCount] = useState(20);

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0); // 触发历史刷新

  const spinIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const spinning = reels.some(r => r.phase === 'spinning');
  const allStopped = reels.length > 0 && reels.every(r => r.phase === 'stopped');
  const canSpin = keywords.length >= drawCount && !spinning;
  const results = reels.filter(r => r.phase === 'stopped').map(r => r.target);

  const reelFontSize = drawCount <= 2 ? '1.875rem' : drawCount <= 4 ? '1.5rem' : '1.25rem';
  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  // ═══ 初始化加载 ═══
  useEffect(() => {
    let loadedThemes = loadThemes();
    if (loadedThemes.length === 0) {
      loadedThemes = [...DEFAULT_THEMES];
      saveThemes(loadedThemes);
    }
    setThemes(loadedThemes);

    const loadedKeywords = loadKeywords();
    if (loadedKeywords.length === 0 && loadedThemes.length > 0) {
      // 首次：用第一个主题填充默认关键词池
      const initial = [...loadedThemes[0].words];
      setKeywords(initial);
      saveKeywords(initial);
    } else {
      setKeywords(loadedKeywords);
    }

    if (loadedThemes.length > 0) setSelectedThemeId(loadedThemes[0].id);
  }, []);

  // 关键词池变化时保存
  useEffect(() => {
    if (keywords.length > 0 || localStorage.getItem('inspire-keywords')) {
      saveKeywords(keywords);
    }
  }, [keywords]);

  // 全部停止时触发光效
  useEffect(() => {
    if (allStopped) {
      setShowBurst(true);
      const timer = setTimeout(() => setShowBurst(false), 800);
      return () => clearTimeout(timer);
    }
  }, [allStopped]);

  // ═══ 抽取数量 ═══
  const updateDrawCount = useCallback((count: number) => {
    if (spinning) return;
    setDrawCount(count);
    setReels(
      Array(count)
        .fill(null)
        .map(() => ({ word: '', phase: 'idle' as const, target: '', stopDelay: 0 })),
    );
  }, [spinning]);

  // ═══ 抽选 ═══
  const spin = useCallback(() => {
    if (keywords.length < drawCount) return;

    const shuffled = [...keywords].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, drawCount);

    const newReels: ReelState[] = targets.map((target, i) => ({
      word: keywords[Math.floor(Math.random() * keywords.length)],
      phase: 'spinning' as const,
      target,
      stopDelay: 1200 + i * 500,
    }));

    setReels(newReels);
    const currentSpinId = ++spinIdRef.current;

    newReels.forEach((reel, i) => {
      const startTime = Date.now();

      const cycle = () => {
        if (spinIdRef.current !== currentSpinId) return;
        const elapsed = Date.now() - startTime;

        if (elapsed < reel.stopDelay) {
          const randomWord = keywords[Math.floor(Math.random() * keywords.length)];
          setReels(prev => {
            const updated = [...prev];
            if (updated[i]) updated[i] = { ...updated[i], word: randomWord };
            return updated;
          });
          const progress = elapsed / reel.stopDelay;
          const nextInterval = 50 + Math.pow(progress, 2.5) * 300;
          setTimeout(cycle, nextInterval);
        } else {
          setReels(prev => {
            const updated = [...prev];
            if (updated[i]) updated[i] = { ...updated[i], word: reel.target, phase: 'stopped' as const };
            return updated;
          });
        }
      };

      setTimeout(cycle, 0);
    });

    // 抽取完成后保存到历史
    setTimeout(() => {
      const record: DrawRecord = {
        id: generateId(),
        words: targets,
        poolSnapshot: [...keywords], // 记录抽取时的词池快照
        source: 'pool',
        createdAt: Date.now(),
      };
      addHistoryRecord(record);
      setHistoryRefreshKey(k => k + 1); // 刷新历史面板
    }, 1200 + (drawCount - 1) * 500 + 100);
  }, [keywords, drawCount]);

  // ═══ 关键词管理 ═══
  const addKeyword = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const words = trimmed.split(/[,，、\s\n]+/).filter(w => w && !keywords.includes(w));
    if (words.length > 0) {
      setKeywords(prev => [...prev, ...words]);
      setCustomInput('');
      inputRef.current?.focus();
    }
  }, [customInput, keywords]);

  const removeKeyword = useCallback((kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
  }, []);

  // ═══ 从主题追加关键词到词池（不替换，可多次选不同主题追加） ═══
  const appendFromTheme = useCallback(() => {
    if (!selectedTheme) return;
    const pool = selectedTheme.words;
    if (pool.length === 0) return;

    // 从主题词库随机抽取 appendCount 个（不重复）
    const count = Math.min(appendCount, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);

    // 追加到词池（去重）
    setKeywords(prev => {
      const existing = new Set(prev);
      const added: string[] = [];
      for (const w of shuffled) {
        if (!existing.has(w)) {
          existing.add(w);
          added.push(w);
        }
      }
      return [...prev, ...added];
    });

    // 记录历史（记录这次追加的词 + 追加前的词池快照）
    const record: DrawRecord = {
      id: generateId(),
      words: shuffled,
      poolSnapshot: [...keywords], // 追加前的词池
      source: 'theme',
      sourceName: selectedTheme.name,
      createdAt: Date.now(),
    };
    addHistoryRecord(record);
    setHistoryRefreshKey(k => k + 1); // 刷新历史面板
  }, [selectedTheme, appendCount, keywords]);

  // ═══ 主题编辑器 ═══
  const openThemeEditor = useCallback((theme: Theme | null) => {
    if (theme) {
      setEditingTheme(theme);
      setThemeNameInput(theme.name);
      setThemeWordsInput(theme.words.join('、'));
    } else {
      setEditingTheme(null);
      setThemeNameInput('');
      setThemeWordsInput('');
    }
    setShowThemeEditor(true);
  }, []);

  const saveTheme = useCallback(() => {
    const name = themeNameInput.trim();
    if (!name) return;
    const words = themeWordsInput
      .split(/[,，、\s\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (editingTheme) {
      // 编辑现有主题
      const updated = themes.map(t =>
        t.id === editingTheme.id ? { ...t, name, words } : t
      );
      setThemes(updated);
      saveThemes(updated);
    } else {
      // 新建主题
      const newTheme: Theme = {
        id: generateId(),
        name,
        words,
        createdAt: Date.now(),
      };
      const updated = [...themes, newTheme];
      setThemes(updated);
      saveThemes(updated);
      setSelectedThemeId(newTheme.id);
    }

    setShowThemeEditor(false);
    setEditingTheme(null);
    setThemeNameInput('');
    setThemeWordsInput('');
  }, [themeNameInput, themeWordsInput, editingTheme, themes]);

  const deleteTheme = useCallback((id: string) => {
    if (!confirm('确定删除这个主题吗？')) return;
    const updated = themes.filter(t => t.id !== id);
    setThemes(updated);
    saveThemes(updated);
    if (selectedThemeId === id) {
      setSelectedThemeId(updated.length > 0 ? updated[0].id : '');
    }
  }, [themes, selectedThemeId]);

  // ═══ 复制结果 ═══
  const copyResults = useCallback(() => {
    navigator.clipboard.writeText(results.join('、'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [results]);

  // Space 键抽选
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && canSpin) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          e.preventDefault();
          spin();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canSpin, spin]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#0a0a14] inspire-bg px-4 py-8 font-['Noto_Sans_SC',sans-serif]">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ═══ 头部 ═══ */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d4aa]/10">
            <Sparkles className="h-5 w-5 text-[#00d4aa]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">灵感老虎机</h1>
            <p className="text-sm text-white/40">为创作注入随机灵感</p>
          </div>
        </div>

        {/* ═══ 老虎机 ═══ */}
        <div className="slot-cabinet relative p-6">
          {showBurst && <div className="burst-overlay" />}

          <div className="led-strip mb-4">
            {Array(16).fill(null).map((_, i) => (
              <span key={i} className="led-dot" style={{ animationDelay: `${(i % 8) * 0.15}s` }} />
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            {reels.map((reel, i) => (
              <Reel key={i} reel={reel} fontSize={reelFontSize} />
            ))}
          </div>

          <div className="flex items-center justify-center min-h-[28px]">
            {allStopped && (
              <div className="results-bar flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#ffd93d]" />
                <span className="text-sm text-white/60">灵感已抽取</span>
              </div>
            )}
            {spinning && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00d4aa]" />
                <span className="text-sm text-white/40">抽取中...</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ 抽选按钮区（居中） ═══ */}
        <div className="flex flex-col items-center gap-3">
          {/* 抽取数量 + 抽选按钮（水平居中，下拉在左，按钮在右） */}
          <div className="flex items-center justify-center gap-3">
            {/* 抽取N个 下拉（"抽取"和"个"固定，N可变） */}
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <span>抽取</span>
              <div className="relative">
                <select
                  value={drawCount}
                  onChange={e => updateDrawCount(parseInt(e.target.value))}
                  disabled={spinning}
                  className="appearance-none rounded-lg border border-white/10 bg-[#0f0f0f] pl-2 pr-7 py-1.5 text-sm text-white outline-none focus:border-[#00d4aa]/60 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {Array.from({ length: MAX_DRAW }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
              <span>个</span>
            </div>

            {/* 抽选按钮 */}
            <button onClick={spin} disabled={!canSpin} className="spin-button">
              {spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
              {spinning ? '抽取中' : '开始抽选'}
            </button>
          </div>

          {canSpin && (
            <span className="text-[10px] text-white/20 font-mono">按 Space 键抽选</span>
          )}
          {!canSpin && !spinning && keywords.length < drawCount && (
            <span className="text-[10px] text-white/20">
              至少需要 {drawCount} 个关键词（当前 {keywords.length} 个）
            </span>
          )}
        </div>

        {/* ═══ 结果栏 ═══ */}
        {allStopped && results.length > 0 && (
          <div className="results-bar flex items-center justify-between rounded-xl border border-[#00d4aa]/20 bg-[#00d4aa]/5 px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-white/40 shrink-0">抽取结果</span>
              <span className="text-sm font-medium text-[#00d4aa] truncate">{results.join(' · ')}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={copyResults}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all hover:text-white hover:border-white/20"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={spin}
                className="flex items-center gap-1.5 rounded-lg bg-[#00d4aa]/15 px-3 py-1.5 text-xs font-medium text-[#00d4aa] transition-all hover:bg-[#00d4aa]/25"
              >
                <Dices className="h-3.5 w-3.5" />
                再来一次
              </button>
            </div>
          </div>
        )}

      </div>

        {/* ═══ 抽取历史（内嵌） ═══ */}
        <HistoryPanel refreshKey={historyRefreshKey} />
    </div>
  );
}
