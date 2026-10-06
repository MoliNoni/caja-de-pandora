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
import { useAuth } from '../lib/auth-context';
import { getClienteOrdenes } from '../lib/database';
import { useRouter } from 'expo-router';
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { ProfileMenu } from '../components/profile-menu';
import { Skeleton, SkeletonRegion } from '../components/skeleton';
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

// Orders screen component
export default function OrdersScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user's orders from database
  const loadOrdenes = useCallback(async () => {
    try {
      if (!user) return;
      const data = await getClienteOrdenes(user.id);
      const normalizedOrdenes = (data as OrdenRaw[]).map((orden) => ({
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

      setOrdenes(normalizedOrdenes);
    } catch (error) {
      console.error('Error loading ordenes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadOrdenes();
    } else {
      setLoading(false);
    }
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

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
      <PatternBackground />
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle} accessibilityRole="header">Necesitas iniciar sesion</Text>
          <Text style={styles.emptySubtitle}>Para ver tus ordenes</Text>
          <Button label="Iniciar sesion" onPress={() => router.push('/signin')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title} accessibilityRole="header">Mis ordenes</Text>
            <Text style={styles.subtitle}>
              Total: {ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}
            </Text>
          </View>
          <ProfileMenu />
        </View>
      </View>

      {loading ? (
        <SkeletonRegion style={styles.listContent}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={170} radius={12} style={styles.skeletonCard} />
          ))}
        </SkeletonRegion>
      ) : ordenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle} accessibilityRole="header">No tienes ordenes</Text>
          <Text style={styles.emptySubtitle}>
            Realiza tu primera compra en el catalogo
          </Text>
          <Button label="Ir al catalogo" onPress={() => router.push('/explore')} />
        </View>
      ) : (
        <FlatList
          data={ordenes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.ordenCard}>
              {/* Header orden */}
              <View style={styles.ordenHeader}>
                <View>
                  <Text style={styles.ordenId}>Orden #{item.id.slice(0, 8)}</Text>
                  <Text style={styles.ordenFecha}>
                    {new Date(item.fechaCreacion).toLocaleDateString('es-ES')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.estadoBadge,
                    { backgroundColor: getEstadoBadgeColor(item.estado) },
                  ]}
                >
                  <Text style={styles.estadoText}>
                    {getEstadoLabel(item.estado)}
                  </Text>
                </View>
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
                <Text style={styles.totalLabel}>Total de Orden:</Text>
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
      )}
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  skeletonCard: {
    marginHorizontal: 8,
    marginVertical: 8,
  },
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  subtitle: {
    fontSize: 12,
    color: t.inkMuted,
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  ordenId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.ink,
  },
  ordenFecha: {
    fontSize: 12,
    color: t.inkMuted,
    marginTop: 4,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  estadoText: {
    color: t.onAccent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: t.ink,
  },
  itemAutor: {
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: 'bold',
    color: t.accent,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: t.accent,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.accent,
  },
});
