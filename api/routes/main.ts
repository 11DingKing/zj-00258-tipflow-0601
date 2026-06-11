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

router.post("/login", async (req, res) => {
  await service.ensureData();
  const { username } = req.body;
  const user = service.findUserByUsername(username);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "用户不存在" });
  }
});

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
  res.json({ clue, operations });
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
  const { level } = req.body;
  const clue = service.updateClueLevel(req.params.id, level, req.currentUser!);
  if (!clue) return res.status(404).json({ message: "线索不存在" });
  await service.db.write();
  res.json(clue);
});

router.put("/clues/:id/claim", requireRole(["operator"]), async (req, res) => {
  const clue = service.claimClue(req.params.id, req.currentUser!);
  if (!clue) return res.status(404).json({ message: "线索不存在" });
  await service.db.write();
  res.json(clue);
});

router.put("/clues/:id/assign", requireRole(["operator"]), async (req, res) => {
  const { teamId } = req.body;
  const clue = service.assignClue(req.params.id, teamId, req.currentUser!);
  if (!clue) return res.status(404).json({ message: "线索不存在" });
  await service.db.write();
  res.json(clue);
});

router.put(
  "/clues/:id/reject",
  requireRole(["operator", "verifier"]),
  async (req, res) => {
    const { reason } = req.body;
    const clue = service.returnClue(req.params.id, reason, req.currentUser!);
    if (!clue) return res.status(404).json({ message: "线索不存在" });
    await service.db.write();
    res.json(clue);
  },
);

router.put(
  "/clues/:id/resolve",
  requireRole(["verifier"]),
  async (req, res) => {
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
  },
);

router.put("/clues/:id/resubmit", async (req, res) => {
  const clue = service.resubmitClue(req.params.id, req.body || {});
  if (!clue) return res.status(404).json({ message: "线索不存在" });
  await service.db.write();
  res.json(clue);
});

router.get("/statistics/backlog", async (_req, res) => {
  await service.ensureData();
  res.json(service.getBacklogStats());
});

router.get("/statistics/teams", async (_req, res) => {
  await service.ensureData();
  res.json(service.getTeamStats());
});

router.get("/statistics/my", async (req, res) => {
  await service.ensureData();
  if (!req.currentUser) return res.status(401).json({ message: "未登录" });
  res.json(service.getMyStats(req.currentUser));
});
