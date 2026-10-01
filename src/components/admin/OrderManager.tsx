'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Undo2, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { DataTable, clearTableCache, type Column, type TableQuery } from '@/components/admin/DataTable';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { OrderDrawer } from '@/components/admin/OrderDrawer';
import { CancelOrderDialog } from '@/components/admin/CancelOrderDialog';
import {
  autoCompleteDate, fetchOrder, formatDateTime, formatPrice, OrderRequestError, patchOrder, type AdminOrder,
} from '@/components/admin/order-admin';
import { ADMIN_NEXT_STEP, ORDER_STATUS_LABELS, UNDOABLE_STATUSES, type OrderStatus } from '@/lib/orders/status';

const TABLE_KEY = '/admin/orders';
const TABS: { value: OrderStatus | ''; label: string }[] = [
  { value: 'PENDING', label: ORDER_STATUS_LABELS.PENDING },
  { value: 'CONFIRMED', label: ORDER_STATUS_LABELS.CONFIRMED },
  { value: 'PROCESSING', label: ORDER_STATUS_LABELS.PROCESSING },
  { value: 'SHIPPING', label: ORDER_STATUS_LABELS.SHIPPING },
  { value: 'COMPLETED', label: ORDER_STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED', label: ORDER_STATUS_LABELS.CANCELLED },
  { value: '', label: 'Tất cả' },
];
/** Tab cần xử lý: số đơn được tô nổi để biết ngay còn bao nhiêu việc. */
const ACTIVE_TABS = new Set<string>(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING']);
const UNDO_VISIBLE_MS = 8000;
/**
 * Trạng thái đơn còn đổi từ phía khách (hủy, "Đã nhận được hàng") và hệ thống (tự hoàn tất), nên trang
 * kiểm tra định kỳ bằng một truy vấn rất nhẹ (số đếm + mốc thay đổi), chỉ khi tab đang mở, và chỉ tải lại
 * danh sách khi dữ liệu thật sự đổi.
 */
const POLL_MS = 30_000;
const CONFLICT_MESSAGE = 'đã được cập nhật trước đó (có thể khách vừa thao tác). Đã tải lại trạng thái mới nhất.';

/** Tab đang xem được nhớ trong tab trình duyệt để quay lại trang đơn hàng đúng chỗ. */
let rememberedTab: OrderStatus | '' = 'PENDING';

type UndoState = { codes: string[]; status: OrderStatus; message: string };

/** Chạy tối đa 4 yêu cầu cùng lúc; trả về các mục thành công, các mục bị xung đột (đơn đã đổi ở nơi khác) và lỗi khác đầu tiên. */
async function runBatch<T>(items: T[], task: (item: T) => Promise<unknown>) {
  const done: T[] = [];
  const conflicts: T[] = [];
  let firstError = '';
  for (let start = 0; start < items.length; start += 4) {
    await Promise.all(items.slice(start, start + 4).map(async (item) => {
      try { await task(item); done.push(item); }
      catch (error) {
        if (error instanceof OrderRequestError && error.conflict) conflicts.push(item);
        else firstError ||= error instanceof Error ? error.message : 'Có lỗi xảy ra';
      }
    }));
  }
  return { done, conflicts, firstError };
}

/**
 * Quản lý đơn hàng theo kiểu "hộp việc": tab theo trạng thái có số đếm, mỗi dòng có sẵn nút cho bước
 * kế tiếp, chọn nhiều đơn để xử lý một lần, chi tiết mở dạng ngăn kéo, bấm nhầm thì hoàn tác được.
 */
export function OrderManager() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<OrderStatus | ''>(rememberedTab);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [openOrder, setOpenOrder] = useState<AdminOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminOrder[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();
  const version = useRef<string | null>(null);

  useEffect(() => { rememberedTab = tab; setSelected(new Set()); }, [tab]);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const fetchOrders = useCallback(async (query: TableQuery) => {
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: tab });
    const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không tải được đơn hàng');
    setCounts(data.counts);
    version.current = data.version;
    return { items: data.items as AdminOrder[], total: data.total as number, page: data.page as number, pages: data.pages as number };
  }, [tab]);

  /** Dữ liệu đã đổi: bỏ dữ liệu lưu của mọi tab, tải lại tab đang xem (kèm số đếm). */
  const reload = useCallback(() => { clearTableCache(TABLE_KEY); setReloadKey((key) => key + 1); }, []);

  // Kiểm tra thay đổi: mỗi POLL_MS khi tab đang hiển thị và ngay khi quay lại tab.
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== 'visible' || version.current === null) return;
      try {
        const response = await fetch('/api/admin/orders?summary=1', { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const data = await response.json();
        setCounts(data.counts);
        if (data.version !== version.current) { version.current = data.version; reload(); }
      } catch { /* mất mạng tạm thời: lần sau thử lại */ }
    };
    const timer = setInterval(() => void check(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [reload]);

  /** Đơn đã đổi ở nơi khác: tải lại danh sách, cập nhật ngăn kéo đang mở và báo rõ cho người dùng. */
  const resolveConflicts = async (codes: string[]) => {
    if (!codes.length) return;
    reload();
    if (openOrder && codes.includes(openOrder.orderCode)) {
      const fresh = await fetchOrder(openOrder.orderCode);
      if (fresh) setOpenOrder(fresh);
    }
    showToast(`${codes.length > 1 ? `${codes.length} đơn` : `Đơn ${codes[0]}`} ${CONFLICT_MESSAGE}`, 'info');
  };

  const setBusyFor = (codes: string[], on: boolean) => setBusy((current) => {
    const next = new Set(current);
    for (const code of codes) { if (on) next.add(code); else next.delete(code); }
    return next;
  });

  /** Cập nhật ngay đơn đang mở trong ngăn kéo để không phải chờ tải lại. */
  const applyToOpen = (codes: string[], status: OrderStatus, note?: string) => setOpenOrder((order) => order && codes.includes(order.orderCode)
    ? { ...order, orderStatus: status, events: [...order.events, { status, actor: 'admin', note: note ?? null, createdAt: new Date().toISOString() }] }
    : order);

  const showUndo = (state: UndoState) => {
    clearTimeout(undoTimer.current);
    setUndo(state);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_VISIBLE_MS);
  };

  const advance = async (orders: AdminOrder[]) => {
    const status = orders[0]?.orderStatus;
    const next = status && ADMIN_NEXT_STEP[status];
    if (!next || orders.some((order) => order.orderStatus !== status)) return;
    const codes = orders.map((order) => order.orderCode);
    setBusyFor(codes, true);
    const { done, conflicts, firstError } = await runBatch(codes, (code) => patchOrder(code, { status: next.to }));
    setBusyFor(codes, false);
    await resolveConflicts(conflicts);
    if (done.length) {
      applyToOpen(done, next.to);
      setSelected(new Set());
      reload();
      const message = `${done.length > 1 ? `${done.length} đơn` : `Đơn ${done[0]}`}: ${ORDER_STATUS_LABELS[next.to]}`;
      if (UNDOABLE_STATUSES.includes(next.to)) showUndo({ codes: done, status: next.to, message });
      else showToast(message, 'success');
    }
    if (firstError) showToast(done.length ? `Một số đơn chưa cập nhật được: ${firstError}` : firstError, 'info');
  };

  const cancel = async (orders: AdminOrder[], reason: string) => {
    const codes = orders.map((order) => order.orderCode);
    setBusyFor(codes, true);
    const { done, conflicts, firstError } = await runBatch(codes, (code) => patchOrder(code, { status: 'CANCELLED', note: reason }));
    setBusyFor(codes, false);
    setCancelTarget(null);
    await resolveConflicts(conflicts);
    if (done.length) {
      applyToOpen(done, 'CANCELLED', reason);
      setSelected(new Set());
      reload();
      showToast(`Đã hủy ${done.length > 1 ? `${done.length} đơn` : `đơn ${done[0]}`}`, 'info');
    }
    if (firstError) showToast(firstError, 'info');
  };

  const runUndo = async () => {
    if (!undo) return;
    const { codes, status } = undo;
    clearTimeout(undoTimer.current);
    setUndo(null);
    setBusyFor(codes, true);
    let reverted: OrderStatus | null = null;
    const { done, conflicts, firstError } = await runBatch(codes, async (code) => { reverted = await patchOrder(code, { undo: status }); });
    setBusyFor(codes, false);
    await resolveConflicts(conflicts);
    if (done.length && reverted) {
      const back = reverted as OrderStatus;
      setOpenOrder((order) => order && done.includes(order.orderCode)
        ? { ...order, orderStatus: back, events: order.events.slice(0, -1) } : order);
      reload();
      showToast(`Đã hoàn tác, ${done.length > 1 ? `${done.length} đơn` : 'đơn'} về lại "${ORDER_STATUS_LABELS[back]}"`, 'success');
    }
    if (firstError) showToast(firstError, 'info');
  };

  useEffect(() => {
    if (!openCode) return;
    const fresh = rows.find((row) => row.orderCode === openCode);
    if (fresh) setOpenOrder(fresh);
  }, [rows, openCode]);
  const openDrawer = (order: AdminOrder) => { setOpenCode(order.orderCode); setOpenOrder(order); };
  const closeDrawer = useCallback(() => { setOpenCode(null); setOpenOrder(null); }, []);

  const selectable = Boolean(tab && ADMIN_NEXT_STEP[tab]);
  const selectedRows = rows.filter((row) => selected.has(row.orderCode));
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.orderCode));
  const toggle = (code: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : null;
  const nextForTab = tab ? ADMIN_NEXT_STEP[tab] : undefined;

  const columns: Column<AdminOrder>[] = [
    ...(selectable ? [{
      key: 'select', className: 'w-12',
      header: <input type="checkbox" aria-label="Chọn tất cả đơn trên trang" checked={allSelected}
        onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.orderCode)))}
        className="h-5 w-5 accent-honey-600" />,
      render: (row: AdminOrder) => <label onClick={(event) => event.stopPropagation()} className="-m-3 flex cursor-pointer p-3">
        <input type="checkbox" aria-label={`Chọn đơn ${row.orderCode}`} checked={selected.has(row.orderCode)}
          onChange={() => toggle(row.orderCode)} className="h-5 w-5 accent-honey-600" />
      </label>,
    }] : []),
    { key: 'code', header: 'Mã đơn', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.orderCode}</p>
        <p className="text-xs text-charcoal-500">{formatDateTime(row.createdAt)}</p>
      </div> },
    { key: 'customer', header: 'Khách hàng', render: (row) => <div>
        <p>{row.customerName}</p>
        <p className="text-xs text-charcoal-500">{row.customerPhone}</p>
      </div> },
    { key: 'items', header: 'Sản phẩm', render: (row) => <span className="text-xs text-charcoal-600">
        {row.items.reduce((sum, item) => sum + item.quantity, 0)} món · {row.items.slice(0, 2).map((item) => item.name).join(', ')}{row.items.length > 2 ? '…' : ''}
        <span className="block text-charcoal-500">{row.district}, {row.city}</span>
      </span> },
    { key: 'total', header: 'Tổng tiền', render: (row) => <span className="font-semibold tabular-nums">{formatPrice(row.totalAmount)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => {
        const auto = autoCompleteDate(row);
        return <div className="space-y-1">
          <OrderStatusBadge status={row.orderStatus} />
          {auto && <p className="text-[11px] text-charcoal-500">Tự hoàn tất {auto.toLocaleDateString('vi-VN')}</p>}
        </div>;
      } },
    { key: 'action', header: '', className: 'text-right', render: (row) => {
        const next = ADMIN_NEXT_STEP[row.orderStatus];
        if (!next) return null;
        const pending = busy.has(row.orderCode);
        return <button type="button" disabled={pending} onClick={(event) => { event.stopPropagation(); void advance([row]); }}
          className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-honey-600 px-3 text-xs font-bold text-white hover:bg-honey-700 disabled:opacity-50">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{next.label}
        </button>;
      } },
  ];

  return <div className="space-y-4">
    <nav aria-label="Lọc theo trạng thái" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {TABS.map((item) => {
        // Chưa có số liệu thật thì không hiện số, tránh hiện "0" sai.
        const count = counts ? item.value ? counts[item.value] ?? 0 : total : null;
        const active = tab === item.value;
        return <button key={item.value || 'all'} type="button" aria-pressed={active} onClick={() => setTab(item.value)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${active
            ? 'bg-honey-600 text-white shadow-sm' : 'border border-cream-300 bg-white text-charcoal-700 hover:bg-honey-50'}`}>
          {item.label}
          {count !== null && count !== undefined && <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${active ? 'bg-white/25'
            : ACTIVE_TABS.has(item.value) && count > 0 ? 'bg-honey-100 text-honey-800' : 'bg-cream-100 text-charcoal-500'}`}>{count}</span>}
        </button>;
      })}
    </nav>

    <DataTable key={tab || 'all'} stateKey={`${TABLE_KEY}:${tab || 'all'}`} columns={columns} fetchPage={fetchOrders}
      reloadKey={reloadKey} onData={setRows} alwaysRevalidate
      searchPlaceholder="Tìm theo mã đơn, tên khách hoặc số điện thoại"
      emptyText={tab && ACTIVE_TABS.has(tab) ? 'Không còn đơn nào cần xử lý ở bước này.' : 'Chưa có đơn hàng nào.'}
      onRowClick={openDrawer} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem đủ thông tin giao hàng, lịch sử và hủy đơn.</p>

    {selectable && selectedRows.length > 0 && nextForTab && <div role="region" aria-label="Thao tác hàng loạt"
      className="sticky bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-honey-200 bg-white p-3 shadow-soft">
      <span className="px-1 text-sm font-semibold text-charcoal-800">Đã chọn {selectedRows.length} đơn</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <button type="button" onClick={() => setSelected(new Set())}
          className="min-h-10 rounded-xl px-3 text-sm font-semibold text-charcoal-600 hover:bg-cream-100">Bỏ chọn</button>
        <button type="button" onClick={() => setCancelTarget(selectedRows)}
          className="min-h-10 rounded-xl border border-blush-200 px-3 text-sm font-semibold text-blush-700 hover:bg-blush-50">
          {tab === 'SHIPPING' ? 'Giao không thành công' : 'Hủy đơn'}
        </button>
        <button type="button" onClick={() => void advance(selectedRows)} disabled={selectedRows.some((row) => busy.has(row.orderCode))}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white hover:bg-honey-700 disabled:opacity-50">
          {nextForTab.label} ({selectedRows.length})
        </button>
      </div>
    </div>}

    {undo && createPortal(<div role="status" className="fixed bottom-6 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 overflow-hidden rounded-2xl bg-charcoal-900 px-4 py-3 text-sm text-white shadow-2xl motion-safe:animate-slide-up">
      <span className="min-w-0 flex-1">{undo.message}</span>
      <button type="button" onClick={() => void runUndo()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-bold text-honey-200 hover:bg-white/10">
        <Undo2 className="h-4 w-4" aria-hidden />Hoàn tác
      </button>
      <button type="button" aria-label="Đóng" onClick={() => { clearTimeout(undoTimer.current); setUndo(null); }}
        className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"><X className="h-4 w-4" aria-hidden /></button>
    </div>, document.body)}

    {/* Lớp phủ gắn thẳng vào body để luôn phủ kín màn hình, không phụ thuộc khung bao của trang. */}
    {openOrder && createPortal(<OrderDrawer order={openOrder} busy={busy.has(openOrder.orderCode)} onClose={closeDrawer}
      onAdvance={() => void advance([openOrder])} onCancel={() => setCancelTarget([openOrder])} />, document.body)}

    {cancelTarget && createPortal(<CancelOrderDialog count={cancelTarget.length} shipping={cancelTarget[0]?.orderStatus === 'SHIPPING'}
      busy={cancelTarget.some((order) => busy.has(order.orderCode))}
      onConfirm={(reason) => void cancel(cancelTarget, reason)} onClose={() => setCancelTarget(null)} />, document.body)}
  </div>;
}
