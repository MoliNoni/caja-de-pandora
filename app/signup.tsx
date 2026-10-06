// Sign Up Screen Component
// User registration screen
// Form with personal and address info
// Email and password validation
// Creates new user account

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Button } from '../components/button';
import { PatternBackground } from '../components/pattern-background';
import { useAuth } from '../lib/auth-context';
import { showAlert } from '../lib/dialog';
import { useRouter } from 'expo-router';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

// Sign up screen component
export default function SignUpScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { signUp, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate registration form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = 'Email inválido';
    if (formData.password.length < 8)
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle user registration
  const handleSignUp = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Pequeño delay para evitar race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      await signUp(formData.email, formData.password, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        codigoPostal: formData.codigoPostal,
      });

      showAlert('¡Registro exitoso!', 'Tu cuenta ha sido creada. Ahora inicia sesión.');
      router.push('/signin');
    } catch (error: any) {
      const message = error.message || 'No se pudo registrar';

      if (message.includes('429') || message.includes('Too Many Requests')) {
        showAlert('Demasiadas peticiones', 'Espera un momento antes de intentar de nuevo.');
      } else if (error?.code === 'weak_password') {
        showAlert('Contraseña insegura', 'Esa contraseña apareció en filtraciones o es muy débil. Elige otra.');
      } else {
        showAlert('Error', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>📚 LibreríaShop</Text>
          <Text style={styles.title}>Crear Cuenta</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Nombre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={theme.inkMuted}
              value={formData.nombre}
              onChangeText={(text) =>
                setFormData({ ...formData, nombre: text })
              }
              editable={!loading}
            />
            {errors.nombre && (
              <Text style={styles.error}>{errors.nombre}</Text>
            )}
          </View>

          {/* Apellido */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellido *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu apellido"
              placeholderTextColor={theme.inkMuted}
              value={formData.apellido}
              onChangeText={(text) =>
                setFormData({ ...formData, apellido: text })
              }
              editable={!loading}
            />
            {errors.apellido && (
              <Text style={styles.error}>{errors.apellido}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={theme.inkMuted}
              value={formData.email}
              onChangeText={(text) =>
                setFormData({ ...formData, email: text })
              }
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
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={theme.inkMuted}
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
              editable={!loading}
            />
            {errors.password && (
              <Text style={styles.error}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirma tu contraseña"
              placeholderTextColor={theme.inkMuted}
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              secureTextEntry
              editable={!loading}
            />
            {errors.confirmPassword && (
              <Text style={styles.error}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Teléfono */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu teléfono"
              placeholderTextColor={theme.inkMuted}
              value={formData.telefono}
              onChangeText={(text) =>
                setFormData({ ...formData, telefono: text })
              }
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Dirección */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu dirección"
              placeholderTextColor={theme.inkMuted}
              value={formData.direccion}
              onChangeText={(text) =>
                setFormData({ ...formData, direccion: text })
              }
              editable={!loading}
            />
          </View>

          {/* Ciudad */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu ciudad"
              placeholderTextColor={theme.inkMuted}
              value={formData.ciudad}
              onChangeText={(text) =>
                setFormData({ ...formData, ciudad: text })
              }
              editable={!loading}
            />
          </View>

          {/* Código Postal */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código Postal</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu código postal"
              placeholderTextColor={theme.inkMuted}
              value={formData.codigoPostal}
              onChangeText={(text) =>
                setFormData({ ...formData, codigoPostal: text })
              }
              editable={!loading}
            />
          </View>

          {/* Sign Up Button */}
          <Button
            label="Crear Cuenta"
            fullWidth
            loading={loading || isSubmitting}
            onPress={handleSignUp}
            style={styles.submit}
          />

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.push('/signin')}
            >
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingVertical: 24,
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  logo: {
    fontSize: 24,
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
  },
  inputGroup: {
    marginBottom: 16,
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
    paddingVertical: 10,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: t.inkMuted,
    fontSize: 14,
  },
  footerLink: {
    color: t.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
