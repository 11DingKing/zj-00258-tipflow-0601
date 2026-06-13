import { Router, Request, Response, NextFunction } from "express";
import * as service from "../services/clueService.js";
import type { User } from "../../shared/types";

export const router = Router();

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

router.use((req, res, next) => {
  const userId = req.header("X-User-Id");
  if (userId) {
    const u = service.getUserById(userId);
    if (u) req.currentUser = u;
  }
  next();
});

router.get("/teams", async (_req, res) => {
  await service.ensureData();
  res.json(service.getTeams());
});

router.get("/apps", async (_req, res) => {
  await service.ensureData();
  res.json(service.getApps());
});

router.get("/clues", async (req, res) => {
  await service.ensureData();
  const result = service.queryClues({
    ...(req.query as any),
    userId: req.currentUser?.id,
    role: req.currentUser?.role,
  });
  res.json(result);
});

router.get("/clues/:id", async (req, res) => {
  await service.ensureData();
  const clue = service.getClueById(req.params.id);
  if (!clue) return res.status(404).json({ message: "线索不存在" });
  const operations = service.getOperationsByClueId(req.params.id);
  const extra = service.getMergeAndTransferForClue(req.params.id);
  res.json({ clue, operations, ...extra });
});

router.post("/clues", async (req, res) => {
  await service.ensureData();
  const clue = service.createClue(req.body);
  await service.db.write();
  res.status(201).json(clue);
});

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) return res.status(401).json({ message: "未登录" });
    if (!roles.includes(req.currentUser.role))
      return res.status(403).json({ message: "无权限" });
    next();
  };
}

router.put("/clues/:id/grade", requireRole(["operator"]), async (req, res) => {
  try {
    const { level } = req.body;
    const clue = service.updateClueLevel(
      req.params.id,
      level,
      req.currentUser!,
    );
    if (!clue) return res.status(404).json({ message: "线索不存在" });
    await service.db.write();
    res.json(clue);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/clues/:id/claim", requireRole(["operator"]), async (req, res) => {
  try {
    const clue = service.claimClue(req.params.id, req.currentUser!);
    if (!clue) return res.status(404).json({ message: "线索不存在" });
    await service.db.write();
    res.json(clue);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/clues/:id/assign", requireRole(["operator"]), async (req, res) => {
  try {
    const { teamId } = req.body;
    const clue = service.assignClue(req.params.id, teamId, req.currentUser!);
    if (!clue) return res.status(404).json({ message: "线索不存在" });
    await service.db.write();
    res.json(clue);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put(
  "/clues/:id/reject",
  requireRole(["operator", "verifier"]),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const clue = service.returnClue(req.params.id, reason, req.currentUser!);
      if (!clue) return res.status(404).json({ message: "线索不存在" });
      await service.db.write();
      res.json(clue);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  },
);

router.put(
  "/clues/:id/resolve",
  requireRole(["verifier"]),
  async (req, res) => {
    try {
      const { result, note } = req.body;
      const clue = service.resolveClue(
        req.params.id,
        result,
        note,
        req.currentUser!,
      );
      if (!clue) return res.status(404).json({ message: "线索不存在" });
      await service.db.write();
      res.json(clue);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  },
);

router.put(
  "/clues/:id/resubmit",
  requireRole(["reporter", "grid_member"]),
  async (req, res) => {
    try {
      const clue = service.resubmitClue(
        req.params.id,
        req.body || {},
        req.currentUser!,
      );
      if (!clue) return res.status(404).json({ message: "线索不存在" });
      await service.db.write();
      res.json(clue);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  },
);

router.put("/clues/:id/merge", requireRole(["operator"]), async (req, res) => {
  try {
    const { childClueIds, remark } = req.body;
    if (!Array.isArray(childClueIds) || childClueIds.length === 0) {
      return res.status(400).json({ message: "请选择要合并的线索" });
    }
    const merge = service.mergeClues(
      req.params.id,
      childClueIds,
      remark,
      req.currentUser!,
    );
    if (!merge) return res.status(404).json({ message: "线索不存在" });
    await service.db.write();
    res.json(merge);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put(
  "/clues/:id/transfer",
  requireRole(["operator", "verifier"]),
  async (req, res) => {
    try {
      const { targetTeamId, reason } = req.body;
      if (!targetTeamId) {
        return res.status(400).json({ message: "请选择目标核查组" });
      }
      const transfer = service.transferClue(
        req.params.id,
        targetTeamId,
        reason || "",
        req.currentUser!,
      );
      if (!transfer) return res.status(404).json({ message: "线索不存在" });
      await service.db.write();
      res.json(transfer);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  },
);

router.get("/statistics/backlog", async (req, res) => {
  await service.ensureData();
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };
  res.json(service.getBacklogStats({ startDate, endDate }));
});

router.get("/statistics/teams", async (req, res) => {
  await service.ensureData();
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };
  res.json(service.getTeamStats({ startDate, endDate }));
});

router.get("/statistics/my", async (req, res) => {
  await service.ensureData();
  if (!req.currentUser) return res.status(401).json({ message: "未登录" });
  res.json(service.getMyStats(req.currentUser));
});

router.get("/statistics/transfer", async (req, res) => {
  await service.ensureData();
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };
  res.json(service.getOverallTransferStats({ startDate, endDate }));
});
