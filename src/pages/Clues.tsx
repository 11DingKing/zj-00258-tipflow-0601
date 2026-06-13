import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  ArrowRightLeft,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Link2,
  Shuffle,
} from "lucide-react";
import {
  Table,
  Input,
  Select,
  DatePicker,
  Tag,
  Pagination,
  Button,
  Space,
  Tooltip,
  Checkbox,
  Empty,
  Spin,
  Radio,
  message,
  Drawer,
  Modal,
} from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { LevelBadge, StatusBadge } from "../components/badges";
import { ClueDetailDrawer } from "../components/ClueDetailDrawer";
import {
  LEVEL_LABELS,
  STATUS_LABELS,
  APP_LIST,
  VIOLATION_TYPES,
} from "../../shared/types";
import type { Clue, ClueLevel, ClueStatus } from "../../shared/types";

const { RangePicker } = DatePicker;

export default function CluesPage() {
  const { user } = useAuthStore();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const isOperator = user?.role === "operator";

  const [data, setData] = useState<Clue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<{
    level?: ClueLevel;
    status?: ClueStatus;
    keyword?: string;
    appName?: string;
    teamId?: string;
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  }>({});

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [apps, setApps] = useState<string[]>(APP_LIST);
  const [teams, setTeams] = useState<any[]>([]);

  const [batchMergeOpen, setBatchMergeOpen] = useState(false);
  const [batchMergeLoading, setBatchMergeLoading] = useState(false);
  const [batchMergeRemark, setBatchMergeRemark] = useState("");
  const [batchMasterId, setBatchMasterId] = useState<string>("");

  const openFromQuery = sp.get("id");
  useEffect(() => {
    if (openFromQuery && !drawerOpen) {
      setDrawerId(openFromQuery);
      setDrawerOpen(true);
    }
  }, [openFromQuery]);

  useEffect(() => {
    const initStatus = sp.get("status") as ClueStatus | undefined;
    const initLevel = sp.get("level") as ClueLevel | undefined;
    setFilters((f) => ({ ...f, status: initStatus, level: initLevel }));
    (async () => {
      try {
        const [a, t] = await Promise.all([api.listApps(), api.listTeams()]);
        if (a.length) setApps([...new Set([...APP_LIST, ...a])]);
        setTeams(t);
      } catch {}
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.listClues({
        page,
        pageSize,
        level: filters.level,
        status: filters.status,
        keyword: filters.keyword,
        appName: filters.appName,
        teamId: filters.teamId,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
      });
      setData(res.list);
      setTotal(res.total);
    } catch (e: any) {
      message.error(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, filters]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const clue of data) c[clue.status] = (c[clue.status] || 0) + 1;
    return c;
  }, [data]);

  const columns: ColumnsType<Clue> = [
    {
      title: "等级",
      dataIndex: "level",
      width: 96,
      fixed: "left",
      sorter: (a, b) => {
        const o = { critical: 0, urgent: 1, normal: 2 } as const;
        return o[a.level] - o[b.level];
      },
      render: (l: ClueLevel, r) => (
        <LevelBadge level={l} pulse={l === "critical"} />
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      filters: Object.entries(STATUS_LABELS).map(([v, l]) => ({
        text: l,
        value: v,
      })),
      onFilter: (v, r) => r.status === v,
      render: (s: ClueStatus) => <StatusBadge status={s} />,
    },
    {
      title: "被举报应用",
      dataIndex: "appName",
      width: 130,
      render: (t: string, r) => (
        <span
          className="font-medium text-slate-800 text-sm hover:text-brand-600 cursor-pointer"
          onClick={() => openDetail(r)}
        >
          {t}
        </span>
      ),
    },
    {
      title: "违规类型",
      dataIndex: "violationType",
      width: 100,
      render: (t: string) => (
        <Tag color="geekblue" style={{ margin: 0 }} bordered={false}>
          {t}
        </Tag>
      ),
    },
    {
      title: "违规描述",
      dataIndex: "description",
      ellipsis: true,
      render: (t: string, r) => (
        <span
          onClick={() => openDetail(r)}
          className="text-sm text-slate-600 hover:text-navy-700 cursor-pointer line-clamp-1"
        >
          {t}
        </span>
      ),
    },
    {
      title: "举报人",
      dataIndex: "reporterName",
      width: 90,
      render: (t: string, r) => (
        <span className="text-xs text-slate-600">
          {t}
          <Tag
            style={{ marginLeft: 4 }}
            color={r.reporterType === "grid_member" ? "purple" : "default"}
            bordered={false}
            className="!text-[10px] !px-1 !py-0"
          >
            {r.reporterType === "grid_member" ? "网格员" : "用户"}
          </Tag>
        </span>
      ),
    },
    {
      title: "派发组",
      dataIndex: "assignedToName",
      width: 140,
      render: (t?: string) =>
        t ? (
          <span className="text-xs text-slate-600">{t}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      title: "合并关系",
      dataIndex: "mergedParentId",
      width: 100,
      render: (_: any, r: Clue) => {
        if (r.isMergeMaster) {
          return (
            <Tooltip
              title={`主线索，已合并 ${r.mergedChildIds?.length || 0} 条`}
            >
              <Tag
                color="indigo"
                className="!text-[11px] !px-1.5 !py-0 flex items-center gap-1 !margin-0"
              >
                <Link2 size={10} /> 主线索
                {r.mergedChildIds?.length ? (
                  <span className="font-semibold">
                    ×{r.mergedChildIds.length}
                  </span>
                ) : null}
              </Tag>
            </Tooltip>
          );
        }
        if (r.mergedParentId) {
          return (
            <Tooltip title={`已合并入 ${r.mergedParentId}`}>
              <Tag
                color="geekblue"
                className="!text-[11px] !px-1.5 !py-0 flex items-center gap-1 !margin-0"
              >
                <Link2 size={10} /> 已合并
              </Tag>
            </Tooltip>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      title: "转派",
      dataIndex: "transferCount",
      width: 80,
      render: (v: number | undefined, r: Clue) => {
        if (v && v > 0) {
          return (
            <Tooltip title={`已被转派 ${v} 次`}>
              <Tag
                color="orange"
                className="!text-[11px] !px-1.5 !py-0 flex items-center gap-1 !margin-0"
              >
                <Shuffle size={10} /> {v}
              </Tag>
            </Tooltip>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      width: 130,
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
      render: (t: string) => (
        <span className="text-xs text-slate-500 font-mono">
          {dayjs(t).format("MM-DD HH:mm")}
        </span>
      ),
    },
    {
      title: "操作",
      key: "op",
      width: 80,
      fixed: "right",
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          onClick={() => openDetail(r)}
          icon={<ArrowRightLeft size={13} />}
          className="!px-1"
        >
          处理
        </Button>
      ),
    },
  ];

  function openDetail(r: Clue) {
    setDrawerId(r.id);
    setDrawerOpen(true);
    sp.set("id", r.id);
    setSp(sp, { replace: true });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => {
      sp.delete("id");
      setSp(sp, { replace: true });
    }, 300);
  }

  async function batchAssign() {
    if (selected.length === 0) {
      message.warning("请先选择线索");
      return;
    }
    message.success(
      `已标记 ${selected.length} 条线索待派发（请进入详情逐个派发）`,
    );
  }

  function openBatchMerge() {
    if (selected.length < 2) {
      message.warning("请至少选择2条线索进行合并");
      return;
    }
    const selectedClues = data.filter((d) => selected.includes(d.id));
    const apps = new Set(selectedClues.map((c) => c.appName));
    const types = new Set(selectedClues.map((c) => c.violationType));
    if (apps.size > 1 || types.size > 1) {
      message.warning("只能合并同一应用、同一违规类型的线索");
      return;
    }
    const valid = selectedClues.filter(
      (c) => c.status !== "resolved" && !c.mergedParentId,
    );
    if (valid.length < 2) {
      message.warning("所选线索中不足2条可合并（排除已办结/已合并的）");
      return;
    }
    setBatchMasterId(valid[0].id);
    setBatchMergeRemark("");
    setBatchMergeOpen(true);
  }

  async function handleBatchMerge() {
    const childIds = selected.filter((id) => id !== batchMasterId);
    if (childIds.length === 0) {
      message.warning("请选择主线索之外的子线索");
      return;
    }
    setBatchMergeLoading(true);
    try {
      await api.mergeClues(
        batchMasterId,
        childIds,
        batchMergeRemark || undefined,
      );
      message.success(`已合并 ${childIds.length} 条线索入主线索`);
      setBatchMergeOpen(false);
      setSelected([]);
      load();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setBatchMergeLoading(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* 状态快速过滤条 */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-white shadow-card border border-slate-100 flex-wrap">
        <div
          onClick={() => setFilters((f) => ({ ...f, status: undefined }))}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition",
            !filters.status
              ? "bg-navy-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          全部
          <span
            className={[
              "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
              !filters.status ? "bg-white/20" : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            {total}
          </span>
        </div>
        {(Object.entries(STATUS_LABELS) as [ClueStatus, string][]).map(
          ([k, l]) => {
            const active = filters.status === k;
            return (
              <div
                key={k}
                onClick={() =>
                  setFilters((f) => ({ ...f, status: active ? undefined : k }))
                }
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition",
                  active
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {l}
                <span
                  className={[
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    k === "resolved"
                      ? "bg-emerald-50 text-emerald-600"
                      : k === "returned"
                        ? "bg-rose-50 text-rose-600"
                        : k === "verifying"
                          ? "bg-amber-50 text-amber-600"
                          : k === "pending_assign"
                            ? "bg-sky-50 text-sky-600"
                            : "bg-indigo-50 text-indigo-600",
                  ].join(" ")}
                >
                  {statusCounts[k] || "—"}
                </span>
              </div>
            );
          },
        )}
        <div className="ml-auto flex items-center gap-2 pr-2">
          <Button icon={<RefreshCw size={14} />} onClick={load} size="small" />
          {viewMode === "table" ? (
            <Button
              icon={<LayoutGrid size={14} />}
              onClick={() => setViewMode("card")}
              size="small"
            >
              卡片
            </Button>
          ) : (
            <Button
              icon={<List size={14} />}
              onClick={() => setViewMode("table")}
              size="small"
              type="primary"
            >
              列表
            </Button>
          )}
        </div>
      </div>

      {/* 高级筛选工具栏 */}
      <div className="p-4 rounded-xl bg-white shadow-card border border-slate-100 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={13} /> 高级筛选
          </div>
          <Radio.Group
            size="small"
            value={filters.level}
            onChange={(e) =>
              setFilters((f) => ({ ...f, level: e.target.value || undefined }))
            }
            buttonStyle="solid"
          >
            <Radio.Button value={undefined}>全部等级</Radio.Button>
            {(Object.entries(LEVEL_LABELS) as [ClueLevel, string][]).map(
              ([v, l]) => (
                <Radio.Button key={v} value={v}>
                  {l}
                </Radio.Button>
              ),
            )}
          </Radio.Group>
          <Select
            size="small"
            allowClear
            placeholder="被举报应用"
            value={filters.appName || undefined}
            style={{ width: 160 }}
            onChange={(v) => setFilters((f) => ({ ...f, appName: v }))}
            options={apps.map((a) => ({ label: a, value: a }))}
            showSearch
          />
          <Select
            size="small"
            allowClear
            placeholder="违规类型"
            style={{ width: 140 }}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                appName: v ? undefined : filters.appName,
              }))
            }
            options={VIOLATION_TYPES.map((v) => ({ label: v, value: v }))}
          />
          {isOperator && (
            <Select
              size="small"
              allowClear
              placeholder="核查组"
              value={filters.teamId || undefined}
              style={{ width: 180 }}
              onChange={(v) => setFilters((f) => ({ ...f, teamId: v }))}
              options={teams.map((t) => ({ label: `${t.name}`, value: t.id }))}
              showSearch
            />
          )}
          <RangePicker
            size="small"
            value={filters.dateRange || null}
            onChange={(v: any) =>
              setFilters((f) => ({ ...f, dateRange: v || undefined }))
            }
          />
          <Input
            size="small"
            allowClear
            prefix={<Search size={13} className="text-slate-400" />}
            placeholder="搜索线索ID/关键词"
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                keyword: e.target.value || undefined,
              }))
            }
          />
          <Button
            size="small"
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
          >
            清空
          </Button>
        </div>

        {/* 批量操作栏 */}
        {isOperator && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div className="flex items-center gap-3">
              <Checkbox
                indeterminate={
                  selected.length > 0 && selected.length < data.length
                }
                checked={data.length > 0 && selected.length === data.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? data.map((d) => d.id) : [])
                }
              >
                <span className="text-xs text-slate-600">全选当前页</span>
              </Checkbox>
              <span className="text-xs text-slate-400">
                已选 {selected.length} 条
              </span>
            </div>
            <Space size="small">
              <Button
                size="small"
                icon={<ArrowRightLeft size={13} />}
                onClick={batchAssign}
              >
                批量派发
              </Button>
              <Button
                size="small"
                icon={<Link2 size={13} />}
                onClick={openBatchMerge}
                type="default"
              >
                批量合并
              </Button>
              <Button size="small" icon={<Download size={13} />}>
                导出数据
              </Button>
            </Space>
          </div>
        )}
      </div>

      {/* 数据区域 */}
      <div className="rounded-xl bg-white shadow-card border border-slate-100 overflow-hidden">
        <Spin spinning={loading}>
          {viewMode === "table" ? (
            <Table
              rowKey="id"
              dataSource={data}
              columns={columns}
              rowSelection={
                isOperator
                  ? {
                      selectedRowKeys: selected,
                      onChange: (keys) => setSelected(keys as string[]),
                    }
                  : undefined
              }
              pagination={false}
              rowClassName={(r) =>
                [
                  "clue-row cursor-pointer transition",
                  r.level === "critical"
                    ? "bg-red-50/30"
                    : r.level === "urgent"
                      ? "bg-orange-50/20"
                      : "",
                ].join(" ")
              }
              scroll={{ x: 1150, y: 560 }}
              size="middle"
              onRow={(r) => ({
                onClick: () => openDetail(r),
              })}
              locale={{ emptyText: <Empty description="没有匹配的线索" /> }}
            />
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="group p-4 rounded-xl border border-slate-100 hover:border-navy-300 hover:shadow-card-hover transition cursor-pointer animate-fade-in relative overflow-hidden"
                  style={{ animationDelay: `${i * 0.02}s` }}
                >
                  {c.level === "critical" && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500" />
                  )}
                  {c.level === "urgent" && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />
                  )}
                  {c.level === "normal" && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
                  )}
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <LevelBadge
                      level={c.level}
                      pulse={c.level === "critical"}
                    />
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="font-serif text-base text-slate-900 group-hover:text-navy-700">
                      {c.appName}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {c.id}
                    </div>
                  </div>
                  <div className="mt-0.5">
                    <Tag
                      color="slate"
                      bordered={false}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {c.violationType}
                    </Tag>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2 h-8">
                    {c.description}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c.reporterName}</span>
                    <span>{dayjs(c.createdAt).format("MM-DD HH:mm")}</span>
                  </div>
                </div>
              ))}
              {data.length === 0 && !loading && (
                <div className="col-span-full py-16">
                  <Empty description="没有匹配的线索" />
                </div>
              )}
            </div>
          )}
        </Spin>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            共 <span className="font-semibold text-slate-800">{total}</span>{" "}
            条线索
          </span>
          <Pagination
            showSizeChanger
            showQuickJumper
            current={page}
            pageSize={pageSize}
            total={total}
            showTotal={(t, r) => `第 ${r[0]}-${r[1]} 条 / 共 ${t} 条`}
            onChange={(p, s) => {
              setPage(p);
              setPageSize(s);
            }}
            size="small"
          />
        </div>
      </div>

      <ClueDetailDrawer
        open={drawerOpen}
        clueId={drawerId}
        onClose={closeDrawer}
        onChanged={load}
        setDrawerId={setDrawerId}
      />

      <Modal
        title={
          <span className="font-serif text-base flex items-center gap-2">
            <Link2 size={16} className="text-indigo-600" /> 批量合并线索
          </span>
        }
        open={batchMergeOpen}
        onCancel={() => setBatchMergeOpen(false)}
        onOk={handleBatchMerge}
        confirmLoading={batchMergeLoading}
        okText="确认合并"
        cancelText="取消"
        width={600}
      >
        <div className="space-y-4">
          <div className="text-xs text-slate-600">
            请选择主线索（其它线索将合并入此主线索统一核查）：
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {data
              .filter(
                (d) =>
                  selected.includes(d.id) &&
                  d.status !== "resolved" &&
                  !d.mergedParentId,
              )
              .map((c) => (
                <div
                  key={c.id}
                  className={[
                    "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition",
                    batchMasterId === c.id
                      ? "bg-indigo-50"
                      : "hover:bg-slate-50",
                  ].join(" ")}
                  onClick={() => setBatchMasterId(c.id)}
                >
                  <div className="mt-1">
                    <div
                      className={[
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        batchMasterId === c.id
                          ? "border-indigo-600"
                          : "border-slate-300",
                      ].join(" ")}
                    >
                      {batchMasterId === c.id && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-600">
                        {c.id}
                      </span>
                      <LevelBadge level={c.level} />
                      <StatusBadge status={c.status} />
                      <span className="text-[11px] text-slate-400 font-mono">
                        {dayjs(c.createdAt).format("MM-DD HH:mm")}
                      </span>
                      {batchMasterId === c.id && (
                        <Tag
                          color="indigo"
                          className="!text-[10px] !px-1.5 !py-0 !margin-0"
                        >
                          主线索
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                      {c.description}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      举报人：{c.reporterName}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1.5">
              合并备注（选填）
            </div>
            <Input.TextArea
              rows={2}
              value={batchMergeRemark}
              onChange={(e) => setBatchMergeRemark(e.target.value)}
              placeholder="例如：同一用户多次举报同一违规，合并后统一处理..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
