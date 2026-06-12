import { db, initDb } from "../db/lowdb.js";
import {
  seedUsers,
  seedTeams,
  generateSeedClues,
  generateSeedOperations,
} from "../db/seed.js";
import type {
  Clue,
  ClueLevel,
  ClueStatus,
  OperationLog,
  Team,
  User,
  ReporterType,
} from "../../shared/types.js";
import { nanoid } from "nanoid";

export class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowError";
  }
}

const TERMINAL_STATUSES: ClueStatus[] = ["resolved"];

const STATE_TRANSITIONS: Record<
  string,
  { from: ClueStatus[]; to: ClueStatus; allowedRoles: string[] }
> = {
  grade: {
    from: ["pending_grade"],
    to: "pending_assign",
    allowedRoles: ["operator"],
  },
  claim: {
    from: ["pending_grade"],
    to: "pending_assign",
    allowedRoles: ["operator"],
  },
  assign: {
    from: ["pending_assign"],
    to: "verifying",
    allowedRoles: ["operator"],
  },
  return: {
    from: ["pending_assign", "verifying"],
    to: "returned",
    allowedRoles: ["operator", "verifier"],
  },
  resolve: {
    from: ["verifying"],
    to: "resolved",
    allowedRoles: ["verifier"],
  },
  resubmit: {
    from: ["returned"],
    to: "pending_grade",
    allowedRoles: ["reporter", "grid_member"],
  },
};

function validateTransition(
  clue: Clue,
  action: keyof typeof STATE_TRANSITIONS,
  operator: User,
): void {
  const rule = STATE_TRANSITIONS[action];
  if (!rule) throw new FlowError(`未知操作: ${action}`);

  if (TERMINAL_STATUSES.includes(clue.status)) {
    throw new FlowError("该线索已办结，无法进行此操作");
  }

  if (!rule.from.includes(clue.status)) {
    const statusLabels: Record<ClueStatus, string> = {
      pending_grade: "待分级",
      pending_assign: "待派发",
      verifying: "核查中",
      resolved: "已办结",
      returned: "退回补充",
    };
    const allowedFrom = rule.from.map((s) => statusLabels[s]).join("、");
    throw new FlowError(
      `当前状态「${statusLabels[clue.status]}」不允许此操作，仅支持从「${allowedFrom}」状态进行`,
    );
  }

  if (!rule.allowedRoles.includes(operator.role)) {
    throw new FlowError("您没有权限执行此操作");
  }

  if (action === "resolve" && operator.teamId !== clue.verifierTeamId) {
    throw new FlowError("仅线索所属核查组可办结");
  }

  if (action === "resubmit" && operator.id !== clue.reporterId) {
    throw new FlowError("仅举报人可重新提交");
  }

  if (action === "assign" && !clue.gradedAt) {
    throw new FlowError("请先完成分级后再派发");
  }
}

function clearFlowFields(clue: Clue, targetStatus: ClueStatus): void {
  if (targetStatus === "pending_grade") {
    delete clue.gradedAt;
    delete clue.gradedBy;
    delete clue.claimedBy;
    delete clue.claimedByName;
    delete clue.assignedTo;
    delete clue.assignedToName;
    delete clue.assignedAt;
    delete clue.verifierTeamId;
    delete clue.verifyResult;
    delete clue.verifyNote;
    delete clue.verifiedAt;
    delete clue.returnReason;
    delete clue.returnedAt;
    delete clue.returnedBy;
  } else if (targetStatus === "returned") {
    delete clue.verifyResult;
    delete clue.verifyNote;
    delete clue.verifiedAt;
  } else if (targetStatus === "pending_assign") {
    delete clue.assignedTo;
    delete clue.assignedToName;
    delete clue.assignedAt;
    delete clue.verifierTeamId;
    delete clue.verifyResult;
    delete clue.verifyNote;
    delete clue.verifiedAt;
  }
}

export async function ensureData() {
  await initDb();
  if (!db.data.users.length) {
    db.data.users = seedUsers;
    db.data.teams = seedTeams;
    const clues = generateSeedClues();
    db.data.clues = clues;
    db.data.operations = generateSeedOperations(clues);
    await db.write();
  }
}

