import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Categoria,
  createCategoria,
  createProducto,
  getCategorias,
  ProductCategory,
  ProductCreateInput,
} from '../lib/database';
import { showAlert } from '../lib/dialog';
import { useAuth } from '../lib/auth-context';

type ProductFormState = {
  titulo: string;
  autor: string;
  descripcion: string;
  precio: string;
  stock: string;
  genero: string;
  categoria_id: string;
  isbn: string;
  discogs_id: string;
  anio_publicacion: string;
  editorial: string;
  imageUrl: string;
  category: ProductCategory;
};

const initialFormState: ProductFormState = {
  titulo: '',
  autor: '',
  descripcion: '',
  precio: '',
  stock: '',
  genero: '',
  categoria_id: '',
  isbn: '',
  discogs_id: '',
  anio_publicacion: '',
  editorial: '',
  imageUrl: '',
  category: 'book',
};

const requiredFields: (keyof ProductFormState)[] = [
  'titulo',
  'autor',
  'descripcion',
  'precio',
  'stock',
  'genero',
  'editorial',
];

export default function AdminScreen() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<ProductFormState>(initialFormState);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormState, string>>>({});

  const categoriasDisponibles = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === formData.category),
    [categorias, formData.category]
  );

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true);
        setCategorias(await getCategorias());
      } catch (error) {
        console.error('Error loading categorias:', error);
        setCategorias([]);
      } finally {
        setLoadingCategorias(false);
      }
    };

    void loadCategorias();
  }, []);

  const setField = (field: keyof ProductFormState, value: string | ProductCategory) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleCategoryTypeChange = (category: ProductCategory) => {
    setFormData((current) => ({
      ...current,
      category,
      genero: '',
      categoria_id: '',
    }));
    setErrors((current) => ({ ...current, genero: undefined }));
  };

  const handleCategoriaSelect = (categoria: Categoria) => {
    setFormData((current) => ({
      ...current,
      genero: categoria.nombre,
      categoria_id: categoria.id,
    }));
    setErrors((current) => ({ ...current, genero: undefined }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ProductFormState, string>> = {};

    requiredFields.forEach((field) => {
      if (!String(formData[field]).trim()) {
        nextErrors[field] = 'Campo requerido';
      }
    });

    const precio = Number(formData.precio);
    const stock = Number(formData.stock);
    const anio = formData.anio_publicacion ? Number(formData.anio_publicacion) : null;

    if (!Number.isFinite(precio) || precio <= 0) {
      nextErrors.precio = 'Ingresa un precio valido';
    }

    if (!Number.isInteger(stock) || stock < 0) {
      nextErrors.stock = 'Ingresa un stock valido';
    }

    if (anio !== null && (!Number.isInteger(anio) || anio < 0)) {
      nextErrors.anio_publicacion = 'Ingresa un año valido';
    }

    if (formData.category === 'book' && !formData.isbn.trim()) {
      nextErrors.isbn = 'ISBN requerido para libros';
    }

    if (formData.category === 'vinyl' && !formData.discogs_id.trim()) {
      nextErrors.discogs_id = 'Discogs ID requerido para vinilos';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = async (): Promise<ProductCreateInput> => {
    let categoriaId = formData.categoria_id || null;
    let genero = formData.genero.trim();

    if (!categoriaId && genero) {
      const categoria = await createCategoria(genero, formData.category);
      categoriaId = categoria.id;
      genero = categoria.nombre;
      setCategorias((current) => {
        if (current.some((item) => item.id === categoria.id)) {
          return current;
        }

        return [...current, categoria].sort((first, second) =>
          first.nombre.localeCompare(second.nombre)
        );
      });
    }

    return {
    titulo: formData.titulo,
    autor: formData.autor,
    descripcion: formData.descripcion,
    precio: Number(formData.precio),
    stock: Number(formData.stock),
    genero,
    categoria_id: categoriaId,
    isbn: formData.category === 'book' ? formData.isbn : null,
    discogs_id: formData.category === 'vinyl' ? formData.discogs_id : null,
    anio_publicacion: formData.anio_publicacion ? Number(formData.anio_publicacion) : null,
    editorial: formData.editorial,
    imageUrl: formData.imageUrl,
    category: formData.category,
    };
  };

  const handleSubmit = async () => {
    if (submitting || !validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await createProducto(await buildPayload());
      setFormData({ ...initialFormState, category: formData.category });
      showAlert('Producto creado', 'El producto fue añadido al catalogo.');
    } catch (error: any) {
      showAlert('No se pudo crear', error?.message || 'Revisa los datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4b0082" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>Inicia sesion</Text>
          <Text style={styles.emptySubtitle}>Necesitas autenticarte para administrar productos.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/signin')}>
            <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>Acceso restringido</Text>
          <Text style={styles.emptySubtitle}>Tu usuario no esta habilitado como administrador.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Administracion</Text>
            <Text style={styles.subtitle}>Añadir productos al catalogo</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                formData.category === 'book' && styles.activeSegmentButton,
              ]}
              onPress={() => handleCategoryTypeChange('book')}
            >
              <Ionicons
                name="book"
                size={18}
                color={formData.category === 'book' ? '#fff' : '#4b5563'}
              />
              <Text
                style={[
                  styles.segmentText,
                  formData.category === 'book' && styles.activeSegmentText,
                ]}
              >
                Libro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                formData.category === 'vinyl' && styles.activeSegmentButton,
              ]}
              onPress={() => handleCategoryTypeChange('vinyl')}
            >
              <Ionicons
                name="disc"
                size={18}
                color={formData.category === 'vinyl' ? '#fff' : '#4b5563'}
              />
              <Text
                style={[
                  styles.segmentText,
                  formData.category === 'vinyl' && styles.activeSegmentText,
                ]}
              >
                Vinilo
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Titulo"
            value={formData.titulo}
            error={errors.titulo}
            onChangeText={(text) => setField('titulo', text)}
          />
          <Input
            label={formData.category === 'book' ? 'Autor' : 'Artista'}
            value={formData.autor}
            error={errors.autor}
            onChangeText={(text) => setField('autor', text)}
          />
          <Input
            label="Descripcion"
            value={formData.descripcion}
            error={errors.descripcion}
            multiline
            onChangeText={(text) => setField('descripcion', text)}
          />
          <View style={styles.inlineFields}>
            <Input
              label="Precio"
              value={formData.precio}
              error={errors.precio}
              keyboardType="decimal-pad"
              onChangeText={(text) => setField('precio', text)}
            />
            <Input
              label="Stock"
              value={formData.stock}
              error={errors.stock}
              keyboardType="number-pad"
              onChangeText={(text) => setField('stock', text)}
            />
          </View>
          <View style={styles.categoryGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Categoria</Text>
              {loadingCategorias && <ActivityIndicator size="small" color="#4b0082" />}
            </View>
            {categoriasDisponibles.length > 0 && (
              <View style={styles.categoryChips}>
                {categoriasDisponibles.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoryChip,
                      formData.categoria_id === categoria.id && styles.activeCategoryChip,
                    ]}
                    onPress={() => handleCategoriaSelect(categoria)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.categoria_id === categoria.id && styles.activeCategoryChipText,
                      ]}
                    >
                      {categoria.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Input
              label="Nueva categoria"
              value={formData.genero}
              error={errors.genero}
              onChangeText={(text) => {
                setFormData((current) => ({
                  ...current,
                  genero: text,
                  categoria_id: '',
                }));
                setErrors((current) => ({ ...current, genero: undefined }));
              }}
            />
          </View>
          <Input
            label={formData.category === 'book' ? 'ISBN' : 'Discogs ID'}
            value={formData.category === 'book' ? formData.isbn : formData.discogs_id}
            error={formData.category === 'book' ? errors.isbn : errors.discogs_id}
            onChangeText={(text) =>
              setField(formData.category === 'book' ? 'isbn' : 'discogs_id', text)
            }
          />
          <View style={styles.inlineFields}>
            <Input
              label="Año"
              value={formData.anio_publicacion}
              error={errors.anio_publicacion}
              keyboardType="number-pad"
              onChangeText={(text) => setField('anio_publicacion', text)}
            />
            <Input
              label={formData.category === 'book' ? 'Editorial' : 'Sello'}
              value={formData.editorial}
              error={errors.editorial}
              onChangeText={(text) => setField('editorial', text)}
            />
          </View>
          <Input
            label="URL de imagen"
            value={formData.imageUrl}
            onChangeText={(text) => setField('imageUrl', text)}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Añadir producto</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InputProps = {
  label: string;
  value: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onChangeText: (text: string) => void;
};

const Input = ({
  label,
  value,
  error,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onChangeText,
}: InputProps) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor="#9ca3af"
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#eef2f7',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  form: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    backgroundColor: '#e9edf3',
    borderRadius: 8,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  activeSegmentButton: {
    backgroundColor: '#4b0082',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  activeSegmentText: {
    color: '#fff',
  },
  inlineFields: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryGroup: {
    gap: 10,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  activeCategoryChip: {
    backgroundColor: '#4b0082',
    borderColor: '#4b0082',
  },
  categoryChipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#1f8f55',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#4b0082',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#eef2f7',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontWeight: '800',
  },
});
