'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '@/types/cart';
import { Product, ProductSizeOption } from '@/types/product';
import { trackAddToCart } from '@/client/analytics/tracker';
import { cartSizeLabel } from '@/lib/orders/variant-match';

/** Thông tin sản phẩm giỏ hàng cần lưu: thẻ trong danh sách (dữ liệu gọn) và trang chi tiết đều có đủ. */
type CartProduct = Pick<Product, 'id' | 'name' | 'sku' | 'thumbnail' | 'categoryName'>;

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct, selectedSize: ProductSizeOption, quantity?: number) => void;
  /** Thêm nhiều món một lần (mua lại đơn cũ): gộp với món cùng size đã có trong giỏ. */
  addItems: (items: CartItem[]) => void;
  removeFromCart: (productId: string, selectedSize: string) => void;
  updateQuantity: (productId: string, selectedSize: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  cartBounceTrigger: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'tpetie_cart_v1';
/** Máy chủ nhận tối đa 99 cho mỗi món; vượt quá thì cả giỏ bị từ chối. */
export const MAX_ITEM_QUANTITY = 99;

const isCartItem = (value: unknown): value is CartItem => {
  const item = value as CartItem;
  return Boolean(item) && typeof item.productId === 'string' && typeof item.selectedSize === 'string'
    && typeof item.productName === 'string' && Number.isInteger(item.quantity) && item.quantity > 0
    && typeof item.price === 'number';
};

/**
 * Giỏ đã lưu, bỏ dòng hỏng: dữ liệu localStorage có thể bị sửa tay hay từ phiên bản cũ; một giá trị không phải
 * mảng trước đây làm sập cả trang (items.reduce trong layout).
 */
function readStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem).map((item) => ({ ...item, quantity: Math.min(item.quantity, MAX_ITEM_QUANTITY) })) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [cartBounceTrigger, setCartBounceTrigger] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      setItems(readStoredCart(localStorage.getItem(STORAGE_KEY)));
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
    }
    setIsHydrated(true);
    // Đồng bộ giữa các tab: thêm món ở tab này thì tab kia không ghi đè giỏ bằng bản cũ của nó.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(readStoredCart(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }, [items, isHydrated]);

  const addToCart = (product: CartProduct, selectedSize: ProductSizeOption, quantity = 1) => {
    const formattedSize = cartSizeLabel(selectedSize.size, selectedSize.weightRange);
    // Không cho giỏ vượt tồn kho đang thấy (và tối đa 99): vượt thì báo giá cả giỏ bị từ chối, khách không thanh toán được.
    const cap = Math.min(MAX_ITEM_QUANTITY, selectedSize.stock > 0 ? selectedSize.stock : MAX_ITEM_QUANTITY);
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (i) => i.productId === product.id && i.selectedSize === formattedSize
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(cap, updated[existingIndex].quantity + quantity),
        };
        return updated;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          thumbnail: product.thumbnail,
          category: product.categoryName,
          selectedSize: formattedSize,
          price: selectedSize.price,
          quantity: Math.min(cap, quantity),
        };
        return [...prevItems, newItem];
      }
    });

    // Kích hoạt animation nảy icon giỏ hàng & mở slide-in mini-cart
    setCartBounceTrigger((prev) => prev + 1);
    setIsMiniCartOpen(true);

    // Gửi sự kiện tracking GA4 / GTM / Clarity
    trackAddToCart({
      id: product.id,
      name: product.name,
      size: selectedSize.size,
      price: selectedSize.price,
      quantity,
    });
  };

  const addItems = (additions: CartItem[]) => {
    if (additions.length === 0) return;
    setItems((prevItems) => additions.reduce((next, addition) => {
      const index = next.findIndex((item) => item.productId === addition.productId && item.selectedSize === addition.selectedSize);
      if (index === -1) return [...next, addition];
      const updated = [...next];
      updated[index] = { ...updated[index], price: addition.price, quantity: Math.min(MAX_ITEM_QUANTITY, updated[index].quantity + addition.quantity) };
      return updated;
    }, prevItems));
    setCartBounceTrigger((prev) => prev + 1);
  };

  const removeFromCart = (productId: string, selectedSize: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.selectedSize === selectedSize)));
  };

  const updateQuantity = (productId: string, selectedSize: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.selectedSize === selectedSize) {
            const newQty = Math.min(MAX_ITEM_QUANTITY, item.quantity + delta);
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addItems,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isMiniCartOpen,
        openMiniCart: () => setIsMiniCartOpen(true),
        closeMiniCart: () => setIsMiniCartOpen(false),
        cartBounceTrigger,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
