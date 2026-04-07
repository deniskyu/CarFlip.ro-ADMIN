import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use((response) => {
    const newToken = response.headers['x-new-token'];
    if (newToken) localStorage.setItem('adminToken', newToken);
    return response;
}, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});

export default api;