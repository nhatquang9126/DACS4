import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getBaseUrl = (): string => {
if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
}
if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
}
return 'http://localhost:3000/api';
};

export const getStoredToken = async (): Promise<string | null> => {
try {
    if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_token') : null;
    }
    return await SecureStore.getItemAsync('jwt_token');
} catch (error) {
    console.warn('Lỗi khi đọc token:', error);
    return null;
}
};

export const setStoredToken = async (token: string): Promise<void> => {
try {
    if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('jwt_token', token);
    return;
    }
    await SecureStore.setItemAsync('jwt_token', token);
} catch (error) {
    console.warn('Lỗi khi lưu token:', error);
}
};

export const removeStoredToken = async (): Promise<void> => {
try {
    if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('jwt_token');
    return;
    }
    await SecureStore.deleteItemAsync('jwt_token');
} catch (error) {
    console.warn('Lỗi khi xóa token:', error);
}
};

const axiosClient = axios.create({
baseURL: getBaseUrl(),
timeout: 15000,
headers: {
    'Content-Type': 'application/json',
},
});

// Interceptor: Tự động gắn Token vào mọi request
axiosClient.interceptors.request.use(
async (config) => {
    const token = await getStoredToken();

    console.log(
    '[API REQUEST]',
    config.method?.toUpperCase(),
    `${config.baseURL ?? ''}${config.url ?? ''}`
    );

    if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
},
(error) => Promise.reject(error)
);

// Interceptor: Xử lý lỗi chung (Token hết hạn...)
axiosClient.interceptors.response.use(
(response) => response,
async (error) => {
    console.log('[API ERROR]', {
    message: error.message,
    url: error.config?.baseURL + error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    response: error.response?.data,
    });

    if (error.response?.status === 401) {
    await removeStoredToken();
    }

    return Promise.reject(error);
}
);

export default axiosClient;
