// Tab Layout Component
// Bottom tab navigation setup
// Three tabs: Home, Books, Vinyl
// Custom styling with haptic feedback

import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { HapticTab } from '../../components/haptic-tab';
import { TabIcon } from '../../components/tab-icon';
import { useTheme } from '../../hooks/use-theme';

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
        // Floating pill bar: rounded and lifted; the active tab is marked by its animated icon colours.
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
          borderColor: theme.glassBorder,
          backgroundColor: theme.glass,
          elevation: 12,
          boxShadow: theme.glassShadow,
          // Frosted bar (web): content blurs as it scrolls underneath.
          ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px) saturate(140%)' } as object) : null),
        },
        tabBarItemStyle: { borderRadius: 24, marginHorizontal: 4 },
        // Wide screens default to beside-icon, which truncates the label.
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '600',
          letterSpacing: 0.4,
        },
        // Lists pad their own bottom (paddingBottom: 92) so content scrolls behind the bar.
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Libros',
          tabBarIcon: ({ color, focused }) => <TabIcon name="book" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vinyl"
        options={{
          title: 'Vinilos',
          tabBarIcon: ({ color, focused }) => <TabIcon name="musical-notes" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
