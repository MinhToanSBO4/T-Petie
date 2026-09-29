'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '@/types/cart';
import { Product, ProductSizeOption } from '@/types/product';
import { trackAddToCart } from '@/lib/analytics/tracker';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, selectedSize: ProductSizeOption, quantity?: number) => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [cartBounceTrigger, setCartBounceTrigger] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
    }
    setIsHydrated(true);
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

  const addToCart = (product: Product, selectedSize: ProductSizeOption, quantity = 1) => {
    const formattedSize = `${selectedSize.size} (${selectedSize.weightRange})`;
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (i) => i.productId === product.id && i.selectedSize === formattedSize
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
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
          quantity,
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

  const removeFromCart = (productId: string, selectedSize: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.selectedSize === selectedSize)));
  };

  const updateQuantity = (productId: string, selectedSize: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.selectedSize === selectedSize) {
            const newQty = item.quantity + delta;
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
