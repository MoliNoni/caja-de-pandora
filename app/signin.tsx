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
  TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DancingText } from '../components/dancing-text';
import { AppHeader } from '../components/app-header';
import { Button } from '../components/button';
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
      newErrors.email = 'Email invalido';
    if (!password) newErrors.password = 'La contrasena es requerida';

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
      const message = error.message || 'No se pudo iniciar sesion';
      
      if (message.includes('429') || message.includes('Too Many Requests')) {
        showAlert('Demasiadas peticiones', 'Espera un momento antes de intentar de nuevo.');
      } else if (error?.code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
        showAlert('No pudimos iniciar sesión', 'El correo o la contraseña no son correctos.');
      } else if (error?.code === 'email_not_confirmed') {
        showAlert('Confirma tu correo', 'Revisa tu bandeja de entrada y abre el enlace de confirmación.');
      } else {
        showAlert('Error de autenticacion', message);
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
        <DancingText text="Hola de nuevo" style={styles.title} colors={theme.gradients.warm} />
      </View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(450).springify().damping(14)} style={styles.form}>
        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Email"
            placeholder="tu@email.com"
            placeholderTextColor={theme.inkMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {errors.email && (
            <Text style={styles.error} accessibilityLiveRegion="polite" aria-live="polite">{errors.email}</Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Contrasena"
            placeholder="Tu contrasena"
            placeholderTextColor={theme.inkMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          {errors.password && (
            <Text style={styles.error} accessibilityLiveRegion="polite" aria-live="polite">{errors.password}</Text>
          )}
        </View>

        {/* Sign In Button */}
        <Button
          label="Iniciar sesion"
          fullWidth
          loading={loading || isSubmitting}
          onPress={handleSignIn}
          style={styles.submit}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>No tienes cuenta?</Text>
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
  logo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: t.inkMuted,
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.5,
    fontWeight: '500',
    fontFamily: Fonts.serif,
  },
  form: {
    margin: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    boxShadow: '0px 24px 60px rgba(26,16,51,0.14)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: t.ink,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: t.inkMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.surface,
  },
  error: {
    color: t.danger,
    fontSize: 12,
    marginTop: 4,
  },
  submit: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: 24,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signUpText: {
    color: t.inkMuted,
    fontSize: 14,
    marginRight: 4,
  },
  signUpLink: {
    color: t.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
