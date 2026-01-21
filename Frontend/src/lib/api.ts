import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Usa o proxy do Vite (configurado em vite.config.ts)
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Métodos de Autenticação e Reset
export const auth = {
    requestPasswordReset: (email: string) => api.post('/accounts/password_reset/', { email }),

    confirmPasswordReset: (uid: string, token: string, new_password: string) =>
        api.post('/accounts/password_reset/confirm/', { uid, token, new_password })
};

export default api;