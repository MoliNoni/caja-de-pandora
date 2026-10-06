// Cart Drawer Component
// Shows shopping cart in a slide-out drawer
// Displays cart items with quantity controls
// Handles cart management and checkout

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../lib/cart-context';
import { showAlert, showDestructiveConfirm } from '../lib/dialog';

interface CartDrawerProps {
  onCheckout?: () => void;
  onClose?: () => void;
}

// Main cart drawer component
export const CartDrawer = ({ onCheckout, onClose }: CartDrawerProps) => {
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
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Carrito</Text>
        <Text style={styles.itemCount}>{itemCount} items</Text>
      </View>

      {items.length > 0 ? (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
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
                      onPress={() => updateQuantity(item.id, item.cantidad - 1)}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.cantidad}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.cantidad + 1)}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemSubtotal}>
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled
          />

          <View style={styles.divider} />

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.checkoutButton]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearCart}
            >
              <Text style={styles.clearButtonText}>Vaciar Carrito</Text>
            </TouchableOpacity>

            {onClose && (
              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyMessage}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtext}>
            Añade algunos libros o vinilos para comenzar
          </Text>
          {onClose && (
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Continuar Comprando</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: '#4b0082',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
  },
  quantity: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  itemRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#4b0082',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b0082',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButton: {
    backgroundColor: '#ffd700',
  },
  checkoutButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#4b0082',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#95a5a6',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
});
