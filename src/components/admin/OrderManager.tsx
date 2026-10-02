'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Undo2, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { DataTable, clearTableCache, type Column, type TableQuery } from '@/components/admin/DataTable';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { OrderDrawer } from '@/components/admin/OrderDrawer';
import { CancelOrderDialog } from '@/components/admin/CancelOrderDialog';
import {
  autoCompleteDate, bulkOrders, fetchOrder, formatDateTime, formatPrice, type AdminOrder, type BulkResult,
} from '@/components/admin/order-admin';
import {
  ADMIN_NEXT_STEP, ADMIN_TARGET_LABELS, BULK_ORDER_LIMIT, forwardPath, MAIN_FLOW, ORDER_STATUS_LABELS, type OrderStatus,
} from '@/lib/orders/status';

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
/** Các bước có thể chuyển tới (không gồm Chờ xử lý). */
const TARGETS = MAIN_FLOW.slice(1);
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

type UndoItem = { code: string; current: OrderStatus; to: OrderStatus };
type UndoState = { items: UndoItem[]; message: string };

const canMove = (order: AdminOrder) => Boolean(ADMIN_NEXT_STEP[order.orderStatus]);
const label = (codes: string[]) => codes.length > 1 ? `${codes.length} đơn` : `Đơn ${codes[0]}`;

