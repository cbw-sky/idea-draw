import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Dices,
  Loader2,
  ChevronDown,
  HelpCircle,
  X,
} from 'lucide-react';
import { DrawRecord, addHistoryRecord, generateId } from '@/utils/storage';
import { WORD_POOL, CATEGORY_CLUSTERS } from '@/utils/wordPool';
import HistoryPanel from './History';

const CATEGORIES = Object.keys(WORD_POOL);
const MAX_DRAW = CATEGORIES.length; // 每个类别只抽一个，最多抽 MAX_DRAW 个类别
const TOTAL_WORDS = CATEGORIES.reduce((sum, c) => sum + WORD_POOL[c].length, 0);
const ALL_WORDS = CATEGORIES.flatMap(c => WORD_POOL[c]);

// 弱关联类别选择：同簇优先（60%），但不强制，保证类别间"有一点关联但不太强"
function pickRelatedCategories(n: number): string[] {
  const picked: string[] = [];
  const first = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  picked.push(first);
  const clusterOf = (cat: string) => CATEGORY_CLUSTERS.find(cl => cl.includes(cat)) || [];
  while (picked.length < n) {
    const relatedSet = new Set(picked.flatMap(c => clusterOf(c)));
    const related = CATEGORIES.filter(c => !picked.includes(c) && relatedSet.has(c));
    const remaining = CATEGORIES.filter(c => !picked.includes(c));
    let next: string;
    if (related.length > 0 && Math.random() < 0.6) {
      next = related[Math.floor(Math.random() * related.length)];
    } else {
      next = remaining[Math.floor(Math.random() * remaining.length)];
    }
    picked.push(next);
  }
  return picked;
}

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
  const [drawCount, setDrawCount] = useState(3);
  const [reels, setReels] = useState<ReelState[]>(() =>
    Array(3).fill(null).map(() => ({ word: '', phase: 'idle' as const, target: '', stopDelay: 0 })),
  );
  const [copied, setCopied] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0); // 触发历史刷新
  const [showHelp, setShowHelp] = useState(false); // 使用说明弹窗

  const spinIdRef = useRef(0);

  const spinning = reels.some(r => r.phase === 'spinning');
  const allStopped = reels.length > 0 && reels.every(r => r.phase === 'stopped');
  const canSpin = CATEGORIES.length >= drawCount && !spinning;
  const results = reels.filter(r => r.phase === 'stopped').map(r => r.target);

  const reelFontSize =
    drawCount <= 2 ? '1.875rem'
    : drawCount <= 4 ? '1.5rem'
    : drawCount <= 6 ? '1.375rem'
    : drawCount <= 8 ? '1.25rem'
    : '1.0625rem';

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

  // ═══ 抽选：每个类别只抽一个词 ═══
  const spin = useCallback(() => {
    if (CATEGORIES.length < drawCount) return;

    // 弱关联选 drawCount 个不同类别（同簇优先，但不强制），每个类别随机抽 1 个词
    const selectedCats = pickRelatedCategories(drawCount);
    const targets = selectedCats.map(cat => {
      const words = WORD_POOL[cat];
      return words[Math.floor(Math.random() * words.length)];
    });

    const newReels: ReelState[] = targets.map((target, i) => ({
      word: ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)],
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
          const randomWord = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
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
        source: 'pool',
        createdAt: Date.now(),
      };
      addHistoryRecord(record);
      setHistoryRefreshKey(k => k + 1); // 刷新历史面板
    }, 1200 + (drawCount - 1) * 500 + 100);
  }, [drawCount]);

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

  return (
    <div className="min-h-screen bg-[#0a0a14] inspire-bg font-['Noto_Sans_SC',sans-serif]">
      {/* ═══ 首屏：占满视口，垂直布局 ═══ */}
      <div className="flex h-screen flex-col px-4 py-5">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {/* ═══ 头部 ═══ */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00d4aa]/10">
              <Sparkles className="h-5 w-5 text-[#00d4aa]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-semibold text-white">灵感扭蛋机</h1>
                <button
                  onClick={() => setShowHelp(true)}
                  className="text-white/30 hover:text-[#00d4aa] transition-colors"
                  title="使用说明"
                  aria-label="使用说明"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-white/40">共 {CATEGORIES.length} 类 · {TOTAL_WORDS} 词</p>
            </div>
          </div>

          {/* ═══ 扭蛋机（占据剩余空间，垂直居中） ═══ */}
          <div className="flex flex-1 flex-col justify-center py-4">
            <div className="slot-cabinet relative p-4">
              {showBurst && <div className="burst-overlay" />}

              <div className="led-strip mb-3">
                {Array(12).fill(null).map((_, i) => (
                  <span key={i} className="led-dot" style={{ animationDelay: `${(i % 6) * 0.15}s` }} />
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                {reels.map((reel, i) => (
                  <Reel key={i} reel={reel} fontSize={reelFontSize} />
                ))}
              </div>

              <div className="flex items-center justify-center min-h-[24px]">
                {allStopped && (
                  <div className="results-bar flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#ffd93d]" />
                    <span className="text-xs text-white/60">灵感已抽取</span>
                  </div>
                )}
                {spinning && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00d4aa]" />
                    <span className="text-xs text-white/40">抽取中...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ 抽选按钮区 ═══ */}
          <div className="flex flex-col items-center gap-2.5 pb-1">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-white/60">
                <span>抽取</span>
                <div className="relative">
                  <select
                    value={drawCount}
                    onChange={e => updateDrawCount(parseInt(e.target.value))}
                    disabled={spinning}
                    className="appearance-none rounded-lg border border-white/10 bg-[#0f0f0f] pl-2 pr-7 py-2 text-sm text-white outline-none focus:border-[#00d4aa]/60 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {Array.from({ length: MAX_DRAW }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
                <span>个</span>
              </div>

              <button onClick={spin} disabled={!canSpin} className="spin-button">
                {spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
                {spinning ? '抽取中' : '开始抽选'}
              </button>
            </div>

            {canSpin && (
              <span className="hidden md:inline text-[10px] text-white/20 font-mono">按 Space 键抽选</span>
            )}
          </div>

          {/* ═══ 结果栏 ═══ */}
          {allStopped && results.length > 0 && (
            <div className="results-bar mt-3 flex items-center justify-between rounded-xl border border-[#00d4aa]/20 bg-[#00d4aa]/5 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-white/40 shrink-0">结果</span>
                <span className="text-xs font-medium text-[#00d4aa] truncate">{results.join(' · ')}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={copyResults}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/60 transition-all hover:text-white hover:border-white/20"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                  onClick={spin}
                  className="flex items-center gap-1 rounded-lg bg-[#00d4aa]/15 px-2.5 py-1.5 text-xs font-medium text-[#00d4aa] transition-all hover:bg-[#00d4aa]/25"
                >
                  <Dices className="h-3.5 w-3.5" />
                  再来
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 抽取历史（首屏下方，滚动可见） ═══ */}
      <div className="mx-auto w-full max-w-md px-4 pb-8">
        <HistoryPanel refreshKey={historyRefreshKey} />
      </div>

        {/* ═══ 使用说明弹窗 ═══ */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowHelp(false)}
          >
            <div
              className="max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 text-sm leading-relaxed text-white/70 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">关于</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-white/40 transition-colors hover:text-white"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2.5">
                <p>这个网页是一个随机抽取几个关键词、为艺术创作提供灵感的小工具。</p>
                <p>它诞生于一次练习：当时我没有灵感，翻遍各大平台也没找到类似的网页，于是就用 AI 辅助自己搓了一个。它比较简陋，但完全免费，没有广告，也没有任何商业目的，只是想着既然做出来了，就分享给大家。</p>
                <p>抽到的关键词只是灵感起点，不必被它们限制，你可以自由组合、改写、延伸。</p>
                <p>如果你有想添加的关键词，或者想给我反馈，可以在各大平台找我（ID：床_Toko）。</p>
                <p>如果喜欢的人多，我会考虑继续添加其他功能。</p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
