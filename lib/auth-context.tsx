import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Cliente } from './database';

interface AuthContextType {
  session: Session | null;
  user: any;
  profile: Cliente | null;
  isAdmin: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (email?: string | null) => {
    if (!email) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
      return null;
    }

    setProfile((data as Cliente | null) || null);
    return data as Cliente | null;
  };

  useEffect(() => {
    // Obtener sesión al iniciar
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data?.session || null);
        setUser(data?.session?.user || null);
        await loadProfile(data?.session?.user?.email);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      setUser(session?.user || null);
      void loadProfile(session?.user?.email);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Registrar nuevo usuario
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Crear registro en tabla clientes
      if (data.user) {
        const { error: insertError } = await supabase
          .from('clientes')
          .insert({
            email,
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            telefono: userData.telefono || null,
            direccion: userData.direccion || null,
            ciudad: userData.ciudad || null,
            codigo_postal: userData.codigoPostal || null,
            rol: 'cliente',
          });
        
        if (insertError) {
          console.error('Error inserting cliente:', insertError);
          throw new Error(`Error creando perfil: ${insertError.message}`);
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin: profile?.rol === 'admin',
        signUp,
        signIn,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
