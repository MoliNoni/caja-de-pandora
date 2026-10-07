// Root Layout Component
// Main app structure and navigation
// Provides auth and cart contexts
// Sets up stack navigation

import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth-context';
import { CartProvider } from '../lib/cart-context';
import { PlayerProvider } from '../lib/player-context';
import { useTheme } from '../hooks/use-theme';
import { MiniPlayer } from '../components/mini-player';

// Main app layout with providers
export default function RootLayout() {
  const theme = useTheme();
  return (
    <AuthProvider>
      <CartProvider>
        <PlayerProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.bg },
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.ink,
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="product/[id]" options={{ title: '' }} />
            <Stack.Screen name="track/[id]" options={{ title: '' }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
          <MiniPlayer />
        </PlayerProvider>
      </CartProvider>
    </AuthProvider>
  );
}
