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
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';
import { procesarCompra, PurchaseReceipt } from '../lib/database';
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { CartDrawer } from '../components/cart-drawer';
import { ClickSpark } from '../components/click-spark';
import { showAlert, showConfirm } from '../lib/dialog';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

// Cart screen component
export default function CartScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null);

  // Handle checkout process
  const processCheckout = async () => {
    if (!user) {
      showAlert('Inicia sesion', 'Necesitas estar autenticado para comprar');
      router.push('/signin');
      return;
    }

    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    try {
      setLoading(true);

      const receipt = await procesarCompra(user.id, items, total, user.email);
      setPurchaseReceipt(receipt);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

    if (Platform.OS === 'web') {
      setShowCheckoutConfirm(true);
      return;
    }

    showConfirm(
      'Confirmar compra',
      `Vas a comprar ${itemCount} producto(s) por un total de $${total.toFixed(2)}. Deseas continuar?`,
      () => {
        void processCheckout();
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      <CartDrawer onCheckout={handleCheckout} onClose={() => router.back()} loading={loading} />
      {showCheckoutConfirm && (
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={styles.confirmBackdrop}
            onPress={() => setShowCheckoutConfirm(false)}
            activeOpacity={1}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEyebrow}>Confirmacion</Text>
            <Text style={styles.confirmTitle}>Revisa tu compra</Text>
            <Text style={styles.confirmMessage}>
              Vas a comprar {itemCount} producto(s) por un total de $
              {total.toFixed(2)}.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                label="Cancelar"
                variant="outline"
                style={styles.confirmButton}
                onPress={() => setShowCheckoutConfirm(false)}
              />
              <Button
                label="Confirmar pago"
                style={styles.confirmButton}
                onPress={() => {
                  setShowCheckoutConfirm(false);
                  void processCheckout();
                }}
              />
            </View>
          </View>
        </View>
      )}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingText}>Procesando tu compra...</Text>
          </View>
        </View>
      )}
      {purchaseReceipt && (
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptBackdrop} />
          <View style={styles.receiptCard}>
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
              <Text style={styles.receiptTitle}>Detalle de compra</Text>
              <Text style={styles.receiptMessage}>
                Tu pedido fue registrado correctamente. Aqui tienes el resumen.
              </Text>
              {purchaseReceipt?.emailStatus ? (
                <Text style={styles.receiptNotice}>{purchaseReceipt.emailStatus}</Text>
              ) : null}

              <View style={styles.receiptSection}>
                <Text style={styles.sectionTitle}>Encabezado</Text>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Id</Text>
                  <Text style={styles.dataValue}>{purchaseReceipt.encabezado.id}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Id cliente</Text>
                  <Text style={styles.dataValue}>
                    {purchaseReceipt.encabezado.idCliente}
                  </Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Fecha</Text>
                  <Text style={styles.dataValue}>
                    {new Date(purchaseReceipt.encabezado.fecha).toLocaleString('es-CO')}
                  </Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Subtotal</Text>
                  <Text style={styles.dataValue}>
                    ${purchaseReceipt.encabezado.subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Descuento total</Text>
                  <Text style={styles.dataValue}>
                    ${purchaseReceipt.encabezado.descuentoTotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    ${purchaseReceipt.encabezado.total.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.sectionTitle}>Detalle compra</Text>
                {purchaseReceipt.detalles.map((detalle) => (
                  <View key={detalle.id} style={styles.detailCard}>
                    <Text style={styles.detailTitle}>{detalle.titulo}</Text>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Id</Text>
                      <Text style={styles.dataValue}>{detalle.id}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Id encabezado</Text>
                      <Text style={styles.dataValue}>{detalle.idEncabezado}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Id producto</Text>
                      <Text style={styles.dataValue}>{detalle.idProducto}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Cantidad</Text>
                      <Text style={styles.dataValue}>{detalle.cantidad}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Valor</Text>
                      <Text style={styles.dataValue}>${detalle.valor.toFixed(2)}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Descuento</Text>
                      <Text style={styles.dataValue}>
                        ${detalle.descuento.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>
                        ${detalle.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.receiptActions}>
              <Button
                label="Ver mis ordenes"
                variant="outline"
                style={styles.receiptButton}
                onPress={() => {
                  setPurchaseReceipt(null);
                  router.push('/orders');
                }}
              />
              <Button
                label="Seguir comprando"
                style={styles.receiptButton}
                onPress={() => {
                  setPurchaseReceipt(null);
                  router.push('/');
                }}
              />
            </View>
          </View>
        </View>
      )}
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
    padding: 20,
  },
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.scrim,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: t.border,
    boxShadow: '0px 18px 40px rgba(15, 23, 42, 0.18)',
    elevation: 12,
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.inkMuted,
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: t.ink,
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: t.inkMuted,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmButton: {
    minWidth: 120,
  },
  loadingCard: {
    backgroundColor: t.surface,
    borderRadius: 16,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    boxShadow: '0px 24px 60px rgba(15, 23, 42, 0.22)',
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.accent,
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: '800',
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
    lineHeight: 20,
    color: t.success,
    backgroundColor: t.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.success,
    marginBottom: 16,
  },
  receiptSection: {
    backgroundColor: t.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: t.accent,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  dataLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: t.inkMuted,
  },
  dataValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: t.ink,
    textAlign: 'right',
  },
  totalValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: t.accent,
    textAlign: 'right',
  },
  detailCard: {
    backgroundColor: t.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: t.ink,
    marginBottom: 10,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.surface,
  },
  receiptButton: {
    flex: 1,
  },
});
