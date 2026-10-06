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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'expo-router';

// Sign in screen component
export default function SignInScreen() {
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
        Alert.alert(
          'Demasiadas peticiones',
          'Espera un momento antes de intentar de nuevo.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error de autenticacion', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <TouchableOpacity
          style={[styles.button, (loading || isSubmitting) && styles.disabledButton]}
          onPress={handleSignIn}
          disabled={loading || isSubmitting}
        >
          {loading || isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesion</Text>
          )}
        </TouchableOpacity>

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
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.guestButtonText}>Continuar como invitado</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  error: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signUpText: {
    color: '#666',
    fontSize: 14,
    marginRight: 4,
  },
  signUpLink: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
  },
  guestButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
});
