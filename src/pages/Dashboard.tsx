import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck2,
  FilePlus,
  Filter,
  Flame,
  Gauge,
  MessageSquarePlus,
  PlayCircle,
  Snowflake,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card, Empty, Spin, Tag } from "antd";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { LevelBadge, StatusBadge } from "../components/badges";
import { LEVEL_LABELS, STATUS_LABELS } from "../../shared/types";
import type {
  BacklogStats,
  Clue,
  ClueLevel,
  ClueStatus,
  TeamStats,
} from "../../shared/types";

interface BacklogData {
  level: ClueLevel;
  pendingGrade: number;
  pendingAssign: number;
  verifying: number;
  returned: number;
  total: number;
  avgWaitHours: number;
}

function NumberAnim({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    const from = 0;
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {n}
      {suffix}
    </span>
  );
}

const levelMeta: Record<
  ClueLevel,
  {
    Icon: any;
    gradBg: string;
    gradText: string;
    ring: string;
    barColor: string;
  }
> = {
  critical: {
    Icon: Flame,
    gradBg: "from-red-500 to-red-700",
    gradText: "text-red-600",
    ring: "ring-red-500/20",
    barColor: "#EF4444",
  },
  urgent: {
    Icon: Zap,
    gradBg: "from-orange-400 to-orange-600",
    gradText: "text-orange-600",
    ring: "ring-orange-500/20",
    barColor: "#FF6B35",
  },
  normal: {
    Icon: Snowflake,
    gradBg: "from-emerald-400 to-emerald-600",
    gradText: "text-emerald-600",
    ring: "ring-emerald-500/20",
    barColor: "#10B981",
  },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const [backlog, setBacklog] = useState<BacklogData[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [myClues, setMyClues] = useState<Clue[]>([]);
  const [myStats, setMyStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, t, c, m] = await Promise.all([
          api.getBacklog(),
          api.getTeamStats(),
          api.listClues({ pageSize: 8, page: 1 }).then((r) => r.list),
          api.getMyStats(),
        ]);
        setBacklog(b as BacklogData[]);
        setTeamStats(t);
        setMyClues(c);
        setMyStats(m);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPending = backlog.reduce((a, b) => a + b.total, 0);

  const canReport = user?.role === "reporter" || user?.role === "grid_member";
  const canOperate = user?.role === "operator";
  const canVerify = user?.role === "verifier";

  const flowSteps = [
    {
      key: "report",
      title: "提交举报",
      desc: "市民或网格员填写违规线索",
      icon: MessageSquarePlus,
      color: "from-emerald-400 to-emerald-600",
      action: canReport ? () => nav("/report") : null,
      active: canReport,
      count: null,
    },
    {
      key: "grade",
      title: "自动分级",
      desc: "系统按违规程度智能分级",
      icon: Sparkles,
      color: "from-sky-400 to-sky-600",
      action: canOperate ? () => nav("/clues?status=pending_grade") : null,
      active: canOperate,
      count:
        backlog.find((b) => b.level === "critical")?.pendingGrade +
          backlog.find((b) => b.level === "urgent")?.pendingGrade +
          backlog.find((b) => b.level === "normal")?.pendingGrade || 0,
    },
    {
      key: "assign",
      title: "认领派发",
      desc: "运营认领后派发至核查组",
      icon: ClipboardList,
      color: "from-indigo-400 to-indigo-600",
      action: canOperate ? () => nav("/clues?status=pending_assign") : null,
      active: canOperate,
      count:
        backlog.find((b) => b.level === "critical")?.pendingAssign +
          backlog.find((b) => b.level === "urgent")?.pendingAssign +
          backlog.find((b) => b.level === "normal")?.pendingAssign || 0,
    },
    {
      key: "verify",
      title: "核查回填",
      desc: "核查组核查后回填结论办结",
      icon: FileCheck2,
      color: "from-brand-400 to-brand-600",
      action: canVerify ? () => nav("/clues?status=verifying") : null,
      active: canVerify,
      count:
        backlog.find((b) => b.level === "critical")?.verifying +
          backlog.find((b) => b.level === "urgent")?.verifying +
          backlog.find((b) => b.level === "normal")?.verifying || 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 全流程快速入门引导 */}
      <Card
        className="border-0 shadow-card overflow-hidden animate-fade-in"
        style={{ animationDelay: "0.02s", borderRadius: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="bg-gradient-to-r from-navy-800 via-navy-700 to-navy-800 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,rgba(255,107,53,0.4),transparent_40%),radial-gradient(circle_at_80%_50%,rgba(16,185,129,0.4),transparent_40%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-navy-100/70 text-xs mb-1 flex items-center gap-1.5">
                <PlayCircle size={12} />
                全流程快速入门 · 新同事一分钟上手
              </div>
              <div className="font-serif text-white text-lg font-semibold">
                线索治理四步走：提交 → 分级 → 派发 → 核查
              </div>
            </div>
            <div className="text-right text-navy-100/80 text-xs">
              <div className="mb-0.5">前端工作台 + 后端线索库已就绪</div>
              <div>按角色点击下方卡片进入对应环节</div>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {flowSteps.map((step, idx) => {
              const Icon = step.icon;
              const clickable = !!step.action && step.active;
              return (
                <div
                  key={step.key}
                  onClick={step.action || undefined}
                  className={[
                    "relative rounded-xl border p-4 transition-all animate-fade-in",
                    clickable
                      ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 border-slate-200 hover:border-navy-300 bg-white"
                      : "cursor-not-allowed opacity-60 border-slate-100 bg-slate-50",
                  ].join(" ")}
                  style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={[
                        "w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm",
                        step.color,
                      ].join(" ")}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-semibold text-slate-900">
                          {step.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                          Step {idx + 1}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {step.count !== null && step.count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          待处理 {step.count}
                        </span>
                      ) : step.active ? (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          随时可用
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          非您角色权限
                        </span>
                      )}
                    </div>
                    {clickable && (
                      <ArrowUpRight
                        size={14}
                        className="text-slate-400 group-hover:text-navy-700"
                      />
                    )}
                  </div>
                  {idx < flowSteps.length - 1 && (
                    <ChevronRight
                      size={20}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300 hidden md:block"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SLA：重大 24h · 紧急 48h · 一般 72h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              角色：举报用户 / 网格员 → 运营 → 核查组
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              服务：前端 Vite (5173) + 后端 Express (3001) 已联动
            </span>
          </div>
        </div>
      </Card>

      {/* Top: 积压卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="border-0 shadow-card overflow-hidden relative animate-fade-in"
          style={{ animationDelay: "0.05s", borderRadius: 16 }}
          styles={{ body: { padding: 20 } }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-navy-500/10 to-navy-500/0 blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-2">待处理线索总数</div>
              <div className="font-serif text-3xl font-semibold text-slate-900">
                <Spin spinning={loading} size="small">
                  <NumberAnim value={totalPending} />
                </Spin>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                全平台积压线索总量
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center text-white shadow-md">
              <Gauge size={20} />
            </div>
          </div>
        </Card>

        {backlog.map((item, idx) => {
          const meta = levelMeta[item.level];
          const Icon = meta.Icon;
          return (
            <Card
              key={item.level}
              className="border-0 shadow-card overflow-hidden animate-fade-in hover:shadow-card-hover transition-shadow"
              style={{
                animationDelay: `${0.1 + idx * 0.05}s`,
                borderRadius: 16,
              }}
              styles={{ body: { padding: 20 } }}
              hoverable
              onClick={() => {
                nav("/clues");
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">
                    {LEVEL_LABELS[item.level]}积压
                  </div>
                  <div
                    className={[
                      "font-serif text-3xl font-semibold",
                      meta.gradText,
                    ].join(" ")}
                  >
                    <NumberAnim value={item.total} />
                  </div>
                </div>
                <div
                  className={[
                    "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md ring-8",
                    meta.gradBg,
                    meta.ring,
                  ].join(" ")}
                >
                  <Icon size={20} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                <div>
                  <div className="text-slate-400">待分级</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {item.pendingGrade}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">待派发</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {item.pendingAssign}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">核查中</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {item.verifying}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">退回</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {item.returned}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock size={12} />
                  平均等待 {item.avgWaitHours}h
                </div>
                <span
                  className={[
                    "flex items-center gap-0.5 font-medium",
                    meta.gradText,
                  ].join(" ")}
                >
                  查看详情 <ArrowUpRight size={11} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 我经手的线索 */}
        <Card
          className="col-span-2 border-0 shadow-card animate-fade-in"
          style={{ animationDelay: "0.25s", borderRadius: 16 }}
          title={<span className="font-serif text-base">我经手的线索</span>}
          extra={
            <Filter
              size={14}
              className="text-slate-400 cursor-pointer hover:text-navy-700"
            />
          }
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div className="py-16 text-center">
              <Spin />
            </div>
          ) : myClues.length === 0 ? (
            <Empty description="暂无线索" className="py-16" />
          ) : (
            <div className="divide-y divide-slate-50">
              {myClues.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => nav(`/clues?id=${c.id}`)}
                  className="clue-row px-5 py-4 cursor-pointer flex items-start gap-4 animate-fade-in hover:bg-slate-50/80"
                  style={{ animationDelay: `${0.3 + i * 0.03}s` }}
                >
                  <div className="pt-1">
                    <LevelBadge level={c.level} pulse />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">
                        {c.appName}
                      </span>
                      <Tag
                        color="slate"
                        bordered={false}
                        style={{ margin: 0, fontSize: 11, padding: "0 6px" }}
                      >
                        {c.violationType}
                      </Tag>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {c.description}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {c.reporterName}
                      </span>
                      <span>{dayjs(c.createdAt).format("MM-DD HH:mm")}</span>
                      {c.assignedToName && (
                        <span>派发至 · {c.assignedToName}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono shrink-0">
                    {c.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 核查组效能排行 */}
        <Card
          className="border-0 shadow-card animate-fade-in"
          style={{ animationDelay: "0.3s", borderRadius: 16 }}
          title={<span className="font-serif text-base">核查组办结排行</span>}
          extra={
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp size={12} />
              本周
            </span>
          }
          styles={{ body: { padding: 20 } }}
        >
          {teamStats.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamStats.slice(0, 4)}
                    layout="vertical"
                    margin={{ left: 4, right: 8 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="teamName" width={0} hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 0,
                        boxShadow: "0 8px 24px rgba(15,39,71,0.12)",
                      }}
                      formatter={(v: any, n: string) =>
                        [
                          { name: "办结量", value: v },
                          {
                            name: "平均用时",
                            value:
                              teamStats.find((t) => t.teamName === n)
                                ?.avgHours + "h",
                          },
                        ] as any
                      }
                    />
                    <Bar
                      dataKey="resolvedCount"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                    >
                      {teamStats.slice(0, 4).map((t, i) => (
                        <Cell
                          key={i}
                          fill={["#0F2747", "#2563EB", "#FF6B35", "#10B981"][i]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {teamStats.slice(0, 4).map((t, i) => (
                  <div
                    key={t.teamId}
                    className="flex items-center gap-3 animate-fade-in"
                    style={{ animationDelay: `${0.4 + i * 0.05}s` }}
                  >
                    <div
                      className={[
                        "w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0",
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                            ? "bg-slate-200 text-slate-600"
                            : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 font-medium truncate">
                        {t.teamName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>
                          <CheckCircle2 size={10} className="inline mr-1" />
                          办结 {t.resolvedCount}
                        </span>
                        <span>·</span>
                        <span>平均 {t.avgHours}h</span>
                        <span>·</span>
                        <span>SLA {t.slaRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 底部：角色行动引导 + 状态分布标签云 */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in"
        style={{ animationDelay: "0.4s" }}
      >
        {(user?.role === "reporter" || user?.role === "grid_member") && (
          <Card
            className="md:col-span-1 border-0 shadow-card cursor-pointer hover:shadow-card-hover transition-all overflow-hidden relative"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 20 } }}
            onClick={() => nav("/report")}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                <FilePlus size={22} />
              </div>
              <div className="flex-1">
                <div className="font-serif text-base text-slate-900 mb-1">
                  提交举报线索
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  大促期间遭遇乱跳转、诱导下载？快速提交，分级优先处理
                </div>
                <div className="mt-3 text-xs font-medium text-brand-600 inline-flex items-center gap-1">
                  立即填写 <ArrowUpRight size={12} />
                </div>
              </div>
            </div>
          </Card>
        )}
        {(user?.role === "operator" || user?.role === "verifier") && (
          <Card
            className="md:col-span-1 border-0 shadow-card cursor-pointer hover:shadow-card-hover transition-all overflow-hidden relative"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 20 } }}
            onClick={() => nav("/clues")}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center text-white shadow-lg shadow-navy-500/20">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <div className="font-serif text-base text-slate-900 mb-1">
                  进入线索工作台
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  {totalPending} 条线索待处理，紧急重大优先处置
                </div>
                <div className="mt-3 text-xs font-medium text-navy-700 inline-flex items-center gap-1">
                  开始处理 <ArrowUpRight size={12} />
                </div>
              </div>
            </div>
          </Card>
        )}
        <Card
          className="md:col-span-2 border-0 shadow-card"
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 20 } }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif text-base text-slate-900">
              全局状态分布
            </div>
            <span className="text-[11px] text-slate-400">
              {dayjs().format("YYYY年MM月DD日")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "pending_grade",
                "pending_assign",
                "verifying",
                "returned",
                "resolved",
              ] as ClueStatus[]
            ).map((s) => {
              const count = myStats?.byStatus?.[s] || 0;
              return (
                <Tag
                  key={s}
                  onClick={() => nav(`/clues?status=${s}`)}
                  className="!cursor-pointer !text-sm !px-4 !py-1.5 !rounded-full !border !font-medium transition hover:scale-105"
                  color={
                    s === "resolved"
                      ? "green"
                      : s === "returned"
                        ? "red"
                        : s === "verifying"
                          ? "orange"
                          : s === "pending_assign"
                            ? "blue"
                            : "purple"
                  }
                  bordered
                >
                  {STATUS_LABELS[s]} · {count}
                </Tag>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[11px] text-slate-400">累计提交</div>
              <div className="font-serif text-xl font-semibold text-slate-900 mt-1">
                {myStats.submitted ||
                  myStats.claimed ||
                  myStats.totalReceived ||
                  0}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">已办结</div>
              <div className="font-serif text-xl font-semibold text-emerald-600 mt-1">
                {myStats.resolved || 0}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">我的角色</div>
              <div className="font-medium text-navy-700 mt-1">
                {user?.role === "operator"
                  ? "运营管理"
                  : user?.role === "verifier"
                    ? "核查专员"
                    : user?.role === "grid_member"
                      ? "网格员"
                      : "消费者"}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
