import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

export const ProfileMenu = () => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleProfilePress = () => {
    if (!user) {
      router.push('/signin');
      return;
    }

    setOpen((current) => !current);
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      setOpen(false);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.iconButton, open && styles.iconButtonActive]}
        onPress={handleProfilePress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={user ? 'Menú de cuenta' : 'Iniciar sesión'}
        accessibilityState={{ expanded: open }}
        hitSlop={4}
      >
        <Ionicons
          name={user ? 'person-circle' : 'person-circle-outline'}
          size={24}
          color={theme.accent}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
        >
          <Pressable
            style={styles.menu}
            onPress={(event) => event.stopPropagation()}
            accessible={false}
            accessibilityViewIsModal
          >
            <View style={styles.accountBlock}>
              <Text style={styles.accountTitle} numberOfLines={1}>
                {profile?.nombre ? `Hola, ${profile.nombre}` : 'Mi cuenta'}
              </Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              accessibilityRole="link"
              onPress={() => {
                setOpen(false);
                router.push('/orders');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="receipt-outline" size={20} color={theme.accent} />
              <Text style={styles.menuItemText}>Mis ordenes</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={styles.menuItem}
                accessibilityRole="link"
                onPress={() => {
                  setOpen(false);
                  router.push('/admin' as any);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="settings-outline" size={20} color={theme.accent} />
                <Text style={styles.menuItemText}>Administracion</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, signingOut && styles.menuItemDisabled]}
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityState={{ disabled: signingOut, busy: signingOut }}
              activeOpacity={0.75}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons name="log-out-outline" size={20} color={theme.accent} />
              )}
              <Text style={styles.menuItemText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  iconButtonActive: {
    backgroundColor: t.border,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 54,
    paddingRight: 12,
    backgroundColor: 'transparent',
  },
  menu: {
    width: 230,
    backgroundColor: t.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  accountBlock: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accountTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: t.ink,
  },
  accountEmail: {
    fontSize: 12,
    color: t.inkMuted,
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: 6,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.ink,
  },
});
