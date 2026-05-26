"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  Flame,
  Dumbbell,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserClient } from "@/lib/supabase";
import type { AiReport, DailyLog } from "@/types/database";

// ---------- types ----------
type Tab = "weekly" | "monthly" | "ask";
type Period = "week" | "month";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

// ---------- markdown renderer (no external dep) ----------
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="font-display text-base font-semibold text-espresso mt-5 mb-2">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="font-display text-lg font-semibold text-espresso mt-6 mb-2">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="font-display text-xl font-bold text-espresso mt-4 mb-3">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const bullets: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        bullets.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-3 ml-1">
          {bullets.map((b, bi) => (
            <li key={bi} className="flex gap-2 text-sm text-charcoal">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>{renderInline(b)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\./.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\./.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-3 ml-1 list-none">
          {items.map((item, oi) => (
            <li key={oi} className="flex gap-2.5 text-sm text-charcoal">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-gold/20 text-gold text-xs flex items-center justify-center font-semibold">{oi + 1}</span>
              <span className="pt-0.5">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    } else {
      elements.push(<p key={i} className="text-sm text-charcoal leading-relaxed my-2">{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-espresso">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="font-mono text-xs bg-sand/60 rounded px-1 py-0.5 text-espresso">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ---------- stat card ----------
function StatCard({ icon, label, value, sub, color = "text-gold" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-cream rounded-xl border border-sand/60 p-3.5 flex items-center gap-3">
      <div className={`${color} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="font-display text-lg font-semibold text-espresso leading-none">{value}</p>
        <p className="text-xs text-warm-gray mt-0.5">{label}</p>
        {sub && <p className="text-xs text-warm-gray/70">{sub}</p>}
      </div>
    </div>
  );
}

// ---------- report history item ----------
function ReportHistoryItem({ report }: { report: AiReport }) {
  const [open, setOpen] = useState(false);
  const date = new Date(report.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const label = report.report_type === "weekly" ? "Weekly" : "Monthly";

  return (
    <div className="border border-sand/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-cream hover:bg-ivory transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-warm-gray" />
          <span className="font-medium text-charcoal">{label} Report</span>
          <span className="text-warm-gray">— {date}</span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-warm-gray" />
        ) : (
          <ChevronRight className="h-4 w-4 text-warm-gray" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-ivory border-t border-sand/40">
              <MarkdownContent content={report.content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- loading skeleton ----------
function ReportSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-ivory rounded-2xl border border-sand/60 p-6 space-y-4"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-gold animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-espresso">Analyzing your data...</p>
          <p className="text-xs text-warm-gray">This usually takes 5-10 seconds</p>
        </div>
      </div>
      {[100, 80, 90, 70, 85].map((w, i) => (
        <div key={i} className={`h-3.5 rounded-full bg-sand/60 shimmer`} style={{ width: `${w}%` }} />
      ))}
      <div className="pt-2 space-y-2">
        {[60, 75, 55].map((w, i) => (
          <div key={i} className="h-3 rounded-full bg-sand/40 shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>
    </motion.div>
  );
}

// ---------- chat bubble ----------
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-gold text-white rounded-br-sm"
            : "bg-ivory border border-sand/60 text-charcoal rounded-bl-sm"
        }`}
      >
        {msg.loading ? (
          <div className="flex gap-1 py-1">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-warm-gray animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        ) : isUser ? (
          <p>{msg.content}</p>
        ) : (
          <MarkdownContent content={msg.content} />
        )}
      </div>
    </motion.div>
  );
}

// ---------- QUICK QUESTION CHIPS ----------
const QUICK_QUESTIONS = [
  "Why did I stall this week?",
  "Am I eating enough protein?",
  "What should I change first?",
  "How's my bulk going overall?",
];

// ---------- MAIN PAGE ----------
export default function InsightsPage() {
  const { profile } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [tab, setTab] = useState<Tab>("weekly");

  // Report state
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [pastReports, setPastReports] = useState<AiReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<{
    avgCals: number | null; avgProtein: number | null;
    weightChange: number | null; consistency: number | null;
  } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hey! I'm your BulkOS coach. Ask me anything about your data — like *\"Why did I stall this week?\"* or *\"Am I hitting my protein targets?\"*",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentReport = tab === "weekly" ? weeklyReport : monthlyReport;

  // Fetch history + compute stats on mount
  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    const supabase = createBrowserClient();

    const [reportsRes, logsRes] = await Promise.all([
      supabase
        .from("ai_reports")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", profile.id)
        .gte("log_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
        .order("log_date", { ascending: true }),
    ]);

    setPastReports(reportsRes.data ?? []);

    const logs: DailyLog[] = logsRes.data ?? [];
    if (logs.length) {
      const withCals = logs.filter((l) => l.calories !== null);
      const withWeight = logs.filter((l) => l.weight_kg !== null);
      const avgCals = withCals.length
        ? Math.round(withCals.reduce((s, l) => s + (l.calories ?? 0), 0) / withCals.length)
        : null;
      const avgProtein = withCals.length
        ? Math.round(withCals.reduce((s, l) => s + (l.protein_g ?? 0), 0) / withCals.length)
        : null;
      const firstW = withWeight[0]?.weight_kg ?? null;
      const lastW = withWeight[withWeight.length - 1]?.weight_kg ?? null;
      const weightChange = firstW != null && lastW != null ? Math.round((lastW - firstW) * 100) / 100 : null;
      const consistency = Math.round((logs.length / 30) * 100);
      setStats({ avgCals, avgProtein, weightChange, consistency });
    }

    setHistoryLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function generateReport() {
    setGenerating(true);
    setReportError(null);
    const period: Period = tab === "weekly" ? "week" : "month";

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, mode: "report" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      if (tab === "weekly") setWeeklyReport(json.content);
      else setMonthlyReport(json.content);
      fetchHistory();
      toastSuccess("Report generated!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setReportError(msg);
      toastError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function sendMessage(text?: string) {
    const question = (text ?? chatInput).trim();
    if (!question || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content: question };
    const loadingMsg: ChatMessage = { role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "week", mode: "ask", question }),
      });
      const json = await res.json();
      const answer = res.ok ? (json.content ?? "No response.") : (json.error ?? "Something went wrong.");
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "weekly", label: "Weekly Report" },
    { id: "monthly", label: "Monthly Report" },
    { id: "ask", label: "Ask AI" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-8 w-8 rounded-xl bg-gold/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-espresso">AI Insights</h1>
        </div>
        <p className="text-sm text-warm-gray">Powered by Llama 3.3 — your personal bulking coach.</p>
      </motion.div>

      {/* Tab selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-1 bg-cream rounded-xl p-1 border border-sand/60 w-fit"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
              tab === id ? "text-espresso" : "text-warm-gray hover:text-charcoal"
            }`}
          >
            {tab === id && (
              <motion.div
                layoutId="insights-tab-pill"
                className="absolute inset-0 bg-gold/20 rounded-lg border border-gold/40"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ---- REPORT TABS ---- */}
        {(tab === "weekly" || tab === "monthly") && (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Generate button */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                loading={generating}
                onClick={generateReport}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4" />
                {currentReport ? "Regenerate Report" : `Generate ${tab === "weekly" ? "Weekly" : "Monthly"} Report`}
              </Button>
              {currentReport && !generating && (
                <button
                  onClick={generateReport}
                  className="h-9 w-9 rounded-lg border border-sand hover:border-gold/40 flex items-center justify-center text-warm-gray hover:text-gold transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Error */}
            {reportError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="px-4 py-3 rounded-xl bg-rose/10 border border-rose/20 text-sm text-rose"
              >
                {reportError}
              </motion.div>
            )}

            {/* Loading state */}
            {generating && <ReportSkeleton />}

            {/* Report card */}
            {!generating && currentReport && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-6 py-5"
              >
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-sand/50">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <span className="text-xs font-medium text-warm-gray uppercase tracking-wide">
                    {tab === "weekly" ? "Weekly" : "Monthly"} Analysis
                  </span>
                </div>
                <MarkdownContent content={currentReport} />
              </motion.div>
            )}

            {/* Placeholder when no report yet */}
            {!generating && !currentReport && !reportError && (
              <div className="bg-cream rounded-2xl border border-sand/50 border-dashed px-6 py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-gold/60" />
                </div>
                <p className="text-sm font-medium text-charcoal mb-1">No report yet</p>
                <p className="text-xs text-warm-gray">
                  Hit Generate to get an AI analysis of your {tab === "weekly" ? "last 7 days" : "last 30 days"}.
                </p>
              </div>
            )}

            {/* Stats cards */}
            {stats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                <StatCard
                  icon={<Flame className="h-4 w-4" />}
                  label="Avg calories"
                  value={stats.avgCals != null ? `${stats.avgCals}` : "—"}
                  sub="kcal/day"
                />
                <StatCard
                  icon={<Dumbbell className="h-4 w-4" />}
                  label="Avg protein"
                  value={stats.avgProtein != null ? `${stats.avgProtein}g` : "—"}
                  color="text-sage"
                />
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Weight change"
                  value={stats.weightChange != null ? `${stats.weightChange >= 0 ? "+" : ""}${stats.weightChange}kg` : "—"}
                  sub="last 30d"
                  color={stats.weightChange != null && stats.weightChange > 0 ? "text-sage" : "text-terracotta"}
                />
                <StatCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="Consistency"
                  value={stats.consistency != null ? `${stats.consistency}%` : "—"}
                  sub="days logged"
                  color="text-charcoal"
                />
              </motion.div>
            )}

            {/* Past reports */}
            {!historyLoading && pastReports.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <p className="text-xs font-medium text-warm-gray uppercase tracking-wide px-1">Past Reports</p>
                <div className="space-y-2">
                  {pastReports
                    .filter((r) => (tab === "weekly" ? r.report_type === "weekly" : r.report_type === "monthly"))
                    .map((r) => <ReportHistoryItem key={r.id} report={r} />)}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ---- ASK AI TAB ---- */}
        {tab === "ask" && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Chat window */}
            <div className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md flex flex-col h-[480px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Quick question chips */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div className="border-t border-sand/50 px-4 py-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about your data..."
                  disabled={chatLoading}
                  className="flex-1 text-sm bg-cream rounded-xl px-3.5 py-2.5 border border-sand/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 text-charcoal placeholder:text-warm-gray/60 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="h-10 w-10 rounded-xl bg-gold flex items-center justify-center text-white disabled:opacity-40 hover:bg-gold-dark transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-warm-gray text-center">
              Responses use your last 14 days of logged data for context.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
