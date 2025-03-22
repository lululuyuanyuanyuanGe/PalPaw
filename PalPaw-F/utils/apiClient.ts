import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - change this to your backend server address
const BASE_URL = 'http://192.168.2.11:5001/api';

// Create a reusable axios instance with common configurations
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increase timeout to 15 seconds
});

// Add interceptor to inject authentication token into requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log outgoing requests for debugging
      console.log(`${config.method?.toUpperCase()} ${config.url}`, 
                  config.data ? JSON.stringify(config.data) : '');
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`Response from ${response.config.url}:`, 
                response.status, 
                response.data ? JSON.stringify(response.data) : '');
    return response;
  },
  (error) => {
    // Log detailed error information
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Type definitions
interface LoginData {
  login: string;   // username or email
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface PostData {
  title: string;
  content: string;
  media?: Array<{uri: string; type: string; name: string}>;
  location?: string;
  tags?: string[];
}

interface ProductData {
  name: string;
  description: string;
  price: number;
  media?: Array<{uri: string; type: string; name: string}>;
  category?: string;
  condition?: string;
  tags?: string[];
}

// API endpoints - match the exact paths in server.js
export const endpoints = {
  auth: {
    login: '/pg/auth/login',
    register: '/pg/auth/register',
    profile: '/pg/auth/profile',
  },
  posts: {
    create: '/posts',
    list: '/posts',
  },
  products: {
    create: '/products',
    list: '/products',
  },
};

// Helper function for direct fetch API calls (more reliable for debugging)
const fetchApi = async (url: string, method: string, data?: any) => {
  try {
    console.log(`${method} ${url}`, data ? JSON.stringify(data) : '');
    
    const response = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    const responseData = await response.json();
    console.log(`Response from ${url}:`, response.status, JSON.stringify(responseData));
    
    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: responseData
        }
      };
    }
    
    return { data: responseData };
  } catch (error) {
    console.error('Fetch API Error:', error);
    throw error;
  }
};

// Authentication service
export const authService = {
  // Use direct fetch for login to match registration behavior
  login: (data: LoginData) => fetchApi(endpoints.auth.login, 'POST', data),
  // Use direct fetch for registration to bypass potential axios issues
  register: (data: RegisterData) => fetchApi(endpoints.auth.register, 'POST', data),
  getProfile: () => api.get(endpoints.auth.profile),
  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
  },
};

// Posts service
export const postsService = {
  create: (data: PostData) => api.post(endpoints.posts.create, data),
  list: () => api.get(endpoints.posts.list),
};

// Products service
export const productsService = {
  create: (data: ProductData) => api.post(endpoints.products.create, data),
  list: () => api.get(endpoints.posts.list),
};

export default api; 