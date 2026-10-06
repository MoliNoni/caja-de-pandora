import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from './database';
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
  total: number;
  addItem: (product: Product, quantity: number) => Promise<void>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

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

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, cantidad: Math.min(Math.max(0, quantity), item.stock) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};
