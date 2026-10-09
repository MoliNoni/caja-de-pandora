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
  ScrollView,
  type TextInputProps,
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

type FormKey = 'nombre' | 'apellido' | 'email' | 'password' | 'confirmPassword' | 'telefono' | 'direccion' | 'ciudad' | 'codigoPostal';

const FIELDS: ({ key: FormKey; label: string } & TextInputProps)[] = [
  { key: 'nombre', label: 'Nombre *', placeholder: 'Tu nombre', autoComplete: 'given-name' },
  { key: 'apellido', label: 'Apellido *', placeholder: 'Tu apellido', autoComplete: 'family-name' },
  { key: 'email', label: 'Email *', placeholder: 'tu@email.com', keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' },
  { key: 'password', label: 'Contraseña *', placeholder: 'Mínimo 8 caracteres', secureTextEntry: true, autoComplete: 'new-password' },
  { key: 'confirmPassword', label: 'Confirmar contraseña *', placeholder: 'Repite tu contraseña', secureTextEntry: true, autoComplete: 'new-password' },
  { key: 'telefono', label: 'Teléfono', placeholder: 'Tu teléfono', keyboardType: 'phone-pad', autoComplete: 'tel' },
  { key: 'direccion', label: 'Dirección', placeholder: 'Tu dirección', autoComplete: 'street-address' },
  { key: 'ciudad', label: 'Ciudad', placeholder: 'Tu ciudad' },
  { key: 'codigoPostal', label: 'Código postal', placeholder: 'Tu código postal', autoComplete: 'postal-code' },
];

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

      const signedIn = await signUp(formData.email, formData.password, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        codigoPostal: formData.codigoPostal,
      });

      if (signedIn) {
        showAlert('¡Bienvenido!', 'Tu cuenta fue creada y ya iniciaste sesión.');
        router.replace('/');
      } else {
        showAlert('Confirma tu correo', 'Te enviamos un enlace para activar tu cuenta.');
        router.replace('/signin');
      }
    } catch (error: any) {
      const message = error.message || 'No se pudo registrar';

      if (message.includes('429') || message.includes('Too Many Requests')) {
        showAlert('Demasiadas peticiones', 'Espera un momento antes de intentar de nuevo.');
      } else if (error?.code === 'user_already_exists' || /already registered/i.test(message)) {
        setErrors((prev) => ({ ...prev, email: 'Este correo ya tiene una cuenta. Inicia sesión.' }));
        showAlert('Correo ya registrado', 'Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.');
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
      <AppHeader back actions={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>Tu cuenta</Text>
          <DancingText text="Crea tu cuenta" style={styles.title} colors={theme.gradients.warm} />
        </View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(450).springify().damping(14)} style={styles.form}>
          {FIELDS.map(({ key, label, ...props }) => (
            <TextField
              key={key}
              label={label}
              value={formData[key]}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, [key]: text }))}
              editable={!loading}
              error={errors[key]}
              {...props}
            />
          ))}

          {/* Sign Up Button */}
          <Button
            label="Crear cuenta"
            fullWidth
            loading={loading || isSubmitting}
            onPress={handleSignUp}
            style={styles.submit}
          />

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity
              onPress={() => router.push('/signin')}
              accessibilityRole="link"
              accessibilityLabel="Iniciar sesión"
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            >
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.inkMuted,
    maxWidth: 440,
  },
  submit: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: 24,
  },
  footerText: {
    color: t.inkMuted,
    fontSize: 14,
    marginRight: 6,
  },
  footerLink: {
    color: t.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
