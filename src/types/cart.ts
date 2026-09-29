/**
 * Type definitions cho Giỏ hàng & Thanh toán giả lập
 */

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  thumbnail: string;
  category: string;
  selectedSize: string;     // VD: "Size 2 (10 - 12kg)"
  price: number;            // Giá theo size đã chọn
  quantity: number;
}

export interface CustomerInfo {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  district: string;
  note?: string;
  giftWrap?: boolean;       // Yêu cầu gói quà kèm thiệp
  giftMessage?: string;
}

export type PaymentMethod = 'cod' | 'bank_transfer_qr' | 'momo';

export interface SimulatedOrder {
  orderId: string;
  createdAt: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  promoCode?: string;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed';
}
