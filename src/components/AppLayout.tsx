import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquarePlus,
  ClipboardList,
  BarChart3,
  LogOut,
  ShieldAlert,
  User,
  UserCheck,
  Users,
  FileCheck2,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { Avatar, Dropdown, message } from "antd";
import type { UserRole } from "../../shared/types";

const roleLabel: Record<UserRole, string> = {
  reporter: "举报用户",
  grid_member: "网格员",
  operator: "运营人员",
  verifier: "核查组",
};

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          isActive
            ? "bg-white text-navy-800 shadow-sm shadow-navy-900/5"
            : "text-navy-100/80 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const loc = useLocation();

  if (!user) {
    if (loc.pathname !== "/login") nav("/login", { replace: true });
    return null;
  }

  const showReport = user.role === "reporter" || user.role === "grid_member";
  const showClues = user.role === "operator" || user.role === "verifier";
  const showStats = user.role === "operator";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FB]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gradient-to-b from-navy-800 via-navy-800 to-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 grain" />
        <div className="relative z-10 h-full flex flex-col p-4">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <ShieldAlert size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="font-serif font-semibold text-white text-[15px] leading-tight">
                  乱跳必查
                </div>
                <div className="text-navy-100/60 text-[11px] mt-0.5">
                  大促线索治理平台
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            <NavItem
              to="/dashboard"
              icon={LayoutDashboard}
              label="工作台首页"
            />
            {showReport && (
              <NavItem to="/report" icon={MessageSquarePlus} label="提交举报" />
            )}
            {showClues && (
              <NavItem to="/clues" icon={ClipboardList} label="线索工作台" />
            )}
            {showStats && (
              <NavItem to="/statistics" icon={BarChart3} label="统计报表" />
            )}
          </nav>

          <div className="pt-4 border-t border-white/10 space-y-1">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
              <Avatar
                size={32}
                icon={<User size={14} />}
                style={{ backgroundColor: "#FF6B35" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {user.name}
                </div>
                <div className="text-navy-100/60 text-[11px]">
                  {roleLabel[user.role]}
                </div>
              </div>
            </div>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogOut size={14} />,
                    label: "退出登录",
                    onClick: () => {
                      logout();
                      message.success("已退出登录");
                      nav("/login", { replace: true });
                    },
                  },
                ],
              }}
            >
              <button className="w-full text-left text-navy-100/70 hover:text-white text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition">
                <LogOut size={15} />
                <span>切换角色 / 退出</span>
              </button>
            </Dropdown>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="text-navy-800 font-medium font-serif text-lg capitalize">
              {getHeaderTitle(loc.pathname)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs">{getHeaderDesc(loc.pathname)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              618大促专项处理
            </div>
            <div className="flex -space-x-2">
              {[FileCheck2, UserCheck, Users].map((I, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white text-slate-500"
                >
                  <I size={13} />
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <div className="p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}

function getHeaderTitle(path: string) {
  if (path.startsWith("/dashboard")) return "工作台首页";
  if (path.startsWith("/report")) return "举报提交";
  if (path.startsWith("/clues")) return "线索工作台";
  if (path.startsWith("/statistics")) return "统计报表";
  return "线索治理";
}
function getHeaderDesc(path: string) {
  if (path.startsWith("/dashboard"))
    return "总览各级线索积压、核查效能排行、我经手的线索";
  if (path.startsWith("/report"))
    return "如实填写举报信息，系统自动分级优先处理";
  if (path.startsWith("/clues"))
    return "筛选、认领、派发、核查、办结全流程处理";
  if (path.startsWith("/statistics"))
    return "核查组办结量、平均处理时长、SLA达标率";
  return "";
}
