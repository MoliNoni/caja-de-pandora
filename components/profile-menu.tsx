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

export const ProfileMenu = () => {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
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
      >
        <Ionicons
          name={user ? 'person-circle' : 'person-circle-outline'}
          size={24}
          color="#4b0082"
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(event) => event.stopPropagation()}>
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
              onPress={() => {
                setOpen(false);
                router.push('/orders');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="receipt-outline" size={20} color="#4b0082" />
              <Text style={styles.menuItemText}>Mis ordenes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, signingOut && styles.menuItemDisabled]}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.75}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color="#4b0082" />
              ) : (
                <Ionicons name="log-out-outline" size={20} color="#4b0082" />
              )}
              <Text style={styles.menuItemText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  iconButtonActive: {
    backgroundColor: '#f6f0ff',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#1f2937',
  },
  accountEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
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
    color: '#333',
  },
});
