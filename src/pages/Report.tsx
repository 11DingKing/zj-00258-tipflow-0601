import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smartphone,
  AlertCircle,
  Calendar,
  Phone,
  User,
  Upload,
  FileText,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Radio,
  Upload as AntUpload,
  message,
  Result,
  Space,
} from "antd";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { LEVEL_LABELS, VIOLATION_TYPES, APP_LIST } from "../../shared/types";
import type { ClueLevel, ReporterType } from "../../shared/types";

const { TextArea } = Input;

function autoGradePreview(
  appName: string,
  violationType: string,
  description: string,
): ClueLevel {
  const financeApps = ["某支付APP", "某理财APP"];
  const massApps = ["某购物APP", "某社交APP", "某短视频APP"];
  const serious = ["强制跳转", "恶意链接", "隐私窃取"];
  const mid = ["诱导下载", "骗取点击", "虚假宣传"];
  const desc = (description || "").toLowerCase();
  if (
    financeApps.includes(appName) &&
    (serious.includes(violationType) || desc.includes("钱"))
  )
    return "critical";
  if (massApps.includes(appName) && serious.includes(violationType))
    return "critical";
  if (desc.includes("多次") || desc.includes("频繁") || desc.includes("批量")) {
    if (serious.includes(violationType) || mid.includes(violationType))
      return "critical";
  }
  if (mid.includes(violationType) && massApps.includes(appName))
    return "urgent";
  if (serious.includes(violationType)) return "urgent";
  return "normal";
}

