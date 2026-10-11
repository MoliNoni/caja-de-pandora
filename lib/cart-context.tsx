import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { bundleDiscount, getWeeklyPick, Product, type WeeklyPick } from './database';
import { resolveProductImageUrl } from './product-image';

export interface CartItem {
  id: string;
  titulo: string;
  precio: number;
  cantidad: number;
  imageUrl?: string;
  stock: number;
  category: Product['category'];
  isbn?: string;
  discogs_id?: string;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  /** Weekly pick bundle discount; `place_order` recomputes it. */
  discount: number;
  total: number;
  weeklyPick: WeeklyPick | null;
  addItem: (product: Product, quantity: number) => Promise<void>;
  removeItem: (productId: string) => void;
  /** Undo for a removal: puts the item back where it was. */
  restoreItem: (item: CartItem, index: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

type CartActions = Pick<CartContextType, 'addItem' | 'removeItem' | 'restoreItem' | 'updateQuantity' | 'clearCart'>;

const CartContext = createContext<CartContextType | undefined>(undefined);
// Stable functions only: components that just add or remove (every product card) don't re-render
// on each cart change, which made fast +/- taps lag with a full catalog behind the drawer.
const CartActionsContext = createContext<CartActions | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [weeklyPick, setWeeklyPick] = useState<WeeklyPick | null>(null);
  useEffect(() => {
    getWeeklyPick().then(setWeeklyPick);
  }, []);

  const addItem = useCallback(async (product: Product, quantity: number) => {
    const imageUrl = (await resolveProductImageUrl(product)) ?? product.imageUrl;

    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                cantidad: Math.min(item.cantidad + quantity, item.stock),
              }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            id: product.id,
            titulo: product.titulo,
            precio: product.precio,
            cantidad: Math.min(quantity, product.stock),
            imageUrl: imageUrl ?? undefined,
            stock: product.stock,
            category: product.category,
            isbn: product.isbn,
            discogs_id: product.discogs_id,
          },
        ];
      }
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const restoreItem = useCallback((item: CartItem, index: number) => {
    setItems((prevItems) =>
      prevItems.some((i) => i.id === item.id)
        ? prevItems
        : [...prevItems.slice(0, index), item, ...prevItems.slice(index)]
    );
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, cantidad: Math.min(Math.max(1, quantity), item.stock) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const discount = bundleDiscount(items, weeklyPick);
  const total = subtotal - discount;
  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);

  const actions = useMemo(
    () => ({ addItem, removeItem, restoreItem, updateQuantity, clearCart }),
    [addItem, removeItem, restoreItem, updateQuantity, clearCart]
  );
  const value = useMemo(
    () => ({ items, subtotal, discount, total, weeklyPick, itemCount, ...actions }),
    [items, subtotal, discount, total, weeklyPick, itemCount, actions]
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartContext.Provider value={value}>{children}</CartContext.Provider>
    </CartActionsContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};

/** Cart mutations without subscribing to the cart's contents. */
export const useCartActions = () => {
  const context = useContext(CartActionsContext);
  if (!context) {
    throw new Error('useCartActions debe usarse dentro de CartProvider');
  }
  return context;
};
