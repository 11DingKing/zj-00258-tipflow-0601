import { useEffect, useState } from "react";
import {
  Drawer,
  Button,
  Form,
  Select,
  Input,
  Tag,
  Space,
  message,
  Radio,
  DatePicker,
  Divider,
} from "antd";
import {
  Send,
  RotateCcw,
  CheckSquare,
  FileWarning,
  Clock,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import {
  LevelBadge,
  StatusBadge,
  reporterTypeLabel,
  verifyResultLabel,
} from "./badges";
import { LEVEL_LABELS, VIOLATION_TYPES, APP_LIST } from "../../shared/types";
import type {
  Clue,
  ClueLevel,
  ClueStatus,
  OperationLog,
  Team,
  VerifyResult,
} from "../../shared/types";

const { TextArea } = Input;

export function ClueDetailDrawer({
  open,
  clueId,
  onClose,
  onChanged,
}: {
  open: boolean;
  clueId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { user } = useAuthStore();
  const [clue, setClue] = useState<Clue | null>(null);
  const [ops, setOps] = useState<OperationLog[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const isOperator = user?.role === "operator";
  const isVerifier = user?.role === "verifier";
  const inMyTeam = isVerifier && clue?.assignedTo === user.teamId;

  async function load() {
    if (!clueId) return;
    setLoading(true);
    try {
      const { clue: c, operations } = await api.getClue(clueId);
      setClue(c);
      setOps(operations);
      if (!teams.length) {
        const t = await api.listTeams();
        setTeams(t);
      }
    } catch (e: any) {
      message.error(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open, clueId]);

  async function handleGrade() {
    if (!clue) return;
    try {
      const level: ClueLevel = form.getFieldValue("newLevel");
      if (!level) return;
      await api.gradeClue(clue.id, level);
      message.success("分级已确认");
      onChanged?.();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  }

  async function handleClaim() {
    if (!clue) return;
    await api.claimClue(clue.id);
    message.success("已认领该线索");
    onChanged?.();
    load();
  }

  async function handleAssign() {
    if (!clue) return;
    try {
      const teamId = form.getFieldValue("teamId");
      if (!teamId) {
        message.warning("请选择核查组");
        return;
      }
      await api.assignClue(clue.id, teamId);
      message.success("已派发至核查组");
      onChanged?.();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  }

  async function handleReject() {
    if (!clue) return;
    try {
      const reason = form.getFieldValue("rejectReason");
      if (!reason || reason.trim().length < 5) {
        message.warning("请填写缺料说明（至少5字）");
        return;
      }
      await api.rejectClue(clue.id, reason.trim());
      message.success("已退回补充材料");
      onChanged?.();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  }

  async function handleResolve() {
    if (!clue) return;
    try {
      const [result, note] = await Promise.all([
        Promise.resolve(form.getFieldValue("verifyResult") as VerifyResult),
        Promise.resolve(form.getFieldValue("verifyNote") as string),
      ]);
      if (!result) {
        message.warning("请选择核查结论");
        return;
      }
      if (!note || note.trim().length < 5) {
        message.warning("请填写处理说明（至少5字）");
        return;
      }
      await api.resolveClue(clue.id, result, note.trim());
      message.success("核查办结，结论已提交");
      onChanged?.();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  }

  async function handleResubmit() {
    if (!clue) return;
    try {
      const description = form.getFieldValue("resubmitDescription") as string;
      const appName = form.getFieldValue("resubmitAppName") as string;
      const contact = form.getFieldValue("resubmitContact") as string;
      if (description && description.trim().length < 10) {
        message.warning("补充说明至少需要10字");
        return;
      }
      await api.resubmitClue(clue.id, {
        description: description?.trim(),
        appName,
        contact,
      });
      message.success("已补充材料并重新提交，进入待分级");
      onChanged?.();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  }

  const isReporter =
    user && (user.role === "reporter" || user.role === "grid_member");
  const isMine = isReporter && clue && clue.reporterId === user?.id;

  return (
    <Drawer
      title={
        <span className="font-serif text-base flex items-center gap-2">
          {clue && <LevelBadge level={clue.level} pulse />}
          线索详情 · {clueId || ""}
        </span>
      }
      open={open}
      onClose={onClose}
      width={620}
      loading={loading}
      extra={<Button onClick={onClose}>关闭</Button>}
      className="clue-drawer"
    >
      {!clue ? null : (
        <div className="space-y-6 -mt-2">
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-navy-50/40 border border-slate-100 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-serif text-lg text-slate-900">
                    {clue.appName}
                  </span>
                  <Tag color="slate" bordered={false}>
                    {clue.violationType}
                  </Tag>
                  <StatusBadge status={clue.status} />
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {clue.id}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div className="flex items-center justify-end gap-1">
                  <Clock size={11} />
                  {dayjs(clue.createdAt).format("YYYY-MM-DD HH:mm")}
                </div>
                {clue.occurredAt && (
                  <div className="mt-0.5">
                    发生于 {dayjs(clue.occurredAt).format("MM-DD HH:mm")}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
              {clue.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              {
                label: "举报人",
                value: clue.reporterName,
                hint: reporterTypeLabel[clue.reporterType] || "",
              },
              { label: "联系方式", value: clue.contact },
              { label: "领取人", value: clue.claimedByName || "—" },
              { label: "派发核查组", value: clue.assignedToName || "—" },
              {
                label: "核查结论",
                value: clue.verifyResult
                  ? verifyResultLabel[clue.verifyResult]
                  : "—",
              },
              {
                label: "办结时间",
                value: clue.verifiedAt
                  ? dayjs(clue.verifiedAt).format("MM-DD HH:mm")
                  : "—",
              },
            ].map((i) => (
              <div key={i.label} className="p-3 rounded-lg bg-slate-50">
                <div className="text-slate-400">
                  {i.label}
                  {i.hint && (
                    <span className="ml-1 text-[10px] text-slate-300">
                      ({i.hint})
                    </span>
                  )}
                </div>
                <div className="mt-1 text-slate-800 font-medium">{i.value}</div>
              </div>
            ))}
          </div>

          {clue.returnReason && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 animate-fade-in">
              <div className="text-rose-700 text-sm font-medium mb-1 flex items-center gap-1.5">
                <FileWarning size={14} /> 退回补充材料
              </div>
              <div className="text-rose-600 text-sm leading-relaxed">
                {clue.returnReason}
              </div>
              <div className="text-rose-400 text-[11px] mt-1">
                {clue.returnedAt &&
                  dayjs(clue.returnedAt).format("MM-DD HH:mm")}
              </div>
            </div>
          )}

          {clue.verifyNote && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 animate-fade-in">
              <div className="text-emerald-700 text-sm font-medium mb-1 flex items-center gap-1.5">
                <CheckSquare size={14} /> 核查说明
              </div>
              <div className="text-emerald-800 text-sm leading-relaxed">
                {clue.verifyNote}
              </div>
            </div>
          )}

          {/* Operations */}
          {clue.status !== "resolved" && (
            <div className="space-y-4">
              <Divider style={{ margin: "8px 0" }}>流转操作</Divider>

              {isOperator && clue.status === "pending_grade" && (
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <ArrowLeftRight size={14} /> 确认分级并认领
                  </div>
                  <Form form={form} layout="inline">
                    <Form.Item
                      name="newLevel"
                      initialValue={clue.level}
                      rules={[{ required: true }]}
                      className="!mb-0 !mr-3"
                    >
                      <Select
                        style={{ width: 160 }}
                        options={Object.entries(LEVEL_LABELS).map(([v, l]) => ({
                          value: v,
                          label: l,
                        }))}
                      />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<CheckSquare size={14} />}
                        onClick={handleGrade}
                      >
                        确认等级
                      </Button>
                      <Button icon={<Users size={14} />} onClick={handleClaim}>
                        我来认领
                      </Button>
                    </Space>
                  </Form>
                  <div className="text-[11px] text-slate-400">
                    待分级线索必须先确认等级后才能派发
                  </div>
                </div>
              )}

              {isOperator && clue.status === "pending_assign" && (
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <Send size={14} /> 派发至核查组
                  </div>
                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="teamId"
                      label={
                        <span className="text-xs text-slate-600">
                          选择核查组
                        </span>
                      }
                      rules={[{ required: true, message: "请选择核查组" }]}
                      className="!mb-2"
                    >
                      <Select
                        showSearch
                        placeholder="按业务线选择合适的核查组"
                        options={teams.map((t) => ({
                          value: t.id,
                          label: `${t.name}（${t.memberCount}人）`,
                        }))}
                        filterOption={(i, o) =>
                          ((o?.label as string) || "").includes(i as string)
                        }
                      />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<Send size={14} />}
                        onClick={handleAssign}
                      >
                        确认派发
                      </Button>
                      <Button
                        danger
                        icon={<RotateCcw size={14} />}
                        onClick={() =>
                          form.setFieldsValue({ showReject: true })
                        }
                      >
                        退回补充
                      </Button>
                    </Space>
                  </Form>
                </div>
              )}

              {isOperator && clue.status === "verifying" && (
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <RotateCcw size={14} /> 退回补充材料
                  </div>
                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="rejectReason"
                      label={
                        <span className="text-xs text-slate-600">缺料说明</span>
                      }
                      rules={[
                        {
                          required: true,
                          min: 5,
                          message: "请说明需要补充的材料（≥5字）",
                        },
                      ]}
                      className="!mb-2"
                    >
                      <TextArea
                        rows={3}
                        placeholder="例如：缺少发生跳转时的截图或录屏证据，被举报应用名称不完整..."
                      />
                    </Form.Item>
                    <Button
                      danger
                      icon={<RotateCcw size={14} />}
                      onClick={handleReject}
                    >
                      确认退回
                    </Button>
                  </Form>
                </div>
              )}

              {isVerifier && inMyTeam && clue.status === "verifying" && (
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckSquare size={14} /> 回填核查结论
                  </div>
                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="verifyResult"
                      label={
                        <span className="text-xs text-slate-600">核查结论</span>
                      }
                      rules={[{ required: true }]}
                      className="!mb-2"
                    >
                      <Radio.Group>
                        <Radio.Button value="confirmed">违规属实</Radio.Button>
                        <Radio.Button value="unconfirmed">不属实</Radio.Button>
                        <Radio.Button value="further_check">
                          需进一步核实
                        </Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item
                      name="verifyNote"
                      label={
                        <span className="text-xs text-slate-600">
                          处理说明 / 处理建议
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          min: 5,
                          message: "请填写详细说明（≥5字）",
                        },
                      ]}
                      className="!mb-2"
                    >
                      <TextArea
                        rows={3}
                        placeholder="核查过程、处理建议、后续跟踪要点..."
                      />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<CheckSquare size={14} />}
                        onClick={handleResolve}
                      >
                        提交并办结
                      </Button>
                      <Button
                        danger
                        icon={<RotateCcw size={14} />}
                        onClick={() => {
                          form.setFieldsValue({
                            rejectReason: "请举报人补充证据材料",
                          });
                          handleReject();
                        }}
                      >
                        退回运营
                      </Button>
                    </Space>
                  </Form>
                </div>
              )}

              {isReporter && isMine && clue.status === "returned" && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3 animate-fade-in">
                  <div className="text-sm font-medium text-rose-700 flex items-center gap-1.5">
                    <RotateCcw size={14} /> 补充材料后重新提交
                  </div>
                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="resubmitDescription"
                      label={
                        <span className="text-xs text-slate-600">
                          补充说明（选填，修改描述）
                        </span>
                      }
                      className="!mb-2"
                    >
                      <TextArea rows={3} placeholder={clue.description} />
                    </Form.Item>
                    <Form.Item
                      name="resubmitAppName"
                      label={
                        <span className="text-xs text-slate-600">
                          被举报应用（选填，可修改）
                        </span>
                      }
                      className="!mb-2"
                    >
                      <Select
                        allowClear
                        showSearch
                        placeholder={clue.appName}
                        options={APP_LIST.map((a) => ({
                          value: a,
                          label: a,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name="resubmitContact"
                      label={
                        <span className="text-xs text-slate-600">
                          联系方式（选填，可修改）
                        </span>
                      }
                      className="!mb-2"
                    >
                      <Input placeholder={clue.contact} />
                    </Form.Item>
                    <Button
                      type="primary"
                      icon={<CheckSquare size={14} />}
                      onClick={handleResubmit}
                    >
                      补充材料并重新提交
                    </Button>
                  </Form>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-1.5">
              <Clock size={14} /> 操作时间线
            </div>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              {ops.map((op, i) => (
                <div
                  key={op.id}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div
                    className={[
                      "absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white",
                      i === ops.length - 1 ? "bg-brand-500" : "bg-slate-300",
                    ].join(" ")}
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">
                      {op.action}
                    </div>
                    <div className="text-[11px] text-slate-400 whitespace-nowrap">
                      {dayjs(op.timestamp).format("MM-DD HH:mm")}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {op.detail}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {op.operatorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
