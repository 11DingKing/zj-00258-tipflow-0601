import { Router, type Request, type Response } from "express";
import * as service from "../services/clueService.js";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  await service.ensureData();
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ success: false, message: "缺少用户名" });
    return;
  }
  const user = service.findUserByUsername(username);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "用户不存在" });
  }
});

router.post("/logout", async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true });
});

export default router;