export function autoGrade(clue: {
  appName: string;
  violationType: string;
  description: string;
}): ClueLevel {
  const financeApps = ["某支付APP", "某理财APP", "某银行APP"];
  const socialMassApps = ["某购物APP", "某社交APP", "某短视频APP"];
  const seriousViolations = ["强制跳转", "恶意链接", "隐私窃取"];
  const midViolations = ["诱导下载", "骗取点击", "虚假宣传"];

  const app = clue.appName || "";
  const v = clue.violationType || "";
  const desc = (clue.description || "").toLowerCase();

  if (
    financeApps.includes(app) &&
    (seriousViolations.includes(v) ||
      desc.includes("钱") ||
      desc.includes("支付"))
  ) {
    return "critical";
  }
  if (socialMassApps.includes(app) && seriousViolations.includes(v)) {
    return "critical";
  }
  if (
    desc.includes("多次") ||
    desc.includes("频繁") ||
    desc.includes("批量") ||
    desc.includes("大量")
  ) {
    if (seriousViolations.includes(v) || midViolations.includes(v))
      return "critical";
  }
  if (midViolations.includes(v) && socialMassApps.includes(app)) {
    return "urgent";
  }
  if (seriousViolations.includes(v)) {
    return "urgent";
  }
  return "normal";
}

export interface QueryParams {
  level?: ClueLevel;
  status?: ClueStatus;
  keyword?: string;
  appName?: string;
  teamId?: string;
  userId?: string;
  role?: string;
  reporterId?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

export function queryClues(params: QueryParams = {}): {
  list: Clue[];
  total: number;
} {
  let list = [...db.data.clues];

  if (params.level) list = list.filter((c) => c.level === params.level);
  if (params.status) list = list.filter((c) => c.status === params.status);
  if (params.appName) list = list.filter((c) => c.appName === params.appName);
  if (params.teamId)
    list = list.filter(
      (c) =>
        c.verifierTeamId === params.teamId || c.assignedTo === params.teamId,
    );
  if (params.reporterId)
    list = list.filter((c) => c.reporterId === params.reporterId);

  if (params.userId && params.role) {
    if (params.role === "operator") {
      list = list.filter(
        (c) => c.claimedBy === params.userId || c.status !== "resolved",
      );
    } else if (params.role === "verifier") {
      const user = db.data.users.find((u) => u.id === params.userId);
      if (user?.teamId) {
        list = list.filter(
          (c) =>
            c.assignedTo === user.teamId || c.verifierTeamId === user.teamId,
        );
      }
    } else if (params.role === "reporter" || params.role === "grid_member") {
      list = list.filter((c) => c.reporterId === params.userId);
    }
  }

  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    list = list.filter(
      (c) =>
        c.appName.toLowerCase().includes(kw) ||
        c.description.toLowerCase().includes(kw) ||
        c.id.toLowerCase().includes(kw) ||
        c.violationType.toLowerCase().includes(kw),
    );
  }

  if (params.startDate) {
    list = list.filter(
      (c) => new Date(c.createdAt) >= new Date(params.startDate!),
    );
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59);
    list = list.filter((c) => new Date(c.createdAt) <= end);
  }

  list.sort((a, b) => {
    const levelOrder: Record<ClueLevel, number> = {
      critical: 0,
      urgent: 1,
      normal: 2,
    };
    if (levelOrder[a.level] !== levelOrder[b.level])
      return levelOrder[a.level] - levelOrder[b.level];
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = list.length;
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  list = list.slice((page - 1) * pageSize, page * pageSize);

  return { list, total };
}

export function getClueById(id: string): Clue | undefined {
  return db.data.clues.find((c) => c.id === id);
}

export function getOperationsByClueId(clueId: string): OperationLog[] {
  return db.data.operations
    .filter((o) => o.clueId === clueId)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

export function addLog(log: Omit<OperationLog, "id" | "timestamp">) {
  db.data.operations.push({
    ...log,
    id: "op_" + nanoid(8),
    timestamp: new Date().toISOString(),
  });
}

export interface CreateClueInput {
  appName: string;
  violationType: string;
  description: string;
  occurredAt: string;
  contact: string;
  reporterName: string;
  reporterType: ReporterType;
  reporterId: string;
  attachments?: string[];
}

export function createClue(input: CreateClueInput): Clue {
  const level = autoGrade(input);
  const clue: Clue = {
    id: "c" + nanoid(8),
    ...input,
    level,
    status: "pending_grade",
    createdAt: new Date().toISOString(),
  };
  db.data.clues.unshift(clue);
  addLog({
    clueId: clue.id,
    operatorId: clue.reporterId,
    operatorName: clue.reporterName,
    action: "提交举报",
    detail: `系统自动分级为「${level === "critical" ? "重大" : level === "urgent" ? "紧急" : "一般"}」`,
  });
  return clue;
}

export function updateClueLevel(
  id: string,
  level: ClueLevel,
  operator: User,
): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "grade", operator);
  clue.level = level;
  clue.gradedAt = new Date().toISOString();
  clue.gradedBy = operator.id;
  clue.status = "pending_assign";
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "确认分级",
    detail: `调整为「${level === "critical" ? "重大" : level === "urgent" ? "紧急" : "一般"}」等级`,
  });
  return clue;
}

