
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há um usuário logado no localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Simulando verificação de login
      if (email.includes('@') && password.length >= 6) {
        // Em um sistema real, você faria uma chamada de API aqui
        const mockUser = {
          id: Math.random().toString(36).substring(2),
          name: email.split('@')[0],
          email
        };
        
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        toast.success('Login realizado com sucesso!');
        return true;
      } else {
        toast.error('Credenciais inválidas');
        return false;
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Simulando registro
      if (email.includes('@') && password.length >= 6) {
        // Em um sistema real, você faria uma chamada de API aqui
        const mockUser = {
          id: Math.random().toString(36).substring(2),
          name,
          email
        };
        
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        toast.success('Registro realizado com sucesso!');
        return true;
      } else {
        toast.error('Dados de registro inválidos');
        return false;
      }
    } catch (error) {
      toast.error('Erro ao registrar usuário');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    toast.success('Logout realizado com sucesso!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
