import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, type Theme } from '../constants/theme';
import { useThemedStyles } from '../hooks/use-theme';
import { closeConfirm, dismissToast, subscribeDialogs, type DialogState } from '../lib/dialog';
import { Button } from './button';

const TOAST_MS = 4500;

/** Renders the app's alerts (toast at the top) and confirms (modal). Mount once in the root layout. */
export function DialogHost() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [{ toast, confirm }, setState] = useState<DialogState>({ toast: null, confirm: null });
  useEffect(() => subscribeDialogs(setState), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const answer = (ok: boolean) => {
    if (!confirm) return;
    closeConfirm();
    (ok ? confirm.onConfirm : confirm.onCancel)?.();
  };

  return (
    <>
      {toast ? (
        <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + Spacing.sm }]}>
          <Animated.View key={toast.id} entering={FadeInUp.springify()} exiting={FadeOutUp} style={styles.toast}>
            <Pressable
              onPress={() => dismissToast(toast.id)}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityHint="Toca para cerrar"
            >
              <Text style={styles.toastTitle}>{toast.title}</Text>
              {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => answer(false)}>
        <Pressable style={styles.scrim} onPress={() => answer(false)} accessibilityLabel="Cancelar">
          <Pressable style={styles.card} accessibilityViewIsModal onPress={() => undefined}>
            <Text style={styles.cardTitle} accessibilityRole="header">{confirm?.title}</Text>
            <Text style={styles.cardMessage}>{confirm?.message}</Text>
            <View style={styles.actions}>
              <Button label="Cancelar" variant="ghost" onPress={() => answer(false)} />
              <Button label={confirm?.confirmText ?? 'Confirmar'} onPress={() => answer(true)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    toastLayer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.lg, zIndex: 1000 },
    toast: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderLeftColor: t.accent,
      borderRadius: 14,
      padding: Spacing.md,
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
    },
    toastTitle: { color: t.ink, fontWeight: '800', fontSize: 15 },
    toastMessage: { color: t.inkMuted, fontSize: 14, marginTop: 2 },
    scrim: { flex: 1, backgroundColor: t.scrim, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
    card: { width: '100%', maxWidth: 400, backgroundColor: t.surface, borderRadius: 20, padding: Spacing.xl, gap: Spacing.sm },
    cardTitle: { color: t.ink, fontWeight: '800', fontSize: 18 },
    cardMessage: { color: t.inkMuted, fontSize: 15, lineHeight: 21 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  });
