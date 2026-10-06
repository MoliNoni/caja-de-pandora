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
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { useAuth } from '../lib/auth-context';
import { showAlert } from '../lib/dialog';
import { useRouter } from 'expo-router';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>LibreriaShop</Text>
        <Text style={styles.title}>Iniciar sesion</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={theme.inkMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {errors.email && (
            <Text style={styles.error}>{errors.email}</Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu contrasena"
            placeholderTextColor={theme.inkMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
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
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: t.ink,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: t.inkMuted,
  },
  form: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
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
    borderColor: t.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
