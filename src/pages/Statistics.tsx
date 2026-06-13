import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
} from "recharts";
import { Card, Empty, Segmented, Spin, Tag } from "antd";
import {
  Trophy,
  Target,
  Gauge,
  Clock,
  Users,
  CheckCircle2,
  BarChart3,
  TrendingDown,
  Zap,
  AlertTriangle,
  Activity,
  Shuffle,
  Repeat,
} from "lucide-react";
import { api } from "../lib/api";
import type { ClueLevel, TeamStats } from "../../shared/types";
import { LEVEL_LABELS } from "../../shared/types";
import dayjs from "dayjs";

const PIE_COLORS = {
  critical: "#EF4444",
  urgent: "#FF6B35",
  normal: "#10B981",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  suffix = "",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  suffix?: string;
}) {
  return (
    <Card
      className="border-0 shadow-card animate-fade-in hover:shadow-card-hover transition-shadow"
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1.5 font-serif text-2xl font-semibold text-slate-900">
            {value}
            {suffix}
          </div>
          {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
        </div>
        <div
          className={[
            "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm",
            accent,
          ].join(" ")}
        >
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

export default function StatisticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [backlog, setBacklog] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferStats, setTransferStats] = useState<{
    totalClues: number;
    transferredClues: number;
    transferRate: number;
    totalTransfers: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, b, cluesRes, ts] = await Promise.all([
          api.getTeamStats(),
          api.getBacklog(),
          api.listClues({ pageSize: 999 }),
          api.getTransferStats(),
        ]);
        setTeams(t);
        setBacklog(b);
        setTransferStats(ts);

        // 构建趋势数据（按最近 7 天）
        const days = 7;
        const now = dayjs();
        const trendData: any[] = [];
        const clues = cluesRes.list;
        for (let i = days - 1; i >= 0; i--) {
          const d = now.subtract(i, "day");
          const dk = d.format("MM-DD");
          const dayClues = clues.filter((c) =>
            dayjs(c.createdAt).isSame(d, "day"),
          );
          const resolvedDay = clues.filter(
            (c) => c.verifiedAt && dayjs(c.verifiedAt).isSame(d, "day"),
          );
          trendData.push({
            date: dk,
            新增: dayClues.length,
            办结: resolvedDay.length,
            重大: dayClues.filter((c) => c.level === "critical").length,
            紧急: dayClues.filter((c) => c.level === "urgent").length,
            一般: dayClues.filter((c) => c.level === "normal").length,
          });
        }
        setTrend(trendData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalResolved = teams.reduce((a, b) => a + b.resolvedCount, 0);
  const totalReceived = teams.reduce((a, b) => a + b.totalReceived, 0);
  const overallSla = teams.length
    ? Math.round(teams.reduce((a, b) => a + b.slaRate, 0) / teams.length)
    : 0;
  const overallAvg = totalResolved
    ? Math.round(
        (teams.reduce((a, b) => a + b.avgHours * b.resolvedCount, 0) /
          totalResolved) *
          10,
      ) / 10
    : 0;
  const totalBacklog = backlog.reduce((a, b) => a + b.total, 0);

  const pieData = backlog.map((b) => ({
    name: LEVEL_LABELS[b.level as ClueLevel],
    value: b.total,
    level: b.level,
  }));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-navy-700" />
          <h2 className="font-serif text-xl text-slate-900">核查组效能统计</h2>
          <Tag color="orange" className="!ml-2 !text-xs">
            618 大促时段
          </Tag>
        </div>
        <Segmented
          value={range}
          onChange={(v) => setRange(v as any)}
          options={[
            { label: "近7天", value: "7d" },
            { label: "近30天", value: "30d" },
            { label: "全部", value: "all" },
          ]}
        />
      </div>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Target}
          label="累计接收"
          value={totalReceived}
          sub="各核查组累计派单"
          accent="bg-gradient-to-br from-navy-500 to-navy-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="累计办结"
          value={totalResolved}
          sub={`办结率 ${totalReceived ? Math.round((totalResolved / totalReceived) * 100) : 0}%`}
          accent="bg-gradient-to-br from-emerald-400 to-emerald-600"
        />
        <StatCard
          icon={Gauge}
          label="平均处理时长"
          value={overallAvg}
          suffix="h"
          sub="从派发到办结"
          accent="bg-gradient-to-br from-sky-400 to-sky-600"
        />
        <StatCard
          icon={Trophy}
          label="SLA达标率"
          value={overallSla}
          suffix="%"
          sub="在规定时限内办结"
          accent="bg-gradient-to-br from-brand-400 to-brand-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="当前积压"
          value={totalBacklog}
          sub={`重大${backlog.find((b) => b.level === "critical")?.total || 0}条`}
          accent="bg-gradient-to-br from-red-400 to-red-600"
        />
        <StatCard
          icon={Shuffle}
          label="转派率"
          value={transferStats?.transferRate ?? 0}
          suffix="%"
          sub={`涉及 ${transferStats?.transferredClues ?? 0} 条线索，共 ${transferStats?.totalTransfers ?? 0} 次转派`}
          accent="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      <Spin spinning={loading}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 办结量排行 */}
          <Card
            className="lg:col-span-2 border-0 shadow-card"
            style={{ borderRadius: 16 }}
            title={
              <span className="font-serif text-base flex items-center gap-2">
                <Trophy size={16} className="text-brand-500" />
                各组办结量排行
              </span>
            }
            styles={{ body: { padding: 20 } }}
          >
            {teams.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teams}
                    margin={{ left: 8, right: 20, top: 10, bottom: 0 }}
                    barCategoryGap={18}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F1F5F9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="teamName"
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(t: string) =>
                        t.length > 8 ? t.slice(0, 8) + "..." : t
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: 0,
                        boxShadow: "0 12px 32px rgba(15,39,71,0.12)",
                        fontSize: 12,
                        padding: 12,
                      }}
                      cursor={{ fill: "rgba(255,107,53,0.05)" }}
                      formatter={(v: any, n: string) => {
                        if (n === "平均时长") return [`${v} h`, "平均处理时长"];
                        if (n === "处理中") return [v, "处理中"];
                        return [v, n];
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    />
                    <Bar
                      dataKey="resolvedCount"
                      name="已办结"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    >
                      {teams.map((t, i) => (
                        <Cell
                          key={i}
                          fill={
                            ["#0F2747", "#2563EB", "#FF6B35", "#10B981"][i % 4]
                          }
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="inProgress"
                      name="处理中"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                      fill="#FDE68A"
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* 积压等级分布 */}
          <Card
            className="border-0 shadow-card"
            style={{ borderRadius: 16 }}
            title={
              <span className="font-serif text-base flex items-center gap-2">
                <Activity size={16} className="text-red-500" />
                积压等级分布
              </span>
            }
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[entry.level as ClueLevel]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: 0,
                      boxShadow: "0 12px 32px rgba(15,39,71,0.12)",
                      fontSize: 12,
                    }}
                    formatter={(v: any) => [`${v} 条`, "积压量"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {pieData.map((p) => (
                <div key={p.level} className="text-center">
                  <div
                    className="w-2.5 h-2.5 rounded-full mx-auto"
                    style={{ background: PIE_COLORS[p.level as ClueLevel] }}
                  />
                  <div className="text-[11px] text-slate-500 mt-1">
                    {p.name}
                  </div>
                  <div className="font-serif font-semibold text-slate-800 text-sm">
                    {p.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 趋势图 + 明细表 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card
            className="lg:col-span-2 border-0 shadow-card"
            style={{ borderRadius: 16 }}
            title={
              <span className="font-serif text-base flex items-center gap-2">
                <TrendingDown size={16} className="text-navy-700" />
                每日新增/办结趋势
              </span>
            }
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trend}
                  margin={{ left: 4, right: 20, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#0F2747"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#0F2747" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10B981"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F1F5F9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: 0,
                      boxShadow: "0 12px 32px rgba(15,39,71,0.12)",
                      fontSize: 12,
                      padding: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="新增"
                    stroke="#0F2747"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="办结"
                    stroke="#10B981"
                    fill="url(#g2)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="重大"
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    dot={{ r: 3, strokeWidth: 1 }}
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="紧急"
                    stroke="#FF6B35"
                    strokeWidth={1.5}
                    dot={{ r: 2.5, strokeWidth: 1 }}
                    strokeDasharray="2 2"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            className="border-0 shadow-card"
            style={{ borderRadius: 16 }}
            title={
              <span className="font-serif text-base flex items-center gap-2">
                <Users size={16} className="text-sky-500" />
                处理时效明细
              </span>
            }
            styles={{ body: { padding: 20 } }}
          >
            <div className="space-y-3">
              {teams.map((t, i) => (
                <div
                  key={t.teamId}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-700">
                      {t.teamName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t.avgHours}h / {t.slaRate}%
                    </span>
                  </div>
                  <div className="relative h-6 bg-slate-50 rounded-md overflow-hidden">
                    <div
                      className={[
                        "absolute inset-y-0 left-0 rounded-md flex items-center justify-end pr-2 text-[10px] font-semibold text-white",
                        i === 0
                          ? "bg-gradient-to-r from-navy-700 to-navy-500"
                          : i === 1
                            ? "bg-gradient-to-r from-indigo-700 to-indigo-500"
                            : i === 2
                              ? "bg-gradient-to-r from-brand-700 to-brand-500"
                              : "bg-gradient-to-r from-emerald-700 to-emerald-500",
                      ].join(" ")}
                      style={{
                        width: `${Math.min(100, Math.max(5, t.totalReceived ? (t.resolvedCount / t.totalReceived) * 100 : 0))}%`,
                      }}
                    >
                      {t.resolvedCount}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      处理中 {t.inProgress}
                    </span>
                    <span
                      className={[
                        "flex items-center gap-0.5 font-medium",
                        t.slaRate >= 90
                          ? "text-emerald-600"
                          : t.slaRate >= 70
                            ? "text-amber-600"
                            : "text-rose-600",
                      ].join(" ")}
                    >
                      <Zap size={9} /> SLA
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">整体SLA</span>
                <span className="font-semibold text-slate-900">
                  {overallSla}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    overallSla >= 90
                      ? "bg-emerald-500"
                      : overallSla >= 70
                        ? "bg-amber-500"
                        : "bg-rose-500",
                  ].join(" ")}
                  style={{ width: `${overallSla}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock size={10} /> 平均时长
                </span>
                <span className="font-semibold text-slate-900">
                  {overallAvg} 小时
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* 全量详情表 */}
        <Card
          className="border-0 shadow-card"
          style={{ borderRadius: 16 }}
          title={
            <span className="font-serif text-base flex items-center gap-2">
              <Gauge size={16} />
              核查组效能全景
            </span>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="text-left font-medium px-5 py-3">核查组</th>
                  <th className="text-center font-medium px-4 py-3">成员</th>
                  <th className="text-center font-medium px-4 py-3">
                    累计接收
                  </th>
                  <th className="text-center font-medium px-4 py-3">已办结</th>
                  <th className="text-center font-medium px-4 py-3">处理中</th>
                  <th className="text-center font-medium px-4 py-3">办结率</th>
                  <th className="text-center font-medium px-4 py-3">
                    平均处理
                  </th>
                  <th className="text-center font-medium px-4 py-3">转出</th>
                  <th className="text-center font-medium px-4 py-3">转入</th>
                  <th className="text-center font-medium px-4 py-3">转派率</th>
                  <th className="text-center font-medium px-4 py-3">
                    SLA 达标率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teams.map((t, i) => (
                  <tr
                    key={t.teamId}
                    className="hover:bg-navy-50/30 transition animate-fade-in"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
                          style={{
                            background: [
                              "#0F2747",
                              "#2563EB",
                              "#FF6B35",
                              "#10B981",
                            ][i % 4],
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {t.teamName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3.5 text-slate-600 text-xs">
                      {[5, 4, 6, 3][i % 4]}人
                    </td>
                    <td className="text-center px-4 py-3.5 font-medium text-slate-800">
                      {t.totalReceived}
                    </td>
                    <td className="text-center px-4 py-3.5 font-semibold text-emerald-600">
                      {t.resolvedCount}
                    </td>
                    <td className="text-center px-4 py-3.5 text-amber-600">
                      {t.inProgress}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span
                        className={[
                          "font-semibold",
                          t.totalReceived &&
                          t.resolvedCount / t.totalReceived >= 0.8
                            ? "text-emerald-600"
                            : "text-amber-600",
                        ].join(" ")}
                      >
                        {t.totalReceived
                          ? Math.round(
                              (t.resolvedCount / t.totalReceived) * 100,
                            )
                          : 0}
                        %
                      </span>
                    </td>
                    <td className="text-center px-4 py-3.5 font-mono text-slate-700">
                      {t.avgHours}h
                    </td>
                    <td className="text-center px-4 py-3.5 text-rose-600 font-medium">
                      {t.transferOutCount || 0}
                    </td>
                    <td className="text-center px-4 py-3.5 text-sky-600 font-medium">
                      {t.transferInCount || 0}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span
                        className={[
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                          (t.transferRate || 0) >= 20
                            ? "bg-rose-50 text-rose-700"
                            : (t.transferRate || 0) >= 10
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {t.transferRate || 0}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span
                        className={[
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                          t.slaRate >= 90
                            ? "bg-emerald-50 text-emerald-700"
                            : t.slaRate >= 70
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700",
                        ].join(" ")}
                      >
                        {t.slaRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Spin>
    </div>
  );
}
