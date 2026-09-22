import { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Trash2,
  Search,
  Sparkles,
  Copy,
  Check,
  Eraser,
} from 'lucide-react';
import {
  DrawRecord,
  loadHistory,
  removeHistoryRecord,
  clearHistory,
  formatTime,
} from '@/utils/storage';

interface HistoryPanelProps {
  refreshKey: number; // 自增 key，触发刷新
}

export default function HistoryPanel({ refreshKey }: HistoryPanelProps) {
  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 加载历史（refreshKey 变化时重新加载）
  useEffect(() => {
    setRecords(loadHistory());
  }, [refreshKey]);

  // 按最新优先过滤
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.words.some(w => w.toLowerCase().includes(query)) ||
        (r.sourceName?.toLowerCase().includes(query) ?? false)
      );
    }

    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }, [records, searchQuery]);

  const handleDelete = (id: string) => {
    const updated = removeHistoryRecord(id);
    setRecords(updated);
    setConfirmDeleteId(null);
  };

  const handleClearAll = () => {
    clearHistory();
    setRecords([]);
    setConfirmClearAll(false);
  };

  const handleCopy = (record: DrawRecord) => {
    navigator.clipboard.writeText(record.words.join('、'));
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-[#16213e] p-6">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-[#00d4aa]" />
          <h2 className="text-base font-medium text-white">抽取历史</h2>
          <span className="rounded-full bg-[#00d4aa]/10 px-2 py-0.5 text-xs font-medium text-[#00d4aa]">
            {records.length} 条
          </span>
        </div>
        {records.length > 0 && !confirmClearAll && (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-1.5 text-xs text-white/40 transition-all hover:text-red-400 hover:border-red-400/30"
          >
            <Eraser className="h-3.5 w-3.5" />
            清空全部
          </button>
        )}
        {confirmClearAll && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearAll}
              className="px-2 py-1 text-[11px] bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
            >
              确认清空
            </button>
            <button
              onClick={() => setConfirmClearAll(false)}
              className="px-2 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white/70 rounded-md transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="搜索抽到的词或主题名..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 outline-none focus:border-[#00d4aa]/50 focus:ring-1 focus:ring-[#00d4aa]/30 transition-colors"
          />
        </div>
      </div>

      {/* 历史列表 */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/40">
          <Sparkles className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {records.length === 0 ? '还没有抽取记录' : '没有匹配的记录'}
          </p>
          <p className="text-xs mt-1 text-white/30">
            {records.length === 0
              ? '点上方按钮开始抽取灵感吧'
              : '尝试调整搜索条件'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => (
            <div
              key={record.id}
              className="group bg-[#0f0f0f]/40 border border-white/5 rounded-xl p-4 hover:border-[#00d4aa]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* 左侧信息 */}
                <div className="flex-1 min-w-0">
                  {/* 元信息 */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(record.createdAt)}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {record.words.length} 个词
                    </span>
                  </div>

                  {/* 抽到的关键词 */}
                  <div className="flex flex-wrap gap-1.5">
                    {record.words.map((w, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-[#00d4aa]/20 bg-[#00d4aa]/5 px-2 py-0.5 text-xs text-[#00d4aa]/90"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 右侧操作 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(record)}
                    className="p-2 text-white/30 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 rounded-lg transition-colors"
                    title="复制抽到的词"
                  >
                    {copiedId === record.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {confirmDeleteId === record.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="px-2 py-1 text-[11px] bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white/70 rounded-md transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(record.id)}
                      className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