export function claimClue(id: string, operator: User): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "claim", operator);
  clue.claimedBy = operator.id;
  clue.claimedByName = operator.name;
  if (clue.status === "pending_grade" && !clue.gradedAt) {
    clue.gradedAt = new Date().toISOString();
    clue.gradedBy = operator.id;
  }
  clue.status = "pending_assign";
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "认领线索",
    detail: "运营认领，准备派发核查",
  });
  return clue;
}

export function assignClue(
  id: string,
  teamId: string,
  operator: User,
): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "assign", operator);
  const team = db.data.teams.find((t) => t.id === teamId);
  clue.assignedTo = teamId;
  clue.assignedToName = team?.name;
  clue.verifierTeamId = teamId;
  clue.assignedAt = new Date().toISOString();
  clue.status = "verifying";
  if (!clue.claimedBy) {
    clue.claimedBy = operator.id;
    clue.claimedByName = operator.name;
  }
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "派发线索",
    detail: `派发至「${team?.name}」`,
  });
  return clue;
}

export function returnClue(
  id: string,
  reason: string,
  operator: User,
): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "return", operator);
  clearFlowFields(clue, "returned");
  clue.status = "returned";
  clue.returnReason = reason;
  clue.returnedAt = new Date().toISOString();
  clue.returnedBy = operator.id;
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "退回补充",
    detail: reason,
  });
  return clue;
}

export function resolveClue(
  id: string,
  result: "confirmed" | "unconfirmed" | "further_check",
  note: string,
  operator: User,
): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "resolve", operator);
  clue.status = "resolved";
  clue.verifyResult = result;
  clue.verifyNote = note;
  clue.verifiedAt = new Date().toISOString();
  const resultMap = {
    confirmed: "违规属实",
    unconfirmed: "不属实",
    further_check: "进一步核查",
  };
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "核查办结",
    detail: `结论：${resultMap[result]}；${note}`,
  });
  return clue;
}

export function resubmitClue(
  id: string,
  extra: Partial<CreateClueInput>,
  operator: User,
): Clue | null {
  const clue = getClueById(id);
  if (!clue) return null;
  validateTransition(clue, "resubmit", operator);
  if (extra.description) clue.description = extra.description;
  if (extra.appName) clue.appName = extra.appName;
  if (extra.contact) clue.contact = extra.contact;
  clue.level = autoGrade(clue);
  clearFlowFields(clue, "pending_grade");
  clue.status = "pending_grade";
  clue.resubmittedAt = new Date().toISOString();
  addLog({
    clueId: id,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "补充材料重新提交",
    detail: "已补充材料，进入待分级",
  });
  return clue;
}

export function getTeams(): Team[] {
  return db.data.teams;
}

export function getApps(): string[] {
  return Array.from(new Set(db.data.clues.map((c) => c.appName))).sort();
}

export interface BacklogStat {
  level: ClueLevel;
  pendingGrade: number;
  pendingAssign: number;
  verifying: number;
  returned: number;
  total: number;
  avgWaitHours: number;
}

