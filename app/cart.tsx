// Cart Screen Component
// Shows shopping cart with checkout
// Handles payment processing
// Checks user authentication
// Processes orders

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { successHaptic } from '../lib/haptics';
import { useRouter } from 'expo-router';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';
import { procesarCompra, PurchaseReceipt } from '../lib/database';
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { CartDrawer } from '../components/cart-drawer';
import { ClickSpark } from '../components/click-spark';
import { Confetti } from '../components/confetti';
import { showAlert, showConfirm } from '../lib/dialog';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

const money = (n: number) => `$${n.toFixed(2)}`;
/** Short, human order number (the full id stays server-side). */
const orderNumber = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

// Cart screen component
export default function CartScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null);

  const closeReceipt = () => {
    setPurchaseReceipt(null);
    router.push('/');
  };

  // Handle checkout process
  const processCheckout = async () => {
    if (!user) {
      showAlert('Inicia sesión', 'Necesitas estar autenticado para comprar');
      router.push('/signin');
      return;
    }

    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    try {
      setLoading(true);

      const receipt = await procesarCompra(items, user.email);
      setPurchaseReceipt(receipt);
      successHaptic();
      clearCart();
    } catch (error) {
      console.error('Error processing order:', error);
      showAlert('Error', 'No se pudo procesar tu compra. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (loading) {
      return;
    }

    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    showConfirm(
      'Confirmar compra',
      `Vas a comprar ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'} por un total de ${money(total)}. ¿Deseas continuar?`,
      () => {
        void processCheckout();
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      <CartDrawer onCheckout={handleCheckout} onClose={() => router.back()} loading={loading} />
      {loading && (
        <View style={styles.loadingOverlay} accessibilityLiveRegion="polite">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingText}>Procesando tu compra...</Text>
          </View>
        </View>
      )}
      {/* A Modal traps focus and maps Escape / Android back to onRequestClose (WCAG 2.4.3). */}
      <Modal visible={purchaseReceipt !== null} transparent animationType="fade" onRequestClose={closeReceipt}>
        {purchaseReceipt && (
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptBackdrop} />
          <View
            style={styles.receiptCard}
            role="dialog"
            aria-modal
            aria-label="Detalle de compra"
            accessibilityViewIsModal
          >
            <ScrollView
              style={styles.receiptScroll}
              contentContainerStyle={styles.receiptContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.eyebrowRow}>
                <Text style={styles.receiptEyebrow}>Compra confirmada</Text>
                <View style={styles.sparkAnchor}>
                  <ClickSpark play={!!purchaseReceipt} />
                </View>
              </View>
              <Text style={styles.receiptTitle} accessibilityRole="header">Gracias por tu compra</Text>
              <Text style={styles.receiptMessage}>
                Pedido N.º {orderNumber(purchaseReceipt.encabezado.id)} ·{' '}
                {new Date(purchaseReceipt.encabezado.fecha).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
              </Text>

              <View style={styles.receiptSection}>
                {purchaseReceipt.detalles.map((detalle) => (
                  <View key={detalle.id} style={styles.lineRow}>
                    <View style={styles.lineInfo}>
                      <Text style={styles.lineTitle} numberOfLines={2}>{detalle.titulo}</Text>
                      <Text style={styles.lineMeta}>
                        {detalle.cantidad} × {money(detalle.valor)}
                      </Text>
                    </View>
                    <Text style={styles.lineAmount}>{money(detalle.subtotal)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Subtotal</Text>
                  <Text style={styles.sumValue}>{money(purchaseReceipt.encabezado.subtotal)}</Text>
                </View>
                {purchaseReceipt.encabezado.descuentoTotal > 0 ? (
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Descuento</Text>
                    <Text style={styles.sumValue}>−{money(purchaseReceipt.encabezado.descuentoTotal)}</Text>
                  </View>
                ) : null}
                <View style={styles.sumRow}>
                  <Text style={styles.totalLabel}>Total pagado</Text>
                  <Text style={styles.totalValue}>{money(purchaseReceipt.encabezado.total)}</Text>
                </View>
              </View>

              {purchaseReceipt.emailStatus ? (
                <Text style={styles.receiptNotice}>{purchaseReceipt.emailStatus}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.receiptActions}>
              <Button
                label="Ver mis pedidos"
                variant="outline"
                onPress={() => {
                  setPurchaseReceipt(null);
                  router.push('/orders');
                }}
              />
              <Button
                label="Seguir comprando"
                onPress={closeReceipt}
              />
            </View>
          </View>
        </View>
        )}
        <Confetti play={purchaseReceipt !== null} />
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: t.surface,
    borderRadius: 2,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: t.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  receiptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 16,
  },
  receiptBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.scrim,
  },
  receiptCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    backgroundColor: t.surface,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.inkMuted,
    overflow: 'hidden',
    boxShadow: '0px 24px 60px rgba(0, 0, 0, 0.35)',
    elevation: 16,
  },
  receiptScroll: {
    flexGrow: 0,
  },
  receiptContent: {
    padding: 24,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkAnchor: {
    width: 0,
    height: 0,
    marginLeft: 24,
  },
  receiptEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: t.accent,
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
    marginBottom: 8,
  },
  receiptMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: t.inkMuted,
    marginBottom: 12,
  },
  receiptNotice: {
    fontSize: 13,
    lineHeight: 19,
    color: t.inkMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  receiptSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.inkMuted,
    paddingTop: 16,
    marginBottom: 16,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  lineInfo: { flex: 1 },
  lineTitle: { fontSize: 16, fontFamily: Fonts.serif, color: t.ink },
  lineMeta: { fontSize: 13, color: t.inkMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  lineAmount: { fontSize: 15, fontFamily: Fonts.serif, color: t.ink, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.inkMuted, marginVertical: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sumLabel: { fontSize: 14, color: t.inkMuted },
  sumValue: { fontSize: 14, color: t.ink, fontVariant: ['tabular-nums'] },
  totalLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.ink, alignSelf: 'center' },
  totalValue: { fontSize: 22, fontFamily: Fonts.serif, color: t.accent, fontVariant: ['tabular-nums'] },
  // Stacked: the tracked uppercase labels don't fit side by side within the card's 460px.
  receiptActions: {
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.inkMuted,
    backgroundColor: t.surface,
  },
});