export default function ReportPage() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [apps, setApps] = useState<string[]>(APP_LIST);
  const [previewLevel, setPreviewLevel] = useState<ClueLevel | null>(null);

  const appName = Form.useWatch("appName", form);
  const violationType = Form.useWatch("violationType", form);
  const description = Form.useWatch("description", form);

  useEffect(() => {
    api
      .listApps()
      .then((a) => {
        if (a.length) setApps([...new Set([...APP_LIST, ...a])]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (appName || violationType || description) {
      setPreviewLevel(
        autoGradePreview(appName || "", violationType || "", description || ""),
      );
    } else {
      setPreviewLevel(null);
    }
  }, [appName, violationType, description]);

  useEffect(() => {
    if (user && !form.getFieldValue("reporterName")) {
      form.setFieldsValue({
        reporterName: user.name,
        reporterType: user.role === "grid_member" ? "grid_member" : "user",
      });
    }
  }, [user, form]);

  async function onFinish(values: any) {
    if (!user) return;
    setLoading(true);
    try {
      const clue = await api.createClue({
        appName: values.appName,
        violationType: values.violationType,
        description: values.description,
        occurredAt: values.occurredAt?.toISOString?.() || dayjs().toISOString(),
        contact: values.contact,
        reporterName: values.reporterName || user.name,
        reporterType:
          values.reporterType ||
          (user.role === "grid_member" ? "grid_member" : "user"),
        reporterId: user.id,
      });
      setSubmittedId(clue.id);
      message.success("举报线索提交成功！");
    } catch (e: any) {
      message.error(e.message || "提交失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (submittedId) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <Result
          icon={<CheckCircle2 size={64} className="text-emerald-500" />}
          status="success"
          title={<span className="font-serif text-2xl">线索提交成功</span>}
          subTitle={
            <div className="space-y-2 mt-2">
              <div>
                您的举报线索编号为{" "}
                <span className="font-mono font-semibold text-navy-800">
                  {submittedId}
                </span>
                ，已进入处理流程
              </div>
              {previewLevel && (
                <div className="flex items-center justify-center gap-2">
                  <Info size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-600">
                    系统自动分级为：
                    <span
                      className={[
                        "mx-1 font-semibold px-2 py-0.5 rounded-full",
                        previewLevel === "critical"
                          ? "bg-red-50 text-red-700"
                          : previewLevel === "urgent"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {LEVEL_LABELS[previewLevel]}
                    </span>
                    将按该等级SLA响应
                  </span>
                </div>
              )}
            </div>
          }
          extra={[
            <Space key="space">
              <Button
                type="primary"
                size="large"
                onClick={() => nav("/dashboard")}
              >
                返回工作台
              </Button>
              <Button
                size="large"
                onClick={() => {
                  setSubmittedId(null);
                  form.resetFields();
                }}
              >
                继续提交
              </Button>
            </Space>,
          ]}
        />
        <div className="mt-8 p-5 rounded-2xl bg-white shadow-card border border-slate-100 animate-fade-in">
          <h3 className="font-serif text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-500" /> 处理流程预告
          </h3>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-400 via-navy-300 to-emerald-400" />
            {[
              {
                t: "待分级",
                d: "运营人员将在1小时内审核并确认等级",
                c: "bg-indigo-500",
              },
              { t: "待派发", d: "按业务线派至对应核查组", c: "bg-sky-500" },
              {
                t: "核查中",
                d: `核查组执行核查（SLA：${previewLevel === "critical" ? "24h" : previewLevel === "urgent" ? "48h" : "72h"}）`,
                c: "bg-amber-500",
              },
              {
                t: "已办结",
                d: "回填核查结论，您可在工作台查看结果",
                c: "bg-emerald-500",
              },
            ].map((s, i) => (
              <div
                key={s.t}
                className="relative animate-fade-in"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div
                  className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${s.c} ring-4 ring-white`}
                />
                <div className="text-sm font-medium text-slate-800">{s.t}</div>
                <div className="text-xs text-slate-500">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto grid md:grid-cols-[1fr_260px] gap-6">
      <div className="rounded-2xl bg-white shadow-card border border-slate-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-slate-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-brand-500" />
              违规行为举报
            </h2>
            <div className="text-xs text-slate-500 mt-1">
              如实填写，系统将按违规程度自动分级并优先处理
            </div>
          </div>
          {previewLevel && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 animate-fade-in">
              <Sparkles size={13} className="text-brand-500" />
              <span className="text-xs text-slate-600">预估等级</span>
              <span
                className={[
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  previewLevel === "critical"
                    ? "bg-red-100 text-red-700"
                    : previewLevel === "urgent"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-emerald-100 text-emerald-700",
                ].join(" ")}
              >
                {LEVEL_LABELS[previewLevel]}
              </span>
            </div>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          className="p-7 space-y-5"
          initialValues={{
            reporterType: user?.role === "grid_member" ? "grid_member" : "user",
          }}
        >
          <div className="grid md:grid-cols-2 gap-5">
            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Smartphone size={14} /> 被举报应用
                </span>
              }
              name="appName"
              rules={[{ required: true, message: "请选择或输入被举报应用" }]}
            >
              <Select
                showSearch
                mode={undefined}
                placeholder="选择或搜索应用"
                options={apps.map((a) => ({ label: a, value: a }))}
                allowClear
                size="large"
                style={{ width: "100%" }}
                filterOption={(i, o) =>
                  ((o?.label as string) || "").includes(i as string)
                }
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <AlertCircle size={14} /> 违规类型
                </span>
              }
              name="violationType"
              rules={[{ required: true, message: "请选择违规类型" }]}
            >
              <Select
                placeholder="请选择"
                options={VIOLATION_TYPES.map((v) => ({ label: v, value: v }))}
                size="large"
              />
            </Form.Item>
          </div>

          <Form.Item
            label={
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <FileText size={14} /> 违规情况详细描述
              </span>
            }
            name="description"
            rules={[
              { required: true, min: 10, message: "请至少输入10字详细描述" },
            ]}
            extra={
              <span className="text-[11px]">
                提示：包含「多次」「频繁」「批量」等描述可能提升紧急等级评估
              </span>
            }
          >
            <TextArea
              rows={4}
              placeholder="请详细描述违规发生场景、操作步骤、具体表现..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <div className="grid md:grid-cols-2 gap-5">
            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} /> 违规发生时间
                </span>
              }
              name="occurredAt"
              rules={[{ required: true, message: "请选择发生时间" }]}
            >
              <DatePicker
                showTime
                style={{ width: "100%" }}
                size="large"
                disabledDate={(d) => d && d.isAfter(dayjs())}
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <User size={14} /> 举报人类型
                </span>
              }
              name="reporterType"
            >
              <Radio.Group size="large" className="w-full">
                <Radio.Button value="user" className="!w-1/2 !text-center">
                  普通用户
                </Radio.Button>
                <Radio.Button
                  value="grid_member"
                  className="!w-1/2 !text-center"
                >
                  网格员
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <User size={14} /> 姓名（选填，网格员必填）
                </span>
              }
              name="reporterName"
            >
              <Input
                size="large"
                placeholder="请输入姓名"
                prefix={<User size={14} className="text-slate-400" />}
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Phone size={14} /> 联系电话
                </span>
              }
              name="contact"
              rules={[
                {
                  required: true,
                  pattern: /^1[3-9]\d{9}$|^$/,
                  message: "请输入有效的手机号",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="11位手机号"
                prefix={<Phone size={14} className="text-slate-400" />}
                maxLength={11}
              />
            </Form.Item>
          </div>

          <Form.Item
            label={
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Upload size={14} /> 证据附件（选填）
              </span>
            }
            name="attachments"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e && e.fileList)}
          >
            <AntUpload.Dragger
              beforeUpload={() => false}
              multiple
              maxCount={5}
              accept="image/*,video/*"
              className="!bg-slate-50/60 !hover:border-brand-400"
            >
              <p className="text-slate-400 mb-1">
                <Upload size={28} className="mx-auto text-navy-400" />
              </p>
              <p className="text-sm text-slate-600">
                点击或拖拽上传证据截图/录屏
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                支持图片、视频格式，最多5个文件
              </p>
            </AntUpload.Dragger>
          </Form.Item>

          <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-400 max-w-md">
              您提交的信息将仅用于线索核查，严格按照数据保护规定处理
            </div>
            <div className="flex gap-3">
              <Button size="large" onClick={() => form.resetFields()}>
                重置
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                className="!px-8"
              >
                提交举报 <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/20 animate-fade-in">
          <div className="text-xs opacity-80 mb-1.5">618大促专项</div>
          <div className="font-serif text-xl font-semibold leading-tight mb-3">
            24h 响应承诺
          </div>
          <div className="space-y-1.5 text-sm opacity-90">
            <div>🟥 重大：24h 内办结</div>
            <div>🟧 紧急：48h 内办结</div>
            <div>🟩 一般：72h 内办结</div>
          </div>
        </div>
        <div
          className="p-5 rounded-2xl bg-white shadow-card border border-slate-100 animate-fade-in"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="font-serif text-slate-900 mb-3">常见违规场景</div>
          <div className="space-y-2.5 text-xs text-slate-600">
            {[
              "页面强制跳转第三方，无返回",
              "弹窗诱导下载不明应用",
              "锁屏后解锁自动跳广告",
              "红包/中奖骗取点击",
              "钓鱼链接窃取账号",
              "未授权读取通讯录/定位",
            ].map((s) => (
              <div key={s} className="flex items-start gap-2">
                <CheckCircle2
                  size={12}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
