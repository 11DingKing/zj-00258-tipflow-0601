# 乱跳必查 · 大促违规线索治理平台

面向 618 / 双11 等大促期间乱跳转、诱导下载等违规行为举报的全流程线索管理平台。
覆盖 **线索提交 → 自动分级 → 运营派发 → 核查办结 → 统计回流** 的完整闭环。

---

## ⚡ 一键启动（新同事必看）

无论你电脑是否配置过环境，按以下一步走：

```bash
npm install && npm start
```

等待终端出现：

```
Server ready on port 3001
VITE ready in xxx ms → http://localhost:5173
```

然后浏览器打开 **http://localhost:5173** 即可看到登录页。

> 📌 背后做了什么：
> - 前端 Vite 开发服务器：`http://localhost:5173`
> - 后端 Express API 服务：`http://localhost:3001`
> - Vite 会自动把 `/api` 请求代理到后端，无需分别启动

---

## 🧭 平台流程四步走

登录后进入「工作台首页」，顶部有一目了然的全流程引导卡片，按角色点击即可进入对应环节。

| 步骤 | 环节 | 角色 | 说明 |
| :--: | :--- | :--- | :--- |
| Step 1 | **提交举报** | 举报用户 / 网格员 | 填写被举报 APP、违规类型、发生时间、联系方式，系统自动预估分级 |
| Step 2 | **自动分级** | 运营人员 | 系统按违规程度智能分级（一般 / 紧急 / 重大），运营审核确认 |
| Step 3 | **认领派发** | 运营人员 | 认领后派发至对应核查组，状态流转为「核查中」 |
| Step 4 | **核查回填** | 核查组 | 接收派单，执行核查，回填结论（属实 / 不属实 / 需进一步核实）并办结 |

### 可直接使用的测试账号

在登录页选择对应身份即可一键登录：

| 账号 | 身份 | 角色权限 |
| :--- | :--- | :--- |
| `citizen01` | 王女士 | 举报用户 · 提交举报、查看进度 |
| `grid01` | 张网格员 | 网格员 · 提交专业线索 |
| `op01` | 李运营 | 运营人员 · 分级、认领、派发、统计全权限 |
| `ver01` | 一组-周审核 | 核查组 · 接收派发、回填结论、办结 |

### SLA 时效承诺

| 等级 | 颜色 | 办结时效 |
| :--: | :--: | :------: |
| 重大 | 🔴 红 | 24 小时内 |
| 紧急 | 🟠 橙 | 48 小时内 |
| 一般 | 🟢 绿 | 72 小时内 |

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                      前端 (React 18 + Vite)                    │
│  React Router · Ant Design · TailwindCSS · Zustand · Recharts │
│                      http://localhost:5173                     │
└────────────────────────────────┬─────────────────────────────┘
                                 │ /api 代理
┌────────────────────────────────▼─────────────────────────────┐
│                    后端 (Express 4 + lowdb)                   │
│  路由层 → 中间件 → 服务层 (clueService) → JSON 持久化          │
│                      http://localhost:3001                     │
└────────────────────────────────┬─────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  data/db.json (lowdb)   │
                    │  clues / users / teams  │
                    └─────────────────────────┘
```

### 目录结构

```
.
├── api/                    # 后端 Express 服务
│   ├── routes/             # API 路由
│   ├── services/           # 业务服务层（核心分级/派发/核查逻辑）
│   ├── db/                 # lowdb 数据层与初始种子数据
│   ├── app.ts              # Express 应用配置
│   └── server.ts           # 本地开发入口
├── src/                    # 前端 React 应用
│   ├── pages/              # 页面（Dashboard / Report / Clues / Statistics）
│   ├── components/         # 公共组件
│   ├── store/              # Zustand 状态管理
│   └── lib/                # API 封装、工具函数
├── shared/                 # 前后端共享类型定义
├── data/db.json            # lowdb 数据存储文件
└── package.json            # 统一依赖与脚本
```

---

## 📜 可用脚本

| 命令 | 说明 |
| :--- | :--- |
| `npm start` / `npm run dev` | **一键启动前后端**（推荐） |
| `npm run client:dev` | 仅启动前端 Vite（端口 5173） |
| `npm run server:dev` | 仅启动后端 Express（端口 3001） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run check` | 仅运行 TypeScript 类型检查 |
| `npm run lint` | 运行 ESLint 代码检查 |
| `npm run lint:fix` | 运行 ESLint 并自动修复可修复问题 |
| `npm run prepare` | 安装 husky Git 钩子（`npm install` 后自动执行） |

---

## 🚔 代码提交规范

本项目配置了 **husky + lint-staged** 代码质量门禁，`git commit` 时会自动：

1. 对暂存区的 `.ts` / `.tsx` / `.js` / `.jsx` 文件执行 ESLint
2. 自动修复可修复问题（`--fix`）
3. 若存在无法自动修复的 error，**阻止提交**

### 提交被拦了怎么办？

```bash
# 1. 查看具体错误
npm run lint

# 2. 尝试自动修复
npm run lint:fix

# 3. 手动修复后重新暂存并提交
git add .
git commit -m "feat: xxx"
```

### ESLint 关键规则

- `no-var` / `prefer-const`：禁止 `var`，能用 `const` 就不用 `let`
- `eqeqeq`：必须使用 `===` / `!==`（`null` 除外）
- `@typescript-eslint/no-unused-vars`：未使用的变量必须以 `_` 开头，否则告警
- `@typescript-eslint/no-explicit-any`：尽量避免 `any`，告警
- `no-console`：生产代码保留 `console.warn/error/info`，禁用 `console.log`

---

## 🔌 主要 API 一览

| 方法 | 路径 | 功能 |
| :--: | :--- | :--- |
| POST | `/api/auth/login` | 模拟登录，返回用户信息 |
| GET | `/api/clues` | 获取线索列表（支持筛选/分页） |
| GET | `/api/clues/:id` | 获取单条线索详情（含操作日志） |
| POST | `/api/clues` | 创建举报线索（自动分级） |
| PUT | `/api/clues/:id/grade` | 运营确认分级 |
| PUT | `/api/clues/:id/claim` | 运营认领线索 |
| PUT | `/api/clues/:id/assign` | 派发线索至核查组 |
| PUT | `/api/clues/:id/return` | 退回补充（需传缺料说明） |
| PUT | `/api/clues/:id/resolve` | 核查组回填结论并办结 |
| GET | `/api/statistics/backlog` | 积压概览统计 |
| GET | `/api/statistics/teams` | 核查组效能统计 |
| GET | `/api/teams` | 获取核查组列表 |
| GET | `/api/health` | 服务健康检查 |

---

## 🛠️ 环境要求

- Node.js **≥ 18**（建议 20 LTS）
- npm **≥ 9**
- 无需数据库：使用 lowdb + JSON 文件开箱即用

## 📚 相关文档

- 产品需求文档：`.trae/documents/PRD-线索举报平台.md`
- 技术架构设计：`.trae/documents/TECH-架构设计.md`
