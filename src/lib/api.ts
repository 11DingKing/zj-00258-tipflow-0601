import type {
  User,
  Clue,
  OperationLog,
  Team,
  ClueLevel,
  ClueStatus,
  BacklogStats,
  TeamStats,
  ReporterType,
  VerifyResult,
  ClueMerge,
  ClueTransfer,
} from "../../shared/types";

const BASE = "/api";

function headers(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["X-User-Id"] = userId;
  return h;
}

function userId(): string | undefined {
  try {
    const raw = localStorage.getItem("current_user");
    if (raw) {
      const u = JSON.parse(raw) as User;
      return u.id;
    }
  } catch {}
  return undefined;
}

async function r<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { ...headers(userId()), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  login(username: string) {
    return r<{ success: boolean; user?: User; message?: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username }),
      },
    );
  },

  listClues(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== "" && v !== null,
        ),
      ) as any,
    ).toString();
    return r<{ list: Clue[]; total: number }>(`/clues${qs ? "?" + qs : ""}`);
  },

  getClue(id: string) {
    return r<{
      clue: Clue;
      operations: OperationLog[];
      merges: ClueMerge[];
      transfers: ClueTransfer[];
      relatedClues: Clue[];
    }>(`/clues/${id}`);
  },

  createClue(data: {
    appName: string;
    violationType: string;
    description: string;
    occurredAt: string;
    contact: string;
    reporterName: string;
    reporterType: ReporterType;
    reporterId: string;
  }) {
    return r<Clue>("/clues", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  gradeClue(id: string, level: ClueLevel) {
    return r<Clue>(`/clues/${id}/grade`, {
      method: "PUT",
      body: JSON.stringify({ level }),
    });
  },

  claimClue(id: string) {
    return r<Clue>(`/clues/${id}/claim`, { method: "PUT" });
  },

  assignClue(id: string, teamId: string) {
    return r<Clue>(`/clues/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ teamId }),
    });
  },

  rejectClue(id: string, reason: string) {
    return r<Clue>(`/clues/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  resolveClue(id: string, result: VerifyResult, note: string) {
    return r<Clue>(`/clues/${id}/resolve`, {
      method: "PUT",
      body: JSON.stringify({ result, note }),
    });
  },

  resubmitClue(id: string, extra: any) {
    return r<Clue>(`/clues/${id}/resubmit`, {
      method: "PUT",
      body: JSON.stringify(extra),
    });
  },

  mergeClues(id: string, childClueIds: string[], remark?: string) {
    return r<ClueMerge>(`/clues/${id}/merge`, {
      method: "PUT",
      body: JSON.stringify({ childClueIds, remark }),
    });
  },

  transferClue(id: string, targetTeamId: string, reason: string) {
    return r<ClueTransfer>(`/clues/${id}/transfer`, {
      method: "PUT",
      body: JSON.stringify({ targetTeamId, reason }),
    });
  },

  listTeams() {
    return r<Team[]>("/teams");
  },

  listApps() {
    return r<string[]>("/apps");
  },

  getBacklog() {
    return r<BacklogStats[]>("/statistics/backlog");
  },

  getTeamStats() {
    return r<TeamStats[]>("/statistics/teams");
  },

  getMyStats() {
    return r<any>("/statistics/my");
  },

  getTransferStats() {
    return r<{
      totalClues: number;
      transferredClues: number;
      transferRate: number;
      totalTransfers: number;
    }>("/statistics/transfer");
  },
};
