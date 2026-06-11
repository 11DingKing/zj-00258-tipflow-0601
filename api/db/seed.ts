import type {
  Clue,
  Team,
  User,
  OperationLog,
  ClueLevel,
  ClueStatus,
  ReporterType,
} from "../../shared/types";

export const seedUsers: User[] = [
  { id: "u1", username: "citizen01", name: "王女士", role: "reporter" },
  { id: "u2", username: "citizen02", name: "刘先生", role: "reporter" },
  { id: "u3", username: "grid01", name: "张网格员", role: "grid_member" },
  { id: "u4", username: "grid02", name: "陈网格员", role: "grid_member" },
  { id: "u5", username: "op01", name: "李运营", role: "operator" },
  { id: "u6", username: "op02", name: "赵运营", role: "operator" },
  {
    id: "u7",
    username: "ver01",
    name: "一组-周审核",
    role: "verifier",
    teamId: "t1",
  },
  {
    id: "u8",
    username: "ver02",
    name: "二组-吴审核",
    role: "verifier",
    teamId: "t2",
  },
  {
    id: "u9",
    username: "ver03",
    name: "三组-郑审核",
    role: "verifier",
    teamId: "t3",
  },
  {
    id: "u10",
    username: "ver04",
    name: "四组-孙审核",
    role: "verifier",
    teamId: "t4",
  },
];

export const seedTeams: Team[] = [
  { id: "t1", name: "电商平台核查一组", memberCount: 5 },
  { id: "t2", name: "金融支付核查二组", memberCount: 4 },
  { id: "t3", name: "内容生态核查三组", memberCount: 6 },
  { id: "t4", name: "社交应用核查四组", memberCount: 3 },
];

const reporterNames = [
  { name: "王女士", id: "u1", type: "user" as ReporterType },
  { name: "刘先生", id: "u2", type: "user" as ReporterType },
  { name: "李女士", id: "u1", type: "user" as ReporterType },
  { name: "赵先生", id: "u2", type: "user" as ReporterType },
  { name: "张网格员", id: "u3", type: "grid_member" as ReporterType },
  { name: "陈网格员", id: "u4", type: "grid_member" as ReporterType },
  { name: "周网格员", id: "u3", type: "grid_member" as ReporterType },
  { name: "吴先生", id: "u2", type: "user" as ReporterType },
];

