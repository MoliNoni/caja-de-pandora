import { Alert, Platform } from 'react-native';

export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    globalThis.alert?.(text);
    return;
  }

  Alert.alert(title, message);
};

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (Platform.OS === 'web') {
    const confirmed = globalThis.confirm?.(`${title}\n\n${message}`) ?? false;

    if (confirmed) {
      onConfirm();
    } else {
      onCancel?.();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel', onPress: onCancel },
    { text: 'Confirmar', onPress: onConfirm },
  ]);
};

export const showDestructiveConfirm = (
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (Platform.OS === 'web') {
    const confirmed = globalThis.confirm?.(`${title}\n\n${message}`) ?? false;

    if (confirmed) {
      onConfirm();
    } else {
      onCancel?.();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel', onPress: onCancel },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};
