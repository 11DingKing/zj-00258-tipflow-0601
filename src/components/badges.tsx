import type { ClueLevel, ClueStatus } from "../../shared/types";
import { LEVEL_LABELS, STATUS_LABELS } from "../../shared/types";

const levelStyles: Record<ClueLevel, string> = {
  normal:
    "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
  urgent: "bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/10",
  critical: "bg-red-50 text-red-700 border-red-200 ring-red-500/10",
};

const levelDot: Record<ClueLevel, string> = {
  normal: "bg-emerald-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
};

export function LevelBadge({
  level,
  pulse = false,
}: {
  level: ClueLevel;
  pulse?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ring-1",
        levelStyles[level],
        pulse && level === "critical" ? "critical-pulse" : "",
      ].join(" ")}
    >
      <span
        className={["w-1.5 h-1.5 rounded-full", levelDot[level]].join(" ")}
      />
      {LEVEL_LABELS[level]}
    </span>
  );
}

const statusStyles: Record<ClueStatus, string> = {
  pending_grade: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pending_assign: "bg-sky-50 text-sky-700 border-sky-200",
  verifying: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  returned: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusIcon: Record<ClueStatus, string> = {
  pending_grade: "⌛",
  pending_assign: "📤",
  verifying: "🔍",
  resolved: "✅",
  returned: "↩️",
};

export function StatusBadge({ status }: { status: ClueStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
        statusStyles[status],
      ].join(" ")}
    >
      <span className="text-[10px]">{statusIcon[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}

export const reporterTypeLabel: Record<string, string> = {
  user: "普通用户",
  grid_member: "网格员",
};

export const verifyResultLabel: Record<string, string> = {
  confirmed: "属实",
  unconfirmed: "不属实",
  further_check: "进一步核实",
};