const apps = [
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

const violations = [
  "强制跳转",
  "诱导下载",
  "弹窗跳转",
  "广告误触",
  "恶意链接",
  "隐私窃取",
  "骗取点击",
  "虚假宣传",
];

const levelApps: Record<ClueLevel, string[]> = {
  critical: ["某支付APP", "某购物APP", "某理财APP", "某社交APP"],
  urgent: ["某短视频APP", "某外卖APP", "某打车APP", "某旅行APP"],
  normal: ["某新闻APP", "某游戏APP", "某教育APP", "某医疗APP"],
};

const descriptions: Record<string, string[]> = {
  强制跳转: [
    "打开首页后5秒内自动跳转到第三方活动页，无法返回",
    "点击商品详情后强制跳转到其他APP下载页面",
    "支付完成后未提示直接跳转到赌博类网站",
  ],
  诱导下载: [
    '弹窗显示"手机病毒请立即清理"诱导下载不明APP',
    "抽奖页面诱导填写手机号后自动下载安装包",
    '播放视频中途弹出"继续观看请下载客户端"',
  ],
  弹窗跳转: [
    "使用期间平均每3分钟弹出广告窗口，误触率极高",
    "锁屏后再解锁直接跳转广告，无法关闭",
    "启动APP立即全屏广告，关闭按钮极小",
  ],
  广告误触: [
    "新闻内容中间穿插广告，手指滑动时容易误触跳转",
    "搜索结果页前5条全是广告，与真实内容难以区分",
    "按钮与广告重叠，点击按钮实际打开广告",
  ],
  恶意链接: [
    "分享的优惠券链接实为钓鱼网站，窃取登录信息",
    "客服私信发送的链接安装后恶意扣费",
    "扫码领红包跳转至仿冒支付页面",
  ],
  隐私窃取: [
    "未授权情况下读取通讯录并上传",
    "后台频繁定位并发送给第三方广告平台",
    "录音权限被滥用，对话内容被识别用于广告推荐",
  ],
  骗取点击: [
    '虚假"恭喜中奖"弹窗，点击后实为广告转化',
    "伪装成系统更新提示，点击下载恶意程序",
    "红包图标遍布页面，全部点击跳转到电商",
  ],
  虚假宣传: [
    "页面显示9.9元手机，实际进入是抽奖且无法中奖",
    "宣称免费领皮肤，实则需要支付各种费用",
    "宣传百亿补贴，实际价格比其他平台更高",
  ],
};

function randomDate(daysAgoStart: number, daysAgoEnd: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - daysAgoStart * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() - daysAgoEnd * 24 * 60 * 60 * 1000);
  const time = new Date(
    end.getTime() + Math.random() * (start.getTime() - end.getTime()),
  );
  return time.toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickLevelByStatus(status: ClueStatus, idx: number): ClueLevel {
  const weights: ClueLevel[] = [
    "normal",
    "normal",
    "urgent",
    "urgent",
    "critical",
  ];
  if (status === "pending_grade" && idx % 3 === 0) return "critical";
  if (status === "verifying" && idx % 4 === 0) return "urgent";
  if (status === "resolved" && idx % 5 === 0) return "critical";
  return weights[idx % weights.length];
}

const statusSequence: ClueStatus[] = [
  "pending_grade",
  "pending_grade",
  "pending_grade",
  "pending_assign",
  "pending_assign",
  "verifying",
  "verifying",
  "verifying",
  "verifying",
  "returned",
  "resolved",
  "resolved",
  "resolved",
  "resolved",
  "resolved",
];

export function generateSeedClues(): Clue[] {
  const clues: Clue[] = [];
  const total = 58;

  for (let i = 0; i < total; i++) {
    const status = statusSequence[i % statusSequence.length];
    const level = pickLevelByStatus(status, i);
    const app = pick(levelApps[level]);
    const violation = pick(violations);
    const descList = descriptions[violation] || descriptions["强制跳转"];
    const reporter = pick(reporterNames);
    const occurredAt = randomDate(2, 0);
    const createdAt = randomDate(7, 0);

    const clue: Clue = {
      id: `c${String(i + 1).padStart(3, "0")}`,
      appName: app,
      violationType: violation,
      description: pick(descList),
      occurredAt,
      contact: `138****${String(1000 + (i % 9000))}`,
      reporterName: reporter.name,
      reporterType: reporter.type,
      reporterId: reporter.id,
      level,
      status,
      createdAt,
    };

    if (status !== "pending_grade") {
      clue.gradedAt = randomDate(6, 0);
      clue.gradedBy = i % 2 === 0 ? "u5" : "u6";
    }

    if (
      status === "pending_assign" ||
      status === "verifying" ||
      status === "resolved"
    ) {
      const teamIdx = i % seedTeams.length;
      clue.assignedTo = seedTeams[teamIdx].id;
      clue.assignedToName = seedTeams[teamIdx].name;
      clue.assignedAt = randomDate(5, 0);
      clue.claimedBy = i % 2 === 0 ? "u5" : "u6";
      clue.claimedByName = i % 2 === 0 ? "李运营" : "赵运营";
    }

    if (status === "verifying" || status === "resolved") {
      clue.verifierTeamId = clue.assignedTo;
    }

    if (status === "resolved") {
      clue.verifiedAt = randomDate(3, 0);
      const results = [
        "confirmed",
        "confirmed",
        "unconfirmed",
        "further_check",
      ] as const;
      clue.verifyResult = results[i % results.length];
      clue.verifyNote = [
        "经核查违规情况属实，已通知应用方下架相关违规模块",
        "核查后未发现违规行为，已记录备案",
        "线索描述部分属实，存在边界情况，已推送法务复核",
        "发现违规内容，已开处罚单并要求限期整改",
      ][i % 4];
    }

    if (status === "returned") {
      clue.returnedAt = randomDate(4, 1);
      clue.returnedBy = i % 2 === 0 ? "u5" : "u6";
      clue.returnReason = [
        "缺少发生跳转时的截图或录屏证据，请补充提交",
        "被举报应用名称不完整，请提供准确的应用包名或版本号",
        "发生时间描述不清，请补充精确到分钟的时间点",
        "联系方式有误，无法与您取得联系，请重新填写",
      ][i % 4];
    }

    clues.push(clue);
  }

  return clues.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function generateSeedOperations(clues: Clue[]): OperationLog[] {
  const logs: OperationLog[] = [];
  let idx = 0;

  for (const clue of clues) {
    logs.push({
      id: `op_${idx++}`,
      clueId: clue.id,
      operatorId: clue.reporterId,
      operatorName: clue.reporterName,
      action: "提交举报",
      detail: `提交了「${clue.violationType}」类型举报线索`,
      timestamp: clue.createdAt,
    });

    if (clue.gradedAt) {
      logs.push({
        id: `op_${idx++}`,
        clueId: clue.id,
        operatorId: clue.gradedBy || "u5",
        operatorName: clue.gradedBy === "u5" ? "李运营" : "赵运营",
        action: "确认分级",
        detail: `确认为「${clue.level === "critical" ? "重大" : clue.level === "urgent" ? "紧急" : "一般"}」等级`,
        timestamp: clue.gradedAt,
      });
    }

    if (clue.assignedAt) {
      logs.push({
        id: `op_${idx++}`,
        clueId: clue.id,
        operatorId: clue.claimedBy || "u5",
        operatorName: clue.claimedByName || "李运营",
        action: "派发线索",
        detail: `派发至「${clue.assignedToName}」`,
        timestamp: clue.assignedAt,
      });
    }

    if (clue.returnedAt) {
      logs.push({
        id: `op_${idx++}`,
        clueId: clue.id,
        operatorId: clue.returnedBy || "u5",
        operatorName: clue.returnedBy === "u5" ? "李运营" : "赵运营",
        action: "退回补充",
        detail: clue.returnReason || "材料不足，请补充",
        timestamp: clue.returnedAt,
      });
    }

    if (clue.verifiedAt) {
      const verifierMap: Record<string, { id: string; name: string }> = {
        t1: { id: "u7", name: "一组-周审核" },
        t2: { id: "u8", name: "二组-吴审核" },
        t3: { id: "u9", name: "三组-郑审核" },
        t4: { id: "u10", name: "四组-孙审核" },
      };
      const v = verifierMap[clue.verifierTeamId || "t1"];
      const resultMap = {
        confirmed: "违规属实",
        unconfirmed: "不属实",
        further_check: "进一步核查",
      };
      logs.push({
        id: `op_${idx++}`,
        clueId: clue.id,
        operatorId: v.id,
        operatorName: v.name,
        action: "核查办结",
        detail: `结论：${resultMap[clue.verifyResult!]}；${clue.verifyNote || ""}`,
        timestamp: clue.verifiedAt,
      });
    }
  }

  return logs;
}
