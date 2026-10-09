// Sign In Screen Component
// User authentication screen
// Email and password login
// Form validation and error handling
// Redirects to home after login

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DancingText } from '../components/dancing-text';
import { AppHeader } from '../components/app-header';
import { Button } from '../components/button';
import { TextField } from '../components/text-field';
import { PatternBackground } from '../components/pattern-background';
import { useAuth } from '../lib/auth-context';
import { showAlert } from '../lib/dialog';
import { useRouter } from 'expo-router';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

// Sign in screen component
export default function SignInScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { signIn, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate email and password
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'La contraseña es requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  // Handle sign in process
  const handleSignIn = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Pequeno delay para evitar race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      await signIn(email, password);
    } catch (error: any) {
      const message = error.message || 'No se pudo iniciar sesión';
      
      if (message.includes('429') || message.includes('Too Many Requests')) {
        showAlert('Demasiadas peticiones', 'Espera un momento antes de intentar de nuevo.');
      } else if (error?.code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
        showAlert('No pudimos iniciar sesión', 'El correo o la contraseña no son correctos.');
      } else if (error?.code === 'email_not_confirmed') {
        showAlert('Confirma tu correo', 'Revisa tu bandeja de entrada y abre el enlace de confirmación.');
      } else {
        showAlert('Error de autenticación', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      <AppHeader back actions={false} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>Tu cuenta</Text>
        <DancingText text="Hola de nuevo" style={styles.title} colors={theme.gradients.warm} />
      </View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(450).springify().damping(14)} style={styles.form}>
        <TextField
          label="Email"
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!loading}
          error={errors.email}
        />
        <TextField
          label="Contraseña"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          editable={!loading}
          error={errors.password}
          onSubmitEditing={handleSignIn}
        />

        {/* Sign In Button */}
        <Button
          label="Iniciar sesión"
          fullWidth
          loading={loading || isSubmitting}
          onPress={handleSignIn}
          style={styles.submit}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>¿No tienes cuenta?</Text>
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            accessibilityRole="link"
            accessibilityLabel="Crear cuenta"
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          >
            <Text style={styles.signUpLink}>Crea una ahora</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Button */}
        <Button
          label="Continuar como invitado"
          variant="outline"
          fullWidth
          onPress={() => router.push('/')}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  kicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.accent, marginBottom: 12 },
  title: {
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.5,
    fontWeight: '500',
    fontFamily: Fonts.serif,
  },
  form: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.inkMuted,
    maxWidth: 440,
  },
  submit: {
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.inkMuted,
    opacity: 0.5,
    marginVertical: 24,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  signUpText: {
    color: t.inkMuted,
    fontSize: 14,
    marginRight: 6,
  },
  signUpLink: {
    color: t.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