export function getBacklogStats(): BacklogStat[] {
  const levels: ClueLevel[] = ["critical", "urgent", "normal"];
  const now = Date.now();

  return levels.map((level) => {
    const clues = db.data.clues.filter(
      (c) => c.level === level && c.status !== "resolved",
    );
    const pendingGrade = clues.filter((c) => c.status === "pending_grade");
    const pendingAssign = clues.filter((c) => c.status === "pending_assign");
    const verifying = clues.filter((c) => c.status === "verifying");
    const returned = clues.filter((c) => c.status === "returned");

    const waitSum = clues.reduce((acc, c) => {
      const ts = c.assignedAt || c.gradedAt || c.createdAt;
      return acc + Math.max(0, (now - new Date(ts).getTime()) / 3600000);
    }, 0);

    return {
      level,
      pendingGrade: pendingGrade.length,
      pendingAssign: pendingAssign.length,
      verifying: verifying.length,
      returned: returned.length,
      total: clues.length,
      avgWaitHours: clues.length
        ? Math.round((waitSum / clues.length) * 10) / 10
        : 0,
    };
  });
}

export interface TeamStat {
  teamId: string;
  teamName: string;
  resolvedCount: number;
  avgHours: number;
  slaRate: number;
  totalReceived: number;
  inProgress: number;
}

export function getTeamStats(): TeamStat[] {
  return db.data.teams
    .map((team) => {
      const received = db.data.clues.filter(
        (c) => c.assignedTo === team.id || c.verifierTeamId === team.id,
      );
      const resolved = received.filter((c) => c.status === "resolved");
      const inProgress = received.filter((c) => c.status === "verifying");
      let totalHours = 0;
      let slaMet = 0;
      const levelSLA = { critical: 24, urgent: 48, normal: 72 };

      resolved.forEach((c) => {
        if (c.assignedAt && c.verifiedAt) {
          const h =
            (new Date(c.verifiedAt).getTime() -
              new Date(c.assignedAt).getTime()) /
            3600000;
          totalHours += h;
          if (h <= levelSLA[c.level]) slaMet++;
        }
      });

      return {
        teamId: team.id,
        teamName: team.name,
        resolvedCount: resolved.length,
        avgHours: resolved.length
          ? Math.round((totalHours / resolved.length) * 10) / 10
          : 0,
        slaRate: resolved.length
          ? Math.round((slaMet / resolved.length) * 100)
          : 0,
        totalReceived: received.length,
        inProgress: inProgress.length,
      };
    })
    .sort((a, b) => b.resolvedCount - a.resolvedCount);
}

export interface MyStats {
  submitted: number;
  claimed: number;
  assigned: number;
  resolved: number;
  totalReceived?: number;
  byStatus: Record<string, number>;
}

export function getMyStats(user: User): MyStats {
  const clues = db.data.clues;
  const stat: MyStats = {
    submitted: 0,
    claimed: 0,
    assigned: 0,
    resolved: 0,
    byStatus: {},
  };

  if (user.role === "reporter" || user.role === "grid_member") {
    const mine = clues.filter((c) => c.reporterId === user.id);
    stat.submitted = mine.length;
    mine.forEach((c) => {
      stat.byStatus[c.status] = (stat.byStatus[c.status] || 0) + 1;
    });
  } else if (user.role === "operator") {
    stat.claimed = clues.filter((c) => c.claimedBy === user.id).length;
    stat.assigned = clues.filter(
      (c) => c.claimedBy === user.id && c.assignedAt,
    ).length;
    clues.forEach((c) => {
      if (c.claimedBy === user.id || c.gradedBy === user.id) {
        stat.byStatus[c.status] = (stat.byStatus[c.status] || 0) + 1;
      }
    });
  } else if (user.role === "verifier") {
    const mine = clues.filter(
      (c) => c.assignedTo === user.teamId || c.verifierTeamId === user.teamId,
    );
    stat.totalReceived = mine.length;
    stat.resolved = mine.filter((c) => c.status === "resolved").length;
    mine.forEach((c) => {
      stat.byStatus[c.status] = (stat.byStatus[c.status] || 0) + 1;
    });
  }

  return stat;
}

export function findUserByUsername(username: string): User | undefined {
  return db.data.users.find((u) => u.username === username);
}

export function getUserById(id: string): User | undefined {
  return db.data.users.find((u) => u.id === id);
}

export { db };
