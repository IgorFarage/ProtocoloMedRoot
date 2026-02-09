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
}, (error) => {
    return Promise.reject(error);
});

// Interceptor para lidar com erros de resposta (401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expirado ou inválido
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Redireciona para login se não estiver lá
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Métodos de Autenticação e Reset
export const auth = {
    requestPasswordReset: (email: string) => api.post('/accounts/password_reset/', { email }),

    confirmPasswordReset: (uid: string, token: string, new_password: string) =>
        api.post('/accounts/password_reset/confirm/', { uid, token, new_password })
};

export const financial = {
    validateCoupon: (code: string, amount: number) =>
        api.post<{ valid: boolean, discount_amount: number, final_price: number, message: string }>('/financial/coupon/validate/', { code, amount }),
};

export default api;