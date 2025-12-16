import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { jwtDecode } from 'jwt-decode'; // Você precisará instalar: npm install jwt-decode

// Interface do Usuário (Alinhada com o Django CustomUser)
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'patient';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Verificar se já existe um token ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        // Opcional: Aqui você pode fazer um "api.get('/accounts/me/')" 
        // para buscar os dados frescos do banco
        setUser({
          id: decoded.user_id,
          email: decoded.email || '',
          full_name: decoded.full_name || '',
          role: decoded.role || 'patient'
        });
      } catch (err) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  // 2. Função de Login Real via API
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/accounts/login/', { email, password });
      const { access, refresh, user: userData } = response.data;

      // Salva os tokens no LocalStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Define o usuário no estado global
      setUser(userData);
    } catch (error) {
      console.error("Erro no login:", error);
      throw error; // Repassa o erro para ser tratado na página de Login (ex: exibir alerta)
    }
  };

  // 3. Função de Logout
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};