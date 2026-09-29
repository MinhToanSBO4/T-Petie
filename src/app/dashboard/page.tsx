'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
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
  Tag
} from 'lucide-react';

export default function UserDashboardPage() {
  return (
    <ProtectedRoute requiredRole="user">
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, updateProfile, updateBabyProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'baby' | 'orders' | 'rewards'>('profile');

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
    const result = await updateProfile({ name, phone, address, city });
    setIsSavingProfile(false);

    if (result.success) {
      showToast('Đã lưu thay đổi thông tin cá nhân thành công! 🌸');
    } else {
      showToast(result.error || 'Có lỗi xảy ra khi lưu thông tin.', 'info');
    }
  };

  // Lưu thông tin bé yêu
  const handleSaveBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyName.trim() || weight <= 0 || height <= 0) {
      showToast('Vui lòng nhập tên, cân nặng và chiều cao hợp lệ của bé.', 'info');
      return;
    }
    setIsSavingBaby(true);
    const result = await updateBabyProfile({
      name: babyName,
      birthDate,
      weight,
      height,
      recommendedSize: currentRecommendedSize,
    });
    setIsSavingBaby(false);
    showToast(result.success ? 'Đã cập nhật hồ sơ bé yêu. ✨' : result.error || 'Không lưu được hồ sơ bé.', result.success ? 'success' : 'info');
  };

  type OrderView = { id: string; date: string; status: string; total: number;
    items: { name: string; size: string; qty: number; price: number; img: string }[] };
  const [orders, setOrders] = useState<OrderView[]>([]);
  useEffect(() => {
    if (!user) return;
    fetch('/api/orders', { cache: 'no-store' }).then((response) => response.json())
      .then((data) => setOrders(Array.isArray(data.orders) ? data.orders : [])).catch(() => setOrders([]));
  }, [user?.id]);
  const statusView: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ xác nhận', color: 'bg-honey-100 text-honey-700 border-honey-200' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'bg-sage-100 text-sage-700 border-sage-200' },
    PROCESSING: { label: 'Đang chuẩn bị', color: 'bg-honey-100 text-honey-700 border-honey-200' },
    SHIPPING: { label: 'Đang vận chuyển', color: 'bg-honey-100 text-honey-700 border-honey-200' },
    COMPLETED: { label: 'Hoàn tất', color: 'bg-sage-100 text-sage-700 border-sage-200' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-blush-100 text-blush-700 border-blush-200' },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Tài Khoản & Hồ Sơ Mẹ', href: '/dashboard' }]} />

      {/* 1. TOP USER CARD (Warm & Sweet) */}
      <div className="bg-gradient-to-r from-cream-100 via-blush-50 to-honey-100 rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-honey-200 flex items-center justify-center text-2xl font-bold font-heading text-honey-800">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name.charAt(0) || 'M'
              )}
            </div>
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
            { id: 'orders', label: 'Lịch sử đơn hàng', icon: Package, desc: `${orders.length} đơn hàng đã đặt` },
            { id: 'rewards', label: 'Điểm thưởng & Ưu đãi', icon: Award, desc: `${user?.points ?? 0} điểm hiện có` },
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
                  href="/be-gai"
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

          {/* TAB 3: ĐƠN HÀNG CỦA TÔI */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="border-b border-cream-200 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-heading text-charcoal-900">
                    Lịch Sử Đơn Hàng Của Mẹ
                  </h2>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Theo dõi tình trạng đơn hàng và xem lại các sản phẩm đã đặt mua.
                  </p>
                </div>
                <span className="text-xs font-bold bg-cream-100 text-charcoal-700 px-3 py-1 rounded-full border border-cream-200">
                  {orders.length} Đơn hàng
                </span>
              </div>

              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-5 rounded-2xl border border-cream-200 hover:border-honey-300 transition-all space-y-4 bg-cream-50/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-cream-200 text-xs">
                      <div>
                        <span className="font-bold text-charcoal-900">Mã đơn: #{order.id}</span>
                        <span className="text-charcoal-400 ml-2">({new Date(order.date).toLocaleDateString('vi-VN')})</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${statusView[order.status]?.color || ''}`}>
                        {statusView[order.status]?.label || order.status}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <img src={item.img} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-cream-200 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-charcoal-900 truncate">{item.name}</h4>
                            <p className="text-[11px] text-charcoal-400">Phân loại: {item.size} • Số lượng: x{item.qty}</p>
                          </div>
                          <span className="text-xs font-bold text-honey-600 font-heading">
                            {item.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
                      <div className="text-xs text-charcoal-600">
                        Tổng thanh toán: <strong className="text-sm font-bold text-honey-600 font-heading">{(order.total).toLocaleString('vi-VN')}đ</strong>
                      </div>
                      <Link href={`/tra-cuu-don?code=${encodeURIComponent(order.id)}`}
                        className="px-4 py-1.5 rounded-full bg-white hover:bg-cream-100 border border-cream-300 text-xs font-bold text-charcoal-700 transition-all active:scale-95">
                        Tra cứu hành trình
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
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
