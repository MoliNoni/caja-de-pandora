// Database Service Module
// Data access layer for products and orders
// CRUD operations for products
// Order processing and user history
// External API integrations for images
// Search and filtering

import { supabase } from './supabase';
import { getOpenLibraryCoverUrl } from './openlibrary';
import { getDiscogsCoverUrl } from './discogs';
import { sendOrderConfirmationEmail } from './email';

export type ProductCategory = 'book' | 'vinyl';
export type UserRole = 'cliente' | 'admin';

export interface Cliente {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol?: UserRole;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: ProductCategory;
  activa: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  titulo: string;
  autor: string;
  descripcion: string;
  precio: number;
  stock: number;
  genero: string;
  categoria_id?: string | null;
  isbn?: string;
  discogs_id?: string;
  anio_publicacion: number;
  año_publicacion: number;
  editorial: string;
  vendidos: number;
  imageUrl: string;
  category: ProductCategory;
  createdAt?: string;
}

export type ProductCreateInput = {
  titulo: string;
  autor: string;
  descripcion: string;
  precio: number;
  stock: number;
  genero: string;
  categoria_id?: string | null;
  isbn?: string | null;
  discogs_id?: string | null;
  anio_publicacion?: number | null;
  editorial: string;
  imageUrl?: string | null;
  category: ProductCategory;
};

export type ProductUpdateInput = Partial<ProductCreateInput> & {
  vendidos?: number;
};

type ProductRow = Record<string, any>;

export interface Encabezado {
  id: string;
  cliente_id: string;
  estado: string;
  total: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface DetalleCompra {
  id?: string;
  encabezado_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PurchaseItemInput {
  id: string;
  titulo: string;
  precio: number;
  cantidad: number;
}

export interface PurchaseReceiptHeader {
  id: string;
  idCliente: string;
  fecha: string;
  subtotal: number;
  total: number;
  descuentoTotal: number;
}

export interface PurchaseReceiptDetail {
  id: string;
  idEncabezado: string;
  idProducto: string;
  titulo: string;
  cantidad: number;
  valor: number;
  descuento: number;
  subtotal: number;
}

export interface PurchaseReceipt {
  encabezado: PurchaseReceiptHeader;
  detalles: PurchaseReceiptDetail[];
  emailStatus?: string;
}

const normalizeProduct = (row: ProductRow): Product => {
  const anioPublicacion = Number(
    row.anio_publicacion ?? row['año_publicacion'] ?? row['aﾃｱo_publicacion'] ?? 0
  );

  return {
    id: String(row.id),
    titulo: String(row.titulo ?? ''),
    autor: String(row.autor ?? ''),
    descripcion: String(row.descripcion ?? ''),
    precio: Number(row.precio ?? 0),
    stock: Number(row.stock ?? 0),
    genero: String(row.genero ?? ''),
    categoria_id: row.categoria_id ?? null,
    isbn: row.isbn || undefined,
    discogs_id: row.discogs_id || undefined,
    anio_publicacion: anioPublicacion,
    año_publicacion: anioPublicacion,
    editorial: String(row.editorial ?? ''),
    vendidos: Number(row.vendidos ?? 0),
    imageUrl: String(row.imageUrl ?? row.image_url ?? ''),
    category: row.category === 'vinyl' ? 'vinyl' : 'book',
    createdAt: row.created_at ?? row.createdAt,
  };
};

const cleanOptionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeProductPayload = (
  productoData: ProductCreateInput | ProductUpdateInput
) => {
  const payload: Record<string, unknown> = {};

  if (productoData.titulo !== undefined) payload.titulo = productoData.titulo.trim();
  if (productoData.autor !== undefined) payload.autor = productoData.autor.trim();
  if (productoData.descripcion !== undefined) payload.descripcion = productoData.descripcion.trim();
  if (productoData.precio !== undefined) payload.precio = Number(productoData.precio);
  if (productoData.stock !== undefined) payload.stock = Number(productoData.stock);
  if (productoData.genero !== undefined) payload.genero = productoData.genero.trim();
  if (productoData.categoria_id !== undefined) {
    payload.categoria_id = cleanOptionalString(productoData.categoria_id);
  }
  if (productoData.isbn !== undefined) payload.isbn = cleanOptionalString(productoData.isbn);
  if (productoData.discogs_id !== undefined) payload.discogs_id = cleanOptionalString(productoData.discogs_id);
  if (productoData.anio_publicacion !== undefined) {
    payload.anio_publicacion = productoData.anio_publicacion
      ? Number(productoData.anio_publicacion)
      : null;
  }
  if (productoData.editorial !== undefined) payload.editorial = productoData.editorial.trim();
  if (productoData.imageUrl !== undefined) payload.imageUrl = cleanOptionalString(productoData.imageUrl);
  if (productoData.category !== undefined) payload.category = productoData.category;
  if ('vendidos' in productoData && productoData.vendidos !== undefined) {
    payload.vendidos = Number(productoData.vendidos);
  }

  return payload;
};

const movePublicationYearToLegacyColumn = (payload: Record<string, unknown>) => {
  if (!Object.prototype.hasOwnProperty.call(payload, 'anio_publicacion')) {
    return payload;
  }

  const legacyPayload = { ...payload };
  legacyPayload['año_publicacion'] = legacyPayload.anio_publicacion;
  delete legacyPayload.anio_publicacion;
  return legacyPayload;
};

const isMissingAnioColumnError = (error: { message?: string } | null) =>
  Boolean(error?.message?.includes('anio_publicacion'));

export const getCategorias = async (tipo?: ProductCategory): Promise<Categoria[]> => {
  try {
    let query = supabase
      .from('categorias')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Categoria[];
  } catch (error) {
    console.error('Error fetching categorias:', error);
    throw error;
  }
};

export const createCategoria = async (
  nombre: string,
  tipo: ProductCategory
): Promise<Categoria> => {
  try {
    const normalizedName = nombre.trim();

    const { data: existingCategoria, error: existingError } = await supabase
      .from('categorias')
      .select('*')
      .eq('tipo', tipo)
      .ilike('nombre', normalizedName)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingCategoria) return existingCategoria as Categoria;

    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: normalizedName,
        tipo,
        activa: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Categoria;
  } catch (error) {
    console.error('Error creating categoria:', error);
    throw error;
  }
};

// Get products from database
export const getProductos = async (category?: ProductCategory): Promise<Product[]> => {
  try {
    let query = supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(normalizeProduct);
  } catch (error) {
    console.error('Error fetching productos:', error);
    throw error;
  }
};

// Get top 5 best-selling products
export const getTopBestSellers = async (category: ProductCategory = 'book'): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('category', category)
      .order('vendidos', { ascending: false })
      .limit(5);

