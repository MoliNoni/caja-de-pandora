// Root Layout Component
// Main app structure and navigation
// Provides auth and cart contexts
// Sets up stack navigation

import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth-context';
import { CartProvider } from '../lib/cart-context';

// Main app layout with providers
export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
