'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/client/toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { 
  User as UserIcon, 
  Baby, 
  Package, 
  Award, 
  LogOut, 
  Save, 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  ShoppingBag, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  Hourglass,
  PackageOpen,
  Truck,
  Star,
  KeyRound
} from 'lucide-react';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { CustomerStatusBadge } from '@/components/orders/CustomerStatusBadge';
import { formatDateVN } from '@/lib/utils/formatters';
import type { CustomerOrderList } from '@/types/order';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { EmailVerificationBanner } from '@/components/auth/EmailVerification';

export default function UserDashboardPage() {
  return (
    <ProtectedRoute requiredRole="user">
      <Suspense fallback={null}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}

const TABS = ['profile', 'baby', 'orders', 'rewards', 'security'] as const;
type DashboardTab = typeof TABS[number];

function DashboardContent() {
  const { user, updateProfile, updateBabyProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  // `?tab=security`: mở thẳng mục Mật khẩu, ví dụ từ thông báo sau khi liên kết Google.
  const requestedTab = useSearchParams().get('tab');
  useEffect(() => {
    if (TABS.includes(requestedTab as DashboardTab)) setActiveTab(requestedTab as DashboardTab);
  }, [requestedTab]);

  // Form State cá nhân
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Form State bé yêu
  const [babyName, setBabyName] = useState(user?.babyProfile?.name || '');
  const [birthDate, setBirthDate] = useState(user?.babyProfile?.birthDate || '');
  const [weight, setWeight] = useState<number>(user?.babyProfile?.weight || 0);
  const [height, setHeight] = useState<number>(user?.babyProfile?.height || 0);
  const [isSavingBaby, setIsSavingBaby] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setAddress(user.address || '');
    setCity(user.city || '');
    setBabyName(user.babyProfile?.name || '');
    setBirthDate(user.babyProfile?.birthDate || '');
    setWeight(user.babyProfile?.weight || 0);
    setHeight(user.babyProfile?.height || 0);
  }, [user]);

  // Tính toán size tự động theo cân nặng bé
  const calculateRecommendedSize = (w: number) => {
    if (w < 8) return 'Size sơ sinh (0 - 12 tháng)';
    if (w <= 10) return 'Size 1 (8 - 10kg, 9 - 18 tháng)';
    if (w <= 12) return 'Size 2 (10 - 12kg, 18 - 24 tháng)';
    if (w <= 15) return 'Size 3 (12 - 15kg, 2 - 3 tuổi)';
    if (w <= 18) return 'Size 4 (15 - 18kg, 3 - 4 tuổi)';
    return 'Size 5 (18 - 22kg, 4 - 5 tuổi)';
  };

  const currentRecommendedSize = weight > 0 ? calculateRecommendedSize(weight) : '';

  // Lưu thông tin cá nhân
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const notice = toast.loading('Đang lưu thông tin cá nhân…', { id: 'profile-save' });
    const result = await updateProfile({ name, phone, address, city });
    setIsSavingProfile(false);

    if (result.success) {
      toast.success('Đã lưu thay đổi thông tin cá nhân thành công! 🌸', { id: notice });
    } else {
      toast.error(result.error || 'Có lỗi xảy ra khi lưu thông tin.', { id: notice });
    }
  };

  // Lưu thông tin bé yêu
  const handleSaveBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyName.trim() || weight <= 0 || height <= 0) {
      toast.warning('Vui lòng nhập tên, cân nặng và chiều cao hợp lệ của bé.');
      return;
    }
    setIsSavingBaby(true);
    const notice = toast.loading('Đang lưu hồ sơ bé…', { id: 'baby-save' });
    const result = await updateBabyProfile({
      name: babyName,
      birthDate,
      weight,
      height,
      recommendedSize: currentRecommendedSize,
    });
    setIsSavingBaby(false);
    if (result.success) toast.success('Đã cập nhật hồ sơ bé yêu. ✨', { id: notice });
    else toast.error(result.error || 'Không lưu được hồ sơ bé.', { id: notice });
  };

  // Đơn mua: lấy số đơn theo tab và vài đơn gần nhất; danh sách đầy đủ nằm ở trang /orders.
  const [orderData, setOrderData] = useState<Pick<CustomerOrderList, 'orders' | 'counts'> | null>(null);
  useEffect(() => {
    if (!user) return;
    fetch('/api/orders', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null)
      .then((data) => setOrderData(data?.counts ? data : null)).catch(() => setOrderData(null));
  }, [user?.id]);
  const orderShortcuts = [
    { tab: 'pending', label: 'Chờ xác nhận', icon: Hourglass },
    { tab: 'preparing', label: 'Đang chuẩn bị', icon: PackageOpen },
    { tab: 'shipping', label: 'Đang giao', icon: Truck },
    { tab: 'to-review', label: 'Chờ đánh giá', icon: Star },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <EmailVerificationBanner />

      {/* 1. TOP USER CARD (Warm & Sweet) */}
      <div className="bg-gradient-to-r from-cream-100 via-blush-50 to-honey-100 rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <UserAvatar src={user?.avatar} name={user?.name}
              className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white shadow-md" />
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-sage-500 border-2 border-white flex items-center justify-center text-[10px] text-white">
              ✓
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-charcoal-900">
                {user?.name}
              </h1>
              <span className="text-[11px] font-bold bg-honey-500 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Thành viên T&apos;Petie ⭐
              </span>
            </div>
            <p className="text-xs text-charcoal-600 flex items-center space-x-2">
              <span>{user?.email}</span>
              <span>•</span>
              <span className="font-bold text-honey-700">{user?.points ?? 0} Điểm thưởng</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full bg-white hover:bg-cream-100 border border-cream-300 text-charcoal-700 hover:text-blush-600 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD TABS & CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* SIDEBAR TABS */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-cream-200 p-3 shadow-card space-y-1.5">
          {[
            { id: 'profile', label: 'Thông tin cá nhân & Địa chỉ', icon: UserIcon, desc: 'Tên, SĐT, Địa chỉ nhận đồ' },
            { id: 'baby', label: 'Hồ sơ bé & Gợi ý size', icon: Baby, desc: 'Cân nặng, chiều cao, size chuẩn' },
            { id: 'orders', label: 'Đơn mua', icon: Package, desc: `${orderData?.counts.all ?? 0} đơn đã đặt` },
            { id: 'rewards', label: 'Điểm thưởng & Ưu đãi', icon: Award, desc: `${user?.points ?? 0} điểm hiện có` },
            { id: 'security', label: 'Mật khẩu', icon: KeyRound, desc: 'Đổi hoặc đặt mật khẩu đăng nhập' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-center space-x-3 group ${
                  isCurrent
                    ? 'bg-honey-50 text-honey-800 font-bold border border-honey-200 shadow-2xs'
                    : 'text-charcoal-700 hover:bg-cream-50 font-medium'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrent ? 'bg-honey-500 text-white' : 'bg-cream-100 text-charcoal-600 group-hover:bg-cream-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold truncate">{tab.label}</div>
                  <div className="text-[11px] text-charcoal-400 font-normal truncate">{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* MAIN TAB CONTENT */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-card">
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">
                  Thông Tin Cá Nhân &amp; Địa Chỉ Nhận Hàng
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Mẹ vui lòng điền thông tin chính xác để T&apos;Petie giao đồ nhanh chóng và đúng hẹn nhé.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Họ và tên</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Số điện thoại</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0988 123 456"
                      className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-800">Địa chỉ Email (Định danh)</label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-2xl border border-cream-200 bg-cream-50 text-charcoal-500 text-xs sm:text-sm cursor-not-allowed"
                  />
                  <p className="text-[10px] text-charcoal-400">Email dùng để nhận thông báo đơn hàng và không thể thay đổi.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-800">Địa chỉ giao hàng mặc định</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện"
                    className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HỒ SƠ BÉ YÊU & GỢI Ý SIZE */}
          {activeTab === 'baby' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">
                  👶 Hồ Sơ Bé Yêu &amp; Gợi Ý Size Tự Động
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Nhập cân nặng và chiều cao của bé để hệ thống tự động gợi ý size váy áo vừa vặn nhất.
                </p>
              </div>

              {/* Smart Size Advisor Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700 bg-white px-2 py-0.5 rounded-full border border-sage-200 inline-block">
                    Kích Thước Khuyên Dùng Cho Bé Hiện Tại
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-heading text-sage-800">
                    {currentRecommendedSize || 'Nhập cân nặng để xem gợi ý'}
                  </div>
                  <p className="text-xs text-charcoal-600">
                    {weight > 0 && height > 0 ? <>Dựa trên cân nặng <strong>{weight}kg</strong> và chiều cao <strong>{height}cm</strong>.</> : 'Gợi ý chỉ mang tính tham khảo sau khi có số đo.'}
                  </p>
                </div>

                <Link
                  href="/girls"
                  className="px-5 py-2 rounded-full bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95 flex items-center space-x-1"
                >
                  <span>Xem Đồ Size Này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <form onSubmit={handleSaveBaby} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Tên bé hoặc Tên ở nhà</label>
                    <input
                      type="text"
                      value={babyName}
                      onChange={(e) => setBabyName(e.target.value)}
                      placeholder="Bé Bắp (Tuệ Mẫn)"
                      className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Ngày sinh của bé</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Cân nặng hiện tại (kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="3"
                        max="30"
                        value={weight}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm font-bold text-honey-700"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-charcoal-400 font-bold">kg</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-800">Chiều cao hiện tại (cm)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="40"
                        max="140"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm font-bold text-charcoal-800"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-charcoal-400 font-bold">cm</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBaby}
                    className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingBaby ? 'Đang cập nhật...' : 'Cập Nhật Hồ Sơ Bé'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ĐƠN MUA — lối tắt theo trạng thái như mục "Đơn mua" của Shopee */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">Đơn Mua Của Mẹ</h2>
                  <p className="text-xs text-charcoal-500 mt-0.5">Theo dõi đơn đã đặt, xác nhận đã nhận hàng và đánh giá sản phẩm.</p>
                </div>
                <Link href="/orders" className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-sage-700 hover:bg-sage-800 text-white text-xs font-bold transition-all active:scale-95">
                  Xem tất cả đơn mua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {orderShortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  const count = orderData?.counts[shortcut.tab] ?? 0;
                  return (
                    <Link key={shortcut.tab} href={`/orders?tab=${shortcut.tab}`}
                      className="relative flex flex-col items-center gap-2 rounded-2xl border border-cream-200 bg-cream-50/60 p-4 text-center hover:border-honey-300 hover:bg-honey-50 transition-all">
                      <Icon className="w-6 h-6 text-sage-700" />
                      <span className="text-xs font-bold text-charcoal-800">{shortcut.label}</span>
                      {count > 0 && <span className={`absolute right-3 top-3 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center ${
                        shortcut.tab === 'to-review' ? 'bg-blush-500' : 'bg-honey-500'}`}>{count}</span>}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-charcoal-900">Đơn gần đây</h3>
                {orderData && orderData.orders.length === 0 && (
                  <p className="text-xs text-charcoal-500">Mẹ chưa có đơn hàng nào. <Link href="/girls" className="font-bold text-honey-700 hover:underline">Mua sắm ngay</Link></p>
                )}
                {orderData?.orders.slice(0, 3).map((order) => (
                  <Link key={order.code} href={`/orders/${order.code}`}
                    className="flex items-center gap-3 rounded-2xl border border-cream-200 p-3 hover:border-honey-300 transition-all">
                    {order.items[0]?.thumbnail
                      ? <img src={cloudinaryImage(order.items[0].thumbnail, { width: 96 })} alt="" className="w-12 h-12 rounded-xl object-cover border border-cream-200 shrink-0" />
                      : <span className="w-12 h-12 rounded-xl bg-cream-100 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-charcoal-900 truncate">Đơn {order.code}</p>
                      <p className="text-[11px] text-charcoal-500 truncate">{formatDateVN(order.createdAt)} · {order.itemCount} sản phẩm · {order.total.toLocaleString('vi-VN')}đ</p>
                    </div>
                    <CustomerStatusBadge status={order.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">🔒 Mật Khẩu</h2>
                <p className="text-xs text-charcoal-500 mt-0.5">Đổi mật khẩu, hoặc đặt mật khẩu cho tài khoản tạo bằng Google.</p>
              </div>
              <ChangePasswordForm />
            </div>
          )}

          {/* TAB 4: ĐIỂM THƯỞNG & VOUCHER */}
          {activeTab === 'rewards' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">
                  🎁 Điểm Tích Lũy
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Số điểm hiện có trong tài khoản của bạn.
                </p>
              </div>

              {/* Points banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-honey-100 via-blush-50 to-cream-100 border border-honey-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-honey-700">Điểm Thưởng Khả Dụng</span>
                  <div className="text-3xl font-extrabold font-heading text-honey-800 mt-1">
                    {user?.points ?? 0} <span className="text-sm font-normal">Điểm ⭐</span>
                  </div>
                  <p className="text-xs text-charcoal-600 mt-1">Chương trình đổi điểm đang được hoàn thiện.</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