    if (error) throw error;
    return (data || []).map(normalizeProduct);
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    throw error;
  }
};

export const getLatestProducts = async (
  category: ProductCategory = 'book',
  limit = 5
): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(normalizeProduct);
  } catch (error) {
    console.error('Error fetching latest products:', error);
    throw error;
  }
};

/**
 * getProductoById - Fetches a single product by its ID
 *
 * Retrieves detailed product information for product detail views
 * Used when displaying individual product pages
 *
 * @param id - Product unique identifier
 * @returns Promise<Product> - Single product object
 */
export const getProductoById = async (id: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return normalizeProduct(data);
  } catch (error) {
    console.error('Error fetching producto:', error);
    throw error;
  }
};

// Create new product in database
export const createProducto = async (productoData: ProductCreateInput): Promise<Product> => {
  try {
    const payload = normalizeProductPayload(productoData);

    // Si no hay imagen, obtener de la API correspondiente
    if (!payload.imageUrl) {
      if (productoData.category === 'book' && productoData.isbn) {
        const coverUrl = await getOpenLibraryCoverUrl(productoData.isbn);
        if (coverUrl) {
          payload.imageUrl = coverUrl;
        }
      } else if (productoData.category === 'vinyl' && productoData.discogs_id) {
        const coverUrl = await getDiscogsCoverUrl(productoData.discogs_id);
        if (coverUrl) {
          payload.imageUrl = coverUrl;
        }
      }
    }

    let { data, error } = await supabase
      .from('productos')
      .insert([payload])
      .select()
      .single();

    if (isMissingAnioColumnError(error)) {
      const retry = await supabase
        .from('productos')
        .insert([movePublicationYearToLegacyColumn(payload)])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error?.message?.includes('categoria_id')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.categoria_id;

      const retry = await supabase
        .from('productos')
        .insert([fallbackPayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return normalizeProduct(data);
  } catch (error) {
    console.error('Error creating producto:', error);
    throw error;
  }
};

// Actualizar producto (Admin)
export const updateProducto = async (id: string, updates: ProductUpdateInput): Promise<Product> => {
  try {
    const payload = normalizeProductPayload(updates);

    let { data, error } = await supabase
      .from('productos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (isMissingAnioColumnError(error)) {
      const retry = await supabase
        .from('productos')
        .update(movePublicationYearToLegacyColumn(payload))
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error?.message?.includes('categoria_id')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.categoria_id;

      const retry = await supabase
        .from('productos')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return normalizeProduct(data);
  } catch (error) {
    console.error('Error updating producto:', error);
    throw error;
  }
};

// Eliminar producto (Admin)
export const deleteProducto = async (id: string) => {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting producto:', error);
    throw error;
  }
};

// Crear encabezado (orden)
export const createEncabezado = async (clienteId: string, total: number) => {
  try {
    const { data, error } = await supabase
      .from('encabezados')
      .insert([
        {
          cliente_id: clienteId,
          total,
          estado: 'completada',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Encabezado;
  } catch (error) {
    console.error('Error creating encabezado:', error);
    throw error;
  }
};

// Crear detalles (items de orden)
export const createDetalles = async (detalles: DetalleCompra[]) => {
  try {
    const { data, error } = await supabase
      .from('detalles')
      .insert(detalles)
      .select();

    if (error) throw error;
    return (data || []) as DetalleCompra[];
  } catch (error) {
    console.error('Error creating detalles:', error);
    throw error;
  }
};

// Actualizar cantidad vendida de productos
export const updateProductoVendidos = async (productId: string, cantidad: number) => {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from('productos')
      .select('vendidos')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    const newVendidos = (currentData?.vendidos || 0) + cantidad;

    const { error: updateError } = await supabase
      .from('productos')
      .update({ vendidos: newVendidos })
      .eq('id', productId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating vendidos:', error);
    throw error;
  }
};

// Obtener órdenes del cliente
export const getClienteOrdenes = async (clienteId: string) => {
  try {
    // Primero obtener el cliente por email (clienteId aquí es el auth user id)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', user.email)
      .single();

    if (clienteError || !cliente) {
      return []; // No hay cliente, no hay órdenes
    }

    // Ahora buscar órdenes usando el id del cliente
    const { data, error } = await supabase
      .from('encabezados')
      .select(
        `
        *,
        detalles(
          *,
          producto:producto_id(*)
        )
      `
      )
      .eq('cliente_id', cliente.id)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching ordenes:', error);
    throw error;
  }
};

// Verificar y crear cliente si no existe
export const ensureClienteExists = async (clienteId: string, userEmail?: string) => {
  try {
    let email = userEmail;
    if (!email) {
      // Intentar obtener email del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        email = user.email;
      }
    }

    if (!email) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    // Verificar si el cliente ya existe por email
    const { data: existingCliente, error: fetchError } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', email)
      .single();

    if (existingCliente) {
      return existingCliente as Cliente; // Ya existe, devolver el registro completo
    }

    // Si no existe, crear cliente básico
    const clienteData = {
      email,
      nombre: '',
      apellido: '',
      telefono: null,
      direccion: null,
      ciudad: null,
      codigo_postal: null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert(clienteData)
      .select()
      .single();

    if (error) throw error;
    return data as Cliente;
  } catch (error) {
    console.error('Error ensuring cliente exists:', error);
    throw error;
  }
};

// Procesar compra completa
export const procesarCompra = async (
  clienteId: string,
  items: PurchaseItemInput[],
  total: number,
  userEmail?: string
): Promise<PurchaseReceipt> => {
  try {
    // 0. Asegurar que el cliente existe y obtener su registro
    const cliente = await ensureClienteExists(clienteId, userEmail);

    // 1. Crear encabezado usando el ID del cliente de la tabla clientes
    const encabezado = await createEncabezado(cliente.id, total);

    // 2. Crear detalles
    const detalles = items.map((item) => ({
      encabezado_id: encabezado.id,
      producto_id: item.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.precio * item.cantidad,
    })) satisfies DetalleCompra[];

    const detallesCreados = await createDetalles(detalles);

    // 3. Actualizar cantidad vendida y stock
    for (const item of items) {
      await updateProductoVendidos(item.id, item.cantidad);
      const producto = await getProductoById(item.id);
      await updateProducto(item.id, {
        stock: Math.max(0, producto.stock - item.cantidad),
      });
    }

    const receiptDetails = items.map((item, index) => ({
      id: detallesCreados?.[index]?.id || `${encabezado.id}-${item.id}-${index}`,
      idEncabezado: encabezado.id,
      idProducto: item.id,
      titulo: item.titulo,
      cantidad: item.cantidad,
      valor: item.precio,
      descuento: 0,
      subtotal: item.precio * item.cantidad,
    }));

    let emailStatus = 'Orden registrada correctamente.';
    const emailRecipient = userEmail || cliente.email;

    if (emailRecipient) {
      try {
        await sendOrderConfirmationEmail(emailRecipient, {
          encabezado: {
            id: encabezado.id,
            idCliente: cliente.id,
            fecha:
              encabezado.fecha_creacion ||
              encabezado.fecha_actualizacion ||
              new Date().toISOString(),
            subtotal: total,
            total,
            descuentoTotal: 0,
          },
          detalles: receiptDetails,
        }, items);
        emailStatus = `Correo de confirmación enviado a ${emailRecipient}`;
      } catch (sendError) {
        console.warn('No se pudo enviar el correo de confirmación:', sendError);
        const errorMessage =
          sendError instanceof Error
            ? sendError.message
            : typeof sendError === 'string'
            ? sendError
            : JSON.stringify(sendError);
        emailStatus = `No se pudo enviar el correo de confirmación. ${errorMessage}`;
      }
    } else {
      emailStatus = 'No se encontró un correo para enviar la confirmación.';
    }

    return {
      encabezado: {
        id: encabezado.id,
        idCliente: cliente.id,
        fecha:
          encabezado.fecha_creacion ||
          encabezado.fecha_actualizacion ||
          new Date().toISOString(),
        subtotal: total,
        total,
        descuentoTotal: 0,
      },
      detalles: receiptDetails,
      emailStatus,
    };
  } catch (error) {
    console.error('Error procesando compra:', error);
    throw error;
  }
};
