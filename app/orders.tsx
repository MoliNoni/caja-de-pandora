// Orders Screen Component
// Shows user's order history
// Displays order details and status
// Handles authentication checks
// Pull-to-refresh functionality

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../lib/auth-context';
import { getCachedClienteOrdenes, getClienteOrdenes } from '../lib/database';
import { useRouter } from 'expo-router';
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { AppHeader } from '../components/app-header';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

interface OrdenDetalleRaw {
  id?: string;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
  producto?: {
    titulo?: string;
    autor?: string;
  } | null;
}

interface OrdenRaw {
  id: string;
  estado: string;
  total?: number;
  fecha_creacion?: string;
  detalles?: OrdenDetalleRaw[];
}

interface Orden {
  id: string;
  estado: string;
  total: number;
  fechaCreacion: string;
  detalles: {
    cantidad: number;
    precioUnitario: number;
    producto: {
      titulo: string;
      autor: string;
    };
  }[];
}

const normalize = (data: unknown[]): Orden[] =>
  (data as OrdenRaw[]).map((orden) => ({
    id: orden.id,
    estado: orden.estado,
    total: Number(orden.total || 0),
    fechaCreacion: orden.fecha_creacion || new Date().toISOString(),
    detalles: (orden.detalles || []).map((detalle) => ({
      cantidad: Number(detalle.cantidad || 0),
      precioUnitario: Number(detalle.precio_unitario || 0),
      producto: {
        titulo: detalle.producto?.titulo || 'Producto sin titulo',
        autor: detalle.producto?.autor || 'Autor no disponible',
      },
    })),
  }));

// Orders screen component
export default function OrdersScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // No loading state: the list is usually prefetched (profile menu, checkout); otherwise the
  // page shows its title alone and the list fades in. null = not loaded yet.
  const [ordenes, setOrdenes] = useState<Orden[] | null>(() => {
    const cached = user ? getCachedClienteOrdenes(user.id) : undefined;
    return cached ? normalize(cached) : null;
  });
  const [wasCached] = useState(ordenes !== null);
  const [refreshing, setRefreshing] = useState(false);

  // Load user's orders from database
  const loadOrdenes = useCallback(async () => {
    try {
      if (!user) return;
      setOrdenes(normalize(await getClienteOrdenes(user.id)));
    } catch (error) {
      console.error('Error loading ordenes:', error);
      setOrdenes((current) => current ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadOrdenes();
  }, [user, loadOrdenes]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadOrdenes();
  };

  // Get color for order status badge
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return theme.success;
      case 'pendiente':
        return theme.accent;
      case 'cancelada':
        return theme.danger;
      default:
        return theme.inkMuted;
    }
  };

  // Get display label for order status
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'pendiente':
        return 'Pendiente';
      case 'cancelada':
        return 'Cancelada';
      default:
        return estado;
    }
  };

  if (!user && !authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <PatternBackground />
        <AppHeader back actions={false} />
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle} accessibilityRole="header">Inicia sesión</Text>
          <Text style={styles.emptySubtitle}>para ver tus pedidos</Text>
          <Button label="Iniciar sesión" onPress={() => router.push('/signin')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      {/* Own header (not the stack's): its back arrow survives a reload with no history. */}
      <AppHeader back />
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Mis pedidos</Text>
      </View>

      {ordenes === null ? null : ordenes.length === 0 ? (
        <Animated.View entering={wasCached ? undefined : FadeIn.duration(220)} style={styles.emptyContainer}>
          <Text style={styles.emptyTitle} accessibilityRole="header">Aún no tienes pedidos</Text>
          <Text style={styles.emptySubtitle}>
            Tu primera compra aparecerá aquí
          </Text>
          <Button label="Ir al catálogo" onPress={() => router.push('/explore')} />
        </Animated.View>
      ) : (
        <Animated.View entering={wasCached ? undefined : FadeIn.duration(220)} style={styles.listWrap}>
          <FlatList
            data={ordenes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.ordenCard}>
                {/* Header orden */}
                <View style={styles.ordenHeader}>
                  <View>
                    <Text style={styles.ordenId}>Pedido N.º {item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.ordenFecha}>
                      {new Date(item.fechaCreacion).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <Text style={[styles.estadoText, { color: getEstadoBadgeColor(item.estado) }]}>
                    {getEstadoLabel(item.estado)}
                  </Text>
                </View>

                {/* Items */}
                <View style={styles.itemsContainer}>
                  {item.detalles.map((detalle, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {detalle.producto.titulo}
                        </Text>
                        <Text style={styles.itemAutor}>
                          {detalle.producto.autor}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemCantidad}>
                          x{detalle.cantidad}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ${detalle.precioUnitario.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>
                    ${item.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.accent]}
                tintColor={theme.accent}
              />
            }
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  listWrap: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: t.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  listContent: {
    padding: 8,
  },
  ordenCard: {
    marginHorizontal: 8,
    marginVertical: 8,
    backgroundColor: t.surface,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.inkMuted,
    padding: 16,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.inkMuted,
  },
  ordenId: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.ink },
  ordenFecha: {
    fontSize: 13,
    color: t.inkMuted,
    marginTop: 4,
  },
  estadoText: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase' },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  itemAutor: {
    fontSize: 13,
    color: t.inkMuted,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemCantidad: {
    fontSize: 12,
    color: t.inkMuted,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.inkMuted },
  totalAmount: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: t.accent,
  },
});
