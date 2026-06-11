import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ArrowRight,
  User,
  UserCheck,
  ClipboardList,
  FileCheck2,
} from "lucide-react";
import { Button, Card, message } from "antd";
import { useAuthStore } from "../store/auth";
import type { UserRole } from "../../shared/types";

interface RoleOption {
  username: string;
  name: string;
  role: UserRole;
  desc: string;
  icon: any;
  accent: string;
}

const roleOptions: RoleOption[] = [
  {
    username: "citizen01",
    name: "王女士",
    role: "reporter",
    desc: "普通消费者，提交举报查看进度",
    icon: User,
    accent: "from-emerald-400 to-emerald-600",
  },
  {
    username: "grid01",
    name: "张网格员",
    role: "grid_member",
    desc: "基层巡查人员，提交专业线索",
    icon: UserCheck,
    accent: "from-sky-400 to-sky-600",
  },
  {
    username: "op01",
    name: "李运营",
    role: "operator",
    desc: "平台运营，分级派发全权限",
    icon: ClipboardList,
    accent: "from-indigo-400 to-indigo-600",
  },
  {
    username: "ver01",
    name: "一组-周审核",
    role: "verifier",
    desc: "核查组，接收派单回填结论",
    icon: FileCheck2,
    accent: "from-brand-400 to-brand-600",
  },
];

const roleLabels: Record<UserRole, string> = {
  reporter: "举报用户",
  grid_member: "网格员",
  operator: "运营人员",
  verifier: "核查组",
};

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const nav = useNavigate();

  async function handleLogin(opt: RoleOption) {
    try {
      setLoading(opt.username);
      await login(opt.username);
      message.success(`欢迎回来，${opt.name}`);
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      message.error(e.message || "登录失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(15,39,71,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(255,107,53,0.08),transparent_50%)]" />
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-navy-50 opacity-60 blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-50 opacity-60 blur-3xl" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-5xl grid md:grid-cols-[1.1fr_1.2fr] gap-10 items-center">
          {/* Brand side */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 flex items-center justify-center text-white shadow-xl shadow-navy-900/20">
                <ShieldAlert size={28} strokeWidth={1.8} />
              </div>
              <div>
                <div className="font-serif font-semibold text-2xl text-navy-800">
                  乱跳必查
                </div>
                <div className="text-slate-500 text-sm mt-0.5">
                  618大促违规跳转线索治理平台
                </div>
              </div>
            </div>

            <h1 className="font-serif text-4xl leading-tight text-slate-900 mb-4">
              每一条线索
              <br />
              都是对消费者的<span className="text-brand-500">承诺</span>
            </h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              每逢 618、双11
              大促，各类乱跳转、诱导下载、骗取点击等违规行为集中爆发。
              本平台提供「线索提交 → 自动分级 → 运营派发 → 核查办结 →
              统计回流」的全链路闭环能力。
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { num: "58", label: "实时待处理线索" },
                { num: "4组", label: "核查组在线" },
                { num: "<24h", label: "重大线索SLA" },
              ].map((it) => (
                <div
                  key={it.label}
                  className="p-4 rounded-xl bg-white shadow-card border border-slate-100"
                >
                  <div className="font-serif text-2xl font-semibold text-navy-800">
                    {it.num}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{it.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Login card */}
          <Card
            className="shadow-[0_30px_60px_-15px_rgba(15,39,71,0.15)] border-0 animate-fade-in"
            style={{ animationDelay: "0.1s", borderRadius: "20px" }}
            styles={{ body: { padding: 32 } }}
            title={
              <span className="font-serif text-lg text-slate-800">
                选择身份登录
              </span>
            }
          >
            <div className="space-y-3">
              {roleOptions.map((opt, idx) => {
                const Icon = opt.icon;
                const isLoading = loading === opt.username;
                return (
                  <button
                    key={opt.username}
                    onClick={() => handleLogin(opt)}
                    disabled={!!loading}
                    className="group w-full text-left p-4 rounded-xl border border-slate-200 hover:border-navy-300 hover:bg-navy-50/40 transition-all flex items-center gap-4 relative overflow-hidden animate-fade-in disabled:opacity-60"
                    style={{ animationDelay: `${0.15 + idx * 0.06}s` }}
                  >
                    <div
                      className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${opt.accent} flex items-center justify-center text-white shadow-md shadow-slate-900/5`}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {opt.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {roleLabels[opt.role]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-400 group-hover:text-navy-700 group-hover:translate-x-0.5 transition-all"
                    />
                    {isLoading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
              登录即代表同意线索管理规范，举报内容将按数据保护规定处理
            </div>
            <div className="mt-4">
              <Button
                block
                type="text"
                href="https://www.12315.cn"
                target="_blank"
              >
                市场监管12315 投诉举报平台跳转
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
