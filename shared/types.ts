export type ClueLevel = "normal" | "urgent" | "critical";
export type ClueStatus =
  | "pending_grade"
  | "pending_assign"
  | "verifying"
  | "resolved"
  | "returned";
export type ReporterType = "user" | "grid_member";
export type UserRole = "reporter" | "grid_member" | "operator" | "verifier";
export type VerifyResult = "confirmed" | "unconfirmed" | "further_check";

export interface Clue {
  id: string;
  appName: string;
  violationType: string;
  description: string;
  occurredAt: string;
  contact: string;
  reporterName: string;
  reporterType: ReporterType;
  reporterId: string;
  attachments?: string[];
  level: ClueLevel;
  status: ClueStatus;
  createdAt: string;
  gradedAt?: string;
  gradedBy?: string;
  claimedBy?: string;
  claimedByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  verifierTeamId?: string;
  verifyResult?: VerifyResult;
  verifyNote?: string;
  verifiedAt?: string;
  returnReason?: string;
  returnedAt?: string;
  returnedBy?: string;
  resubmittedAt?: string;
  mergedParentId?: string;
  mergedChildIds?: string[];
  isMergeMaster?: boolean;
  transferCount?: number;
}

export interface Team {
  id: string;
  name: string;
  memberCount: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  teamId?: string;
}

export interface OperationLog {
  id: string;
  clueId: string;
  operatorId: string;
  operatorName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface TeamStats {
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

export interface ClueMerge {
  id: string;
  masterClueId: string;
  childClueIds: string[];
  mergedBy: string;
  mergedByName: string;
  mergedAt: string;
  remark?: string;
}

export interface ClueTransfer {
  id: string;
  clueId: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  reason: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface BacklogStats {
  level: ClueLevel;
  pendingGrade: number;
  pendingAssign: number;
  verifying: number;
  returned: number;
  total: number;
  avgWaitHours: number;
}

export type LevelMap = {
  [K in ClueLevel]: string;
};

export type StatusMap = {
  [K in ClueStatus]: string;
};

export const LEVEL_LABELS: LevelMap = {
  normal: "一般",
  urgent: "紧急",
  critical: "重大",
};

export const STATUS_LABELS: StatusMap = {
  pending_grade: "待分级",
  pending_assign: "待派发",
  verifying: "核查中",
  resolved: "已办结",
  returned: "退回补充",
};

export const VIOLATION_TYPES = [
  "强制跳转",
  "诱导下载",
  "弹窗跳转",
  "广告误触",
  "恶意链接",
  "隐私窃取",
  "骗取点击",
  "虚假宣传",
  "其他违规",
];

export const APP_LIST = [
  "某购物APP",
  "某支付APP",
  "某短视频APP",
  "某新闻APP",
  "某社交APP",
  "某外卖APP",
  "某打车APP",
  "某旅行APP",
  "某游戏APP",
  "某理财APP",
  "某教育APP",
  "某医疗APP",
];
