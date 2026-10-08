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
  const { items, total, removeItem, updateQuantity, clearCart, itemCount } =
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
        >
          <Ionicons name="arrow-back" size={24} color={theme.ink} />
        </TouchableOpacity>
        <DancingText text="Tu carrito" style={styles.title} containerStyle={styles.titleRow} colors={theme.gradients.warm} />
        <Text style={styles.itemCount}>{itemCount} items</Text>
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

          <View style={styles.divider} />

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
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

            {onClose && (
              <Button label="Cerrar" variant="outline" size="lg" fullWidth disabled={loading} onPress={onClose} />
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  titleRow: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    letterSpacing: -0.8,
  },
  itemCount: {
    fontSize: 14,
    color: t.inkMuted,
    backgroundColor: t.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  listContent: {
    padding: 8,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 4,
    backgroundColor: t.surface,
    borderRadius: 8,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: 6,
    marginRight: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: t.ink,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: t.accent,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.bg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: t.border,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.accent,
  },
  quantity: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
    color: t.ink,
  },
  itemRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: t.ink,
    marginBottom: 8,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: t.accent,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: t.border,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: t.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: t.ink,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: t.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: t.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
});