/**
 * Quản lý đơn hàng theo kiểu "hộp việc" (cách Shopee/Sapo xử lý đơn): tab theo trạng thái có số đếm, mỗi dòng có
 * sẵn nút cho bước kế tiếp, chọn nhiều đơn ở bất kỳ tab nào để xử lý một lần, "Chuyển tới…" để đi thẳng nhiều bước
 * (đơn đã gọi xác nhận và giao luôn), chi tiết mở dạng ngăn kéo, bấm nhầm thì hoàn tác được.
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
  const [openIndex, setOpenIndex] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<AdminOrder[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();
  const version = useRef<string | null>(null);
  const targetMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => { rememberedTab = tab; setSelected(new Set()); }, [tab]);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const fetchOrders = useCallback(async (query: TableQuery) => {
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: tab });
    const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không tải được đơn hàng, vui lòng bấm Làm mới');
    setCounts(data.counts);
    version.current = data.version;
    return { items: data.items as AdminOrder[], total: data.total as number, page: data.page as number, pages: data.pages as number };
  }, [tab]);

  /** Dữ liệu đã đổi: bỏ dữ liệu lưu của mọi tab, tải lại tab đang xem (kèm số đếm). */
  const reload = useCallback(() => { clearTableCache(TABLE_KEY); setReloadKey((key) => key + 1); }, []);

  // Kiểm tra thay đổi: mỗi POLL_MS khi tab đang hiển thị và ngay khi quay lại tab.
  useEffect(() => {
    let stopped = false;
    let running = false;
    const check = async () => {
      if (running || document.visibilityState !== 'visible' || version.current === null) return;
      running = true;
      try {
        const response = await fetch('/api/admin/orders?summary=1', { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const data = await response.json();
        setCounts(data.counts);
        if (data.version !== version.current) { version.current = data.version; reload(); }
      } catch { /* mất mạng tạm thời: lần sau thử lại */ } finally { running = false; }
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
    showToast(`${label(codes)} ${CONFLICT_MESSAGE}`, 'info');
  };

  const setBusyFor = (codes: string[], on: boolean) => setBusy((current) => {
    const next = new Set(current);
    for (const code of codes) { if (on) next.add(code); else next.delete(code); }
    return next;
  });

  const showUndo = (state: UndoState) => {
    clearTimeout(undoTimer.current);
    setUndo(state);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_VISIBLE_MS);
  };

  /** Gửi một thao tác cho các đơn; báo xung đột và lỗi; trả về mã các đơn đã xử lý xong. */
  const run = async (codes: string[], request: () => Promise<BulkResult[]>) => {
    setBusyFor(codes, true);
    let results: BulkResult[];
    try {
      results = await request();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra', 'info');
      return [];
    } finally {
      setBusyFor(codes, false);
    }
    const done = results.filter((result) => result.ok).map((result) => result.code);
    await resolveConflicts(results.filter((result) => result.conflict).map((result) => result.code));
    const failed = results.filter((result) => !result.ok && !result.conflict);
    if (failed.length) {
      showToast(`${failed.length > 1 ? `${failed.length} đơn` : `Đơn ${failed[0].code}`} chưa cập nhật được: ${failed[0].error}`, 'info');
    }
    if (done.length) { setSelected(new Set()); reload(); }
    return done;
  };

  /** Chuyển các đơn tới bước `to` (một hoặc nhiều bước); đơn đã ở bước đó hoặc sau đó được bỏ qua. */
  const advance = async (orders: AdminOrder[], to: OrderStatus) => {
    const eligible = orders.filter((order) => forwardPath(order.orderStatus, to));
    if (!eligible.length) return;
    const origin = new Map(eligible.map((order) => [order.orderCode, order.orderStatus]));
    const codes = eligible.map((order) => order.orderCode);
    const done = await run(codes, () => bulkOrders({ action: 'advance', codes, to }));
    if (!done.length) return;
    // Cập nhật ngay đơn đang mở trong ngăn kéo để không phải chờ tải lại.
    setOpenOrder((order) => {
      const from = order && done.includes(order.orderCode) ? origin.get(order.orderCode) : undefined;
      if (!order || !from) return order;
      const createdAt = new Date().toISOString();
      const steps = (forwardPath(from, to) ?? [to]).map((status) => ({ status, actor: 'admin' as const, note: null, createdAt }));
      // Đơn COD hoàn tất nghĩa là shipper đã thu tiền (máy chủ ghi nhận cùng lúc).
      const paymentStatus = to === 'COMPLETED' && order.paymentMethod === 'COD' ? 'PAID' : order.paymentStatus;
      return { ...order, orderStatus: to, paymentStatus, events: [...order.events, ...steps] };
    });
    const skipped = orders.length - eligible.length;
    showUndo({
      items: done.map((code) => ({ code, current: to, to: origin.get(code)! })),
      message: `${label(done)}: ${ORDER_STATUS_LABELS[to]}${skipped ? ` · bỏ qua ${skipped} đơn đã ở bước này hoặc sau` : ''}`,
    });
  };

  const cancel = async (orders: AdminOrder[], reason: string) => {
    const codes = orders.map((order) => order.orderCode);
    const done = await run(codes, () => bulkOrders({ action: 'cancel', codes, note: reason }));
    setCancelTarget(null);
    if (!done.length) return;
    setOpenOrder((order) => order && done.includes(order.orderCode)
      ? { ...order, orderStatus: 'CANCELLED', events: [...order.events, { status: 'CANCELLED', actor: 'admin', note: reason, createdAt: new Date().toISOString() }] }
      : order);
    showToast(`Đã hủy ${done.length > 1 ? `${done.length} đơn` : `đơn ${done[0]}`}`, 'info');
  };

  const runUndo = async () => {
    if (!undo) return;
    const { items } = undo;
    clearTimeout(undoTimer.current);
    setUndo(null);
    const done = await run(items.map((item) => item.code), () => bulkOrders({ action: 'undo', items }));
    if (!done.length) return;
    const byCode = new Map(items.map((item) => [item.code, item]));
    setOpenOrder((order) => {
      const item = order && done.includes(order.orderCode) ? byCode.get(order.orderCode) : undefined;
      if (!order || !item) return order;
      const removed = forwardPath(item.to, item.current)?.length ?? 1;
      const paymentStatus = item.current === 'COMPLETED' && order.paymentMethod === 'COD' ? 'PENDING' : order.paymentStatus;
      return { ...order, orderStatus: item.to, paymentStatus, events: order.events.slice(0, -removed) };
    });
    const targets = new Set(items.filter((item) => done.includes(item.code)).map((item) => item.to));
    showToast(`Đã hoàn tác ${done.length > 1 ? `${done.length} đơn` : 'đơn'}${targets.size === 1
      ? ` về lại "${ORDER_STATUS_LABELS[[...targets][0]]}"` : ' về trạng thái trước đó'}`, 'success');
  };

  // Ngăn kéo luôn hiện dữ liệu mới nhất của đơn đang mở; nhớ vị trí để "Đơn tiếp theo" vẫn đúng khi đơn vừa xử lý rời tab.
  useEffect(() => {
    if (!openCode) return;
    const index = rows.findIndex((row) => row.orderCode === openCode);
    if (index >= 0) { setOpenOrder(rows[index]); setOpenIndex(index); }
  }, [rows, openCode]);
  const openDrawer = (order: AdminOrder) => {
    setOpenCode(order.orderCode); setOpenOrder(order);
    setOpenIndex(Math.max(0, rows.findIndex((row) => row.orderCode === order.orderCode)));
  };
  const closeDrawer = useCallback(() => { setOpenCode(null); setOpenOrder(null); }, []);
  const openInList = openOrder ? rows.findIndex((row) => row.orderCode === openOrder.orderCode) : -1;
  const previousOrder = openInList >= 0 ? rows[openInList - 1] : rows[openIndex - 1];
  const nextOrder = openInList >= 0 ? rows[openInList + 1] : rows[openIndex];

  const selectedRows = rows.filter((row) => selected.has(row.orderCode));
  const selectableRows = rows.filter(canMove);
  const selectionEnabled = tab === '' || ACTIVE_TABS.has(tab);
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selected.has(row.orderCode));
  const toggle = (code: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code);
    else if (next.size < BULK_ORDER_LIMIT) next.add(code);
    return next;
  });
  const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : null;
  const sameStatus = selectedRows.length > 0 && selectedRows.every((row) => row.orderStatus === selectedRows[0].orderStatus);
  const nextForSelection = sameStatus ? ADMIN_NEXT_STEP[selectedRows[0].orderStatus] : undefined;
  const targetOptions = TARGETS.map((status) => ({ status,
    eligible: selectedRows.filter((row) => forwardPath(row.orderStatus, status)).length }))
    .filter((option) => option.eligible > 0 && option.status !== nextForSelection?.to);
  const selectionBusy = selectedRows.some((row) => busy.has(row.orderCode));

  const columns: Column<AdminOrder>[] = [
    ...(selectionEnabled ? [{
      key: 'select', className: 'w-12',
      header: <input type="checkbox" aria-label="Chọn tất cả đơn cần xử lý trên trang" checked={allSelected} disabled={!selectableRows.length}
        onChange={() => setSelected(allSelected ? new Set() : new Set(selectableRows.slice(0, BULK_ORDER_LIMIT).map((row) => row.orderCode)))}
        className="h-5 w-5 accent-honey-600" />,
      render: (row: AdminOrder) => canMove(row) ? <label onClick={(event) => event.stopPropagation()} className="-m-3 flex cursor-pointer p-3">
        <input type="checkbox" aria-label={`Chọn đơn ${row.orderCode}`} checked={selected.has(row.orderCode)}
          onChange={() => toggle(row.orderCode)} className="h-5 w-5 accent-honey-600" />
      </label> : null,
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
        return <button type="button" disabled={pending} onClick={(event) => { event.stopPropagation(); void advance([row], next.to); }}
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
    <p className="text-xs text-charcoal-500">
      Tick chọn nhiều đơn để xử lý một lần (tối đa {BULK_ORDER_LIMIT} đơn), hoặc bấm vào một dòng để xem đủ thông tin giao hàng, lịch sử và chuyển nhanh nhiều bước.
    </p>

    {selectedRows.length > 0 && <div role="region" aria-label="Thao tác hàng loạt"
      className="sticky bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-honey-200 bg-white p-3 shadow-soft">
      <span className="px-1 text-sm font-semibold text-charcoal-800">Đã chọn {selectedRows.length} đơn</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSelected(new Set())}
          className="min-h-10 rounded-xl px-3 text-sm font-semibold text-charcoal-600 hover:bg-cream-100">Bỏ chọn</button>
        <button type="button" onClick={() => setCancelTarget(selectedRows)} disabled={selectionBusy}
          className="min-h-10 rounded-xl border border-blush-200 px-3 text-sm font-semibold text-blush-700 hover:bg-blush-50 disabled:opacity-50">
          {selectedRows.every((row) => row.orderStatus === 'SHIPPING') ? 'Giao không thành công' : 'Hủy đơn'}
        </button>
        {targetOptions.length > 0 && <details ref={targetMenu} className="relative">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-honey-300 px-3 text-sm font-semibold text-honey-800 hover:bg-honey-50 [&::-webkit-details-marker]:hidden">
            Chuyển tới… <ChevronDown className="h-4 w-4" aria-hidden />
          </summary>
          <div role="menu" className="absolute bottom-full right-0 z-40 mb-2 w-64 space-y-1 rounded-2xl border border-cream-200 bg-white p-2 shadow-soft">
            {targetOptions.map((option) => <button key={option.status} type="button" role="menuitem" disabled={selectionBusy}
              onClick={() => { targetMenu.current?.removeAttribute('open'); void advance(selectedRows, option.status); }}
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-semibold text-charcoal-800 hover:bg-honey-50 disabled:opacity-50">
              <span>{ADMIN_TARGET_LABELS[option.status]}</span>
              <span className="text-xs font-normal text-charcoal-500">{option.eligible}/{selectedRows.length} đơn</span>
            </button>)}
            <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-charcoal-500">Các bước ở giữa được ghi đủ vào lịch sử đơn. Bấm nhầm thì hoàn tác ngay trên thông báo.</p>
          </div>
        </details>}
        {nextForSelection && <button type="button" onClick={() => void advance(selectedRows, nextForSelection.to)} disabled={selectionBusy}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white hover:bg-honey-700 disabled:opacity-50">
          {selectionBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{nextForSelection.label} ({selectedRows.length})
        </button>}
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
      onAdvance={(to) => void advance([openOrder], to)} onCancel={() => setCancelTarget([openOrder])}
      onPrevious={previousOrder ? () => openDrawer(previousOrder) : undefined}
      onNext={nextOrder ? () => openDrawer(nextOrder) : undefined} />, document.body)}

    {cancelTarget && createPortal(<CancelOrderDialog count={cancelTarget.length} shipping={cancelTarget.every((order) => order.orderStatus === 'SHIPPING')}
      busy={cancelTarget.some((order) => busy.has(order.orderCode))}
      onConfirm={(reason) => void cancel(cancelTarget, reason)} onClose={() => setCancelTarget(null)} />, document.body)}
  </div>;
}
