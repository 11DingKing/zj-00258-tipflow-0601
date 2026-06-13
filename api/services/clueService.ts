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
  ClueMerge,
  ClueTransfer,
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
  violationType?: string;
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
  if (params.violationType)
    list = list.filter((c) => c.violationType === params.violationType);
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

export function getBacklogStats(params?: {
  startDate?: string;
  endDate?: string;
}): BacklogStat[] {
  const levels: ClueLevel[] = ["critical", "urgent", "normal"];
  const now = Date.now();

  let clues = [...db.data.clues].filter((c) => c.status !== "resolved");

  if (params?.startDate) {
    const start = new Date(params.startDate);
    clues = clues.filter((c) => new Date(c.createdAt) >= start);
  }
  if (params?.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59);
    clues = clues.filter((c) => new Date(c.createdAt) <= end);
  }

  return levels.map((level) => {
    const levelClues = clues.filter((c) => c.level === level);
    const pendingGrade = levelClues.filter((c) => c.status === "pending_grade");
    const pendingAssign = levelClues.filter(
      (c) => c.status === "pending_assign",
    );
    const verifying = levelClues.filter((c) => c.status === "verifying");
    const returned = levelClues.filter((c) => c.status === "returned");

    const waitSum = levelClues.reduce((acc, c) => {
      const ts = c.assignedAt || c.gradedAt || c.createdAt;
      return acc + Math.max(0, (now - new Date(ts).getTime()) / 3600000);
    }, 0);

    return {
      level,
      pendingGrade: pendingGrade.length,
      pendingAssign: pendingAssign.length,
      verifying: verifying.length,
      returned: returned.length,
      total: levelClues.length,
      avgWaitHours: levelClues.length
        ? Math.round((waitSum / levelClues.length) * 10) / 10
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
  transferOutCount: number;
  transferInCount: number;
  transferRate: number;
}

export function getTeamStats(params?: {
  startDate?: string;
  endDate?: string;
}): TeamStat[] {
  return db.data.teams
    .map((team) => {
      const allTeamClues = db.data.clues.filter(
        (c) => c.assignedTo === team.id || c.verifierTeamId === team.id,
      );

      let received = allTeamClues;
      let resolved = allTeamClues.filter((c) => c.status === "resolved");
      let inProgress = allTeamClues.filter((c) => c.status === "verifying");

      if (params?.startDate) {
        const start = new Date(params.startDate);
        received = received.filter(
          (c) => c.assignedAt && new Date(c.assignedAt) >= start,
        );
        resolved = resolved.filter(
          (c) => c.verifiedAt && new Date(c.verifiedAt) >= start,
        );
        inProgress = inProgress.filter(
          (c) => c.assignedAt && new Date(c.assignedAt) >= start,
        );
      }
      if (params?.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59);
        received = received.filter(
          (c) => c.assignedAt && new Date(c.assignedAt) <= end,
        );
        resolved = resolved.filter(
          (c) => c.verifiedAt && new Date(c.verifiedAt) <= end,
        );
        inProgress = inProgress.filter(
          (c) =>
            c.assignedAt &&
            new Date(c.assignedAt) <= end &&
            (!c.verifiedAt || new Date(c.verifiedAt) > end),
        );
      }

      let transferOut = db.data.clueTransfers.filter(
        (t) => t.fromTeamId === team.id,
      );
      let transferIn = db.data.clueTransfers.filter(
        (t) => t.toTeamId === team.id,
      );

      if (params?.startDate) {
        const start = new Date(params.startDate);
        transferOut = transferOut.filter((t) => new Date(t.createdAt) >= start);
        transferIn = transferIn.filter((t) => new Date(t.createdAt) >= start);
      }
      if (params?.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59);
        transferOut = transferOut.filter((t) => new Date(t.createdAt) <= end);
        transferIn = transferIn.filter((t) => new Date(t.createdAt) <= end);
      }

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
        transferOutCount: transferOut.length,
        transferInCount: transferIn.length,
        transferRate: received.length
          ? Math.round((transferOut.length / received.length) * 1000) / 10
          : 0,
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

export function getClueMergesByClueId(clueId: string): ClueMerge[] {
  return db.data.clueMerges.filter(
    (m) => m.masterClueId === clueId || m.childClueIds.includes(clueId),
  );
}

export function getClueTransfersByClueId(clueId: string): ClueTransfer[] {
  return db.data.clueTransfers
    .filter((t) => t.clueId === clueId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export function mergeClues(
  masterClueId: string,
  childClueIds: string[],
  remark: string | undefined,
  operator: User,
): ClueMerge | null {
  const master = getClueById(masterClueId);
  if (!master) throw new FlowError("主线索不存在");
  if (master.status === "resolved")
    throw new FlowError("已办结线索不可作为主线索进行合并");

  const validChildren: string[] = [];
  for (const cid of childClueIds) {
    if (cid === masterClueId) continue;
    const child = getClueById(cid);
    if (!child) continue;
    if (child.status === "resolved") continue;
    if (child.mergedParentId) continue;
    if (
      child.appName !== master.appName ||
      child.violationType !== master.violationType
    ) {
      throw new FlowError(
        `线索 ${cid} 与主线索的应用或违规类型不一致，无法合并`,
      );
    }
    validChildren.push(cid);
  }

  if (validChildren.length === 0) throw new FlowError("无可合并的有效线索");

  const merge: ClueMerge = {
    id: "mg_" + nanoid(8),
    masterClueId,
    childClueIds: validChildren,
    mergedBy: operator.id,
    mergedByName: operator.name,
    mergedAt: new Date().toISOString(),
    remark,
  };
  db.data.clueMerges.push(merge);

  master.isMergeMaster = true;
  master.mergedChildIds = Array.from(
    new Set([...(master.mergedChildIds || []), ...validChildren]),
  );

  for (const cid of validChildren) {
    const child = getClueById(cid);
    if (child) {
      child.mergedParentId = masterClueId;
      child.isMergeMaster = false;
      addLog({
        clueId: cid,
        operatorId: operator.id,
        operatorName: operator.name,
        action: "合并线索",
        detail: `已合并入主线索 ${masterClueId}${remark ? "；备注：" + remark : ""}`,
      });
    }
  }

  addLog({
    clueId: masterClueId,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "合并线索",
    detail: `合并 ${validChildren.length} 条子线索：${validChildren.join("、")}${remark ? "；备注：" + remark : ""}`,
  });

  return merge;
}

export function transferClue(
  clueId: string,
  targetTeamId: string,
  reason: string,
  operator: User,
): ClueTransfer | null {
  const clue = getClueById(clueId);
  if (!clue) throw new FlowError("线索不存在");
  if (TERMINAL_STATUSES.includes(clue.status))
    throw new FlowError("已办结线索不可转派");
  if (!clue.assignedTo && !clue.verifierTeamId)
    throw new FlowError("该线索尚未派发，无法转派");

  if (operator.role !== "operator" && operator.role !== "verifier") {
    throw new FlowError("您没有权限执行转派操作");
  }

  if (
    operator.role === "verifier" &&
    operator.teamId !== clue.verifierTeamId &&
    operator.teamId !== clue.assignedTo
  ) {
    throw new FlowError("仅线索所属核查组可发起转派");
  }

  if (!reason || reason.trim().length < 5) {
    throw new FlowError("请填写转派理由（至少5字）");
  }

  const targetTeam = db.data.teams.find((t) => t.id === targetTeamId);
  if (!targetTeam) throw new FlowError("目标核查组不存在");

  const fromTeamId = clue.verifierTeamId || clue.assignedTo!;
  const fromTeamName = clue.assignedToName || "";

  if (fromTeamId === targetTeamId) {
    throw new FlowError("目标组与当前组相同，无需转派");
  }

  const transfer: ClueTransfer = {
    id: "tr_" + nanoid(8),
    clueId,
    fromTeamId,
    fromTeamName,
    toTeamId: targetTeamId,
    toTeamName: targetTeam.name,
    reason: reason.trim(),
    operatorId: operator.id,
    operatorName: operator.name,
    createdAt: new Date().toISOString(),
  };
  db.data.clueTransfers.push(transfer);

  clue.assignedTo = targetTeamId;
  clue.assignedToName = targetTeam.name;
  clue.verifierTeamId = targetTeamId;
  clue.transferCount = (clue.transferCount || 0) + 1;

  if (clue.status !== "verifying") clue.status = "verifying";

  addLog({
    clueId,
    operatorId: operator.id,
    operatorName: operator.name,
    action: "转派线索",
    detail: `从「${fromTeamName}」转派至「${targetTeam.name}」，理由：${reason.trim()}`,
  });

  return transfer;
}

export function getMergeAndTransferForClue(clueId: string): {
  merges: ClueMerge[];
  transfers: ClueTransfer[];
  relatedClues: Clue[];
} {
  const merges = getClueMergesByClueId(clueId);
  const transfers = getClueTransfersByClueId(clueId);
  const relatedIds = new Set<string>();
  for (const m of merges) {
    relatedIds.add(m.masterClueId);
    m.childClueIds.forEach((c) => relatedIds.add(c));
  }
  relatedIds.delete(clueId);
  const relatedClues = db.data.clues.filter((c) => relatedIds.has(c.id));
  return { merges, transfers, relatedClues };
}

export function getOverallTransferStats(params?: {
  startDate?: string;
  endDate?: string;
}): {
  totalClues: number;
  transferredClues: number;
  transferRate: number;
  totalTransfers: number;
} {
  let clues = db.data.clues;
  let transfers = db.data.clueTransfers;

  if (params?.startDate) {
    const start = new Date(params.startDate);
    clues = clues.filter((c) => new Date(c.createdAt) >= start);
    transfers = transfers.filter((t) => new Date(t.createdAt) >= start);
  }
  if (params?.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59);
    clues = clues.filter((c) => new Date(c.createdAt) <= end);
    transfers = transfers.filter((t) => new Date(t.createdAt) <= end);
  }

  const transferred = clues.filter((c) => (c.transferCount || 0) > 0);
  const totalTransfers = transfers.length;
  return {
    totalClues: clues.length,
    transferredClues: transferred.length,
    transferRate: clues.length
      ? Math.round((transferred.length / clues.length) * 1000) / 10
      : 0,
    totalTransfers,
  };
}

export { db };
