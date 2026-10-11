// Root Layout Component
// Main app structure and navigation
// Provides auth and cart contexts
// Sets up stack navigation

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
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
import { DialogHost } from '../components/dialog-host';

// Main app layout with providers
export default function RootLayout() {
  const theme = useTheme();
  useEffect(() => {
    prefetchScreens().catch(() => undefined); // best effort: screens still load on their own
  }, []);
  return (
    // role="main": the whole app is one landmark on web, so axe's "content outside landmarks" no longer fires.
    <GestureHandlerRootView style={{ flex: 1 }} role="main">
    {/* Static rendering injects an empty Helmet <title> ahead of +html's; this one wins. */}
    <Head>
      <title>Caja de Pandora</title>
    </Head>
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
              headerTitleStyle: { fontFamily: Fonts.serif, fontWeight: '500' },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="product/[id]" options={{ title: '', headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="orders" options={{ headerShown: false }} />
          </Stack>
          <MiniPlayer />
          <DialogHost />
          </FlyToCartProvider>
          </PixelBurstProvider>
        </PlayerProvider>
      </CartProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
