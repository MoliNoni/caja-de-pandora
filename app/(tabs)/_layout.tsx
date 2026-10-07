// Tab Layout Component
// Bottom tab navigation setup
// Three tabs: Home, Books, Vinyl
// Custom styling with haptic feedback

import { Tabs } from 'expo-router';
import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/icon-symbol';
import { useTheme } from '../../hooks/use-theme';
import { Fonts } from '../../constants/theme';

// Tab navigation layout
export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.inkMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        // Floating pill bar: rounded, lifted, the active tab sits in a tinted capsule.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          height: 68,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 8,
          borderRadius: 32,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          elevation: 12,
          boxShadow: '0 14px 40px rgba(26,16,51,0.22), 0 2px 8px rgba(26,16,51,0.10)',
        },
        tabBarItemStyle: { borderRadius: 24, marginHorizontal: 4, paddingVertical: 4 },
        // Wide screens default to beside-icon, which truncates the label.
        tabBarLabelPosition: 'below-icon',
        tabBarActiveBackgroundColor: `${theme.accent}1F`,
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '700',
          fontFamily: Fonts.serif,
          letterSpacing: 0.2,
        },
        // Lists pad their own bottom (paddingBottom: 92) so content scrolls behind the bar.
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Libros',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="book.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vinyl"
        options={{
          title: 'Vinilos',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="music.note" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
