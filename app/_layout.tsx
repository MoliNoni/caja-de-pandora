// Root Layout Component
// Main app structure and navigation
// Provides auth and cart contexts
// Sets up stack navigation

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { prefetchScreens } from '../lib/database';
import { AuthProvider } from '../lib/auth-context';
import { CartProvider } from '../lib/cart-context';
import { PlayerProvider } from '../lib/player-context';
import { useTheme } from '../hooks/use-theme';
import { Fonts } from '../constants/theme';
import { MiniPlayer } from '../components/mini-player';
import { PixelBurstProvider } from '../components/pixel-burst';
import { FlyToCartProvider } from '../components/fly-to-cart';

// Main app layout with providers
export default function RootLayout() {
  const theme = useTheme();
  useEffect(() => {
    prefetchScreens().catch(() => undefined); // best effort: screens still load on their own
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <CartProvider>
        <PlayerProvider>
          <PixelBurstProvider>
          <FlyToCartProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.bg },
              headerStyle: { backgroundColor: theme.bg },
              headerShadowVisible: false,
              headerTintColor: theme.ink,
              headerTitleStyle: { fontFamily: Fonts.serif, fontWeight: '800' },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="product/[id]" options={{ title: '' }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="orders" options={{ title: 'Mis pedidos' }} />
          </Stack>
          <MiniPlayer />
          </FlyToCartProvider>
          </PixelBurstProvider>
        </PlayerProvider>
      </CartProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
