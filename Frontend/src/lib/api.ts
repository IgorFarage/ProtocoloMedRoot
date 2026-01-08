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

export default api;