// Cart Drawer Component
// Shows shopping cart in a slide-out drawer
// Displays cart items with quantity controls
// Handles cart management and checkout

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RollingNumber } from './rolling-number';
import Animated, { FadeInRight, FadeOutLeft, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { DancingText } from './dancing-text';
import { useBurst } from './pixel-burst';
import { Button } from './button';
import { useCart } from '../lib/cart-context';
import { showAlert, showDestructiveConfirm } from '../lib/dialog';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

const QTY_HIT_SLOP = { top: 10, bottom: 10, left: 6, right: 6 };

interface CartDrawerProps {
  onCheckout?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

// Main cart drawer component
export const CartDrawer = ({ onCheckout, onClose, loading = false }: CartDrawerProps) => {
  const theme = useTheme();
  const burst = useBurst();
  const styles = useThemedStyles(makeStyles);
  const { items, total, discount, removeItem, updateQuantity, clearCart, itemCount } =
    useCart();

  // Handle checkout process
  const handleCheckout = () => {
    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    onCheckout?.();
  };

  // Clear all items from cart
  const handleClearCart = () => {
    showDestructiveConfirm(
      'Vaciar carrito',
      'Estás seguro de que quieres vaciar el carrito?',
      'Vaciar',
      () => clearCart()
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Cerrar carrito"
          accessibilityState={{ disabled: loading }}
          hitSlop={10}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={theme.ink} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.kicker}>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</Text>
        <DancingText text="Tu carrito" style={styles.title} colors={theme.gradients.warm} />
      </View>

      {items.length > 0 ? (
        <>
          <Animated.FlatList
            data={items}
            keyExtractor={(item) => item.id}
            itemLayoutAnimation={LinearTransition.springify().damping(16)}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInRight.delay(Math.min(index, 6) * 70).springify().damping(14)}
                exiting={FadeOutLeft.duration(220)}
                style={styles.cartItem}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>Sin imagen</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.itemPrice}>${item.precio.toFixed(2)}</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      onPress={(e) => {
                        burst(e, theme.gradients.warm, 'sm');
                        if (item.cantidad > 1) updateQuantity(item.id, item.cantidad - 1);
                        else
                          showDestructiveConfirm('Quitar del carrito', `¿Quieres quitar "${item.titulo}" del carrito?`, 'Quitar', () =>
                            removeItem(item.id)
                          );
                      }}
                      disabled={loading}
                      style={styles.quantityButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Disminuir cantidad de ${item.titulo}`}
                      accessibilityState={{ disabled: loading }}
                      hitSlop={QTY_HIT_SLOP}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <RollingNumber text={String(item.cantidad)} style={styles.quantity} />
                    <TouchableOpacity
                      onPress={(e) => {
                        burst(e, theme.gradients.warm, 'sm');
                        updateQuantity(item.id, item.cantidad + 1);
                      }}
                      disabled={loading}
                      style={styles.quantityButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar cantidad de ${item.titulo}`}
                      accessibilityState={{ disabled: loading }}
                      hitSlop={QTY_HIT_SLOP}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <RollingNumber text={`$${(item.precio * item.cantidad).toFixed(2)}`} style={styles.itemSubtotal} />
                  <TouchableOpacity
                    onPress={(e) => {
                      burst(e, theme.gradients.warm, 'sm');
                      removeItem(item.id);
                    }}
                    disabled={loading}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${item.titulo}`}
                    accessibilityState={{ disabled: loading }}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled
          />

          {discount > 0 && (
            <View style={styles.discountRow}>
              <Text style={styles.totalLabel}>Selección de la semana · 10% OFF</Text>
              <RollingNumber text={`−$${discount.toFixed(2)}`} style={styles.discountAmount} />
            </View>
          )}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <RollingNumber text={`$${total.toFixed(2)}`} style={styles.totalAmount} />
          </View>

          <View style={styles.buttonsContainer}>
            <Button
              label="Proceder al Pago"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleCheckout}
            />

            <Button
              label="Vaciar Carrito"
              variant="ghost"
              size="lg"
              fullWidth
              disabled={loading}
              onPress={handleClearCart}
            />

          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Animated.View entering={ZoomIn.springify().damping(8)} aria-hidden>
            <Ionicons name="cart-outline" size={72} color={theme.vivid[5]} />
          </Animated.View>
          <Text style={styles.emptyMessage}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtext}>
            Añade algunos libros o vinilos para comenzar
          </Text>
          {onClose && (
            <Button label="Continuar Comprando" onPress={onClose} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  kicker: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase',
    color: t.accent,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    letterSpacing: -1,
  },
  // Editorial list: rows divided by hairlines, no filled cards.
  listContent: {
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: 2,
    marginRight: 14,
    backgroundColor: t.border,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
    color: t.inkMuted,
    paddingHorizontal: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: t.inkMuted,
    marginBottom: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.inkMuted,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quantityButtonText: {
    fontSize: 14,
    color: t.accent,
  },
  quantity: {
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: '600',
    color: t.ink,
  },
  itemRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  // Rolling amounts stay sans: each digit sits in its own column, which breaks serif spacing.
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '600',
    color: t.ink,
    marginBottom: 10,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: t.inkMuted,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  discountAmount: { fontSize: 14, color: t.ink },
  totalLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase',
    color: t.inkMuted,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: t.accent,
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyMessage: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: t.inkMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
});
