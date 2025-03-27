import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';
import {processMediaFiles } from '../utils/mediaUtils';

// Helper function to fetch user data directly
const fetchUserData = async (userId: string) => {
  try {
    const response = await api.get(`/pg/users/${userId}`);
    if (response.data && response.data.user) {
      return {
        id: response.data.user.id,
        username: response.data.user.username || 'User',
        avatar: response.data.user.avatar || `https://robohash.org/${userId}?set=set4`
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user data for ID ${userId}:`, error);
    return null;
  }
};

// Define the Product Item interface based on the Product model
export interface ProductItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  media: any[];
  quantity: number;
  status: 'active' | 'sold' | 'archived';
  tags: string[];
  shipping: any;
  views: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // UI specific fields
  sellerData?: {
    id: string;
    username: string;
    avatar: string;
  };
  image?: { uri: string };
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  thumbnailUri?: string;
  allMedia?: any[];
  isSaved?: boolean;
}

// Helper function to standardize product format
const standardizeProductFormat = (product: any): ProductItem => {
  console.log("Standardizing product format for id:", product.id);
  
  // Process seller data
  let sellerData = null;
  if (product.sellerData) {
    sellerData = product.sellerData;
    console.log(`Using existing sellerData for product ${product.id}:`, JSON.stringify(sellerData));
  } else if (product.seller) {
    sellerData = {
      id: product.seller.id,
      username: product.seller.username || 'User',
      avatar: product.seller.avatar || `https://robohash.org/${product.seller.id}?set=set4`
    };
    console.log(`Created sellerData from seller for product ${product.id}:`, JSON.stringify(sellerData));
  } else if (product.userId || product.user_id) {
    const userId = product.userId || product.user_id;
    sellerData = {
      id: userId,
      username: 'User',
      avatar: `https://robohash.org/${userId}?set=set4`
    };
    console.log(`Created placeholder sellerData for product ${product.id} using userId:`, JSON.stringify(sellerData));
  }
  
  // Ensure tags is always an array and has valid values
  const tags = Array.isArray(product.tags) ? product.tags.filter((tag: string) => tag) : [];
  console.log(`Tags for product ${product.id}:`, JSON.stringify(tags));
  
  // Process media for consistent format
  let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
  let mediaType: 'image' | 'video' = 'image';
  let mediaUrl = '';
  let thumbnailUri = '';
  
  // Process media array to find the right thumbnail
  if (product.media && Array.isArray(product.media) && product.media.length > 0) {
    const mediaResult = processMediaFiles(product.media);
    imageUrl = mediaResult.imageUrl;
    mediaType = mediaResult.mediaType;
    mediaUrl = mediaResult.mediaUrl;
    thumbnailUri = mediaResult.thumbnailUri || '';
  }
  
  // Return standardized product object matching ALL fields from the Product model
  return {
    id: product.id,
    userId: product.userId || product.user_id,
    name: product.name || "Untitled Product",
    description: product.description || "",
    price: parseFloat(product.price) || 0,
    category: product.category || "Other",
    condition: product.condition || "New",
    media: product.media || [],
    quantity: product.quantity || 1,
    status: product.status || 'active',
    tags: tags,
    shipping: product.shipping || {},
    views: product.views || 0,
    isDeleted: product.isDeleted || false,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    // UI specific fields
    sellerData: sellerData,
    image: { uri: imageUrl },
    imageUrl: imageUrl,
    mediaType: mediaType,
    mediaUrl: mediaUrl,
    thumbnailUri: thumbnailUri,
    allMedia: product.media || [],
    isSaved: product.isSaved || false
  };
};

// Define the context state interface
interface ProductsState {
  products: ProductItem[];
  userProducts: ProductItem[];
  savedProducts: ProductItem[];
  savedProductIds: string[];
  currentProduct: ProductItem | null;
  loading: boolean;
  error: string | null;
}

// Define actions that can be dispatched to modify the state
export type ProductsAction =
  | { type: 'FETCH_PRODUCTS_REQUEST' }
  | { type: 'FETCH_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_USER_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_USER_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_SAVED_PRODUCTS_SUCCESS'; payload: { products: ProductItem[], productIds: string[] } }
  | { type: 'FETCH_SAVED_PRODUCTS_FAILURE'; payload: string }
  | { type: 'SET_CURRENT_PRODUCT'; payload: ProductItem }
  | { type: 'CLEAR_CURRENT_PRODUCT' }
  | { type: 'SAVE_PRODUCT_SUCCESS'; payload: { productId: string, savedProductIds: string[] } }
  | { type: 'UNSAVE_PRODUCT_SUCCESS'; payload: { productId: string, savedProductIds: string[] } }
  | { type: 'SAVE_PRODUCT_FAILURE'; payload: string }
  | { type: 'UNSAVE_PRODUCT_FAILURE'; payload: string }
  | { type: 'INCREMENT_PRODUCT_VIEWS'; payload: { productId: string } }
  | { type: 'CLEAR_ERRORS' };

// Define initial state
const initialState: ProductsState = {
  products: [],
  userProducts: [],
  savedProducts: [],
  savedProductIds: [],
  currentProduct: null,
  loading: false,
  error: null,
};

// Create the reducer function
const productsReducer = (state: ProductsState, action: ProductsAction): ProductsState => {
  switch (action.type) {
    case 'FETCH_PRODUCTS_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_PRODUCTS_SUCCESS':
      return {
        ...state,
        products: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_PRODUCTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_USER_PRODUCTS_SUCCESS':
      return {
        ...state,
        userProducts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_USER_PRODUCTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_SAVED_PRODUCTS_SUCCESS':
      return {
        ...state,
        savedProducts: action.payload.products,
        savedProductIds: action.payload.productIds,
        loading: false,
        error: null,
      };
    case 'FETCH_SAVED_PRODUCTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'SET_CURRENT_PRODUCT':
      return {
        ...state,
        currentProduct: action.payload,
      };
    case 'CLEAR_CURRENT_PRODUCT':
      return {
        ...state,
        currentProduct: null,
      };
    case 'SAVE_PRODUCT_SUCCESS': {
      // Find all instances of the product and update them
      const productId = action.payload.productId;
      const updatedProducts = state.products.map(product => 
        product.id === productId 
          ? { ...product, isSaved: true } 
          : product
      );
      const updatedUserProducts = state.userProducts.map(product => 
        product.id === productId 
          ? { ...product, isSaved: true } 
          : product
      );
      
      // Update currentProduct if it's the saved product
      const updatedCurrentProduct = state.currentProduct?.id === productId
        ? { ...state.currentProduct, isSaved: true }
        : state.currentProduct;
      
      // If this is a newly saved product, add it to savedProducts if not already there
      let newSavedProducts = [...state.savedProducts];
      if (!state.savedProducts.some(product => product.id === productId)) {
        const productToAdd = updatedProducts.find(product => product.id === productId) || 
                           updatedUserProducts.find(product => product.id === productId);
        if (productToAdd) {
          newSavedProducts = [productToAdd, ...newSavedProducts];
        }
      }
      
      return {
        ...state,
        products: updatedProducts,
        userProducts: updatedUserProducts,
        savedProducts: newSavedProducts,
        savedProductIds: action.payload.savedProductIds,
        currentProduct: updatedCurrentProduct
      };
    }
    
    case 'UNSAVE_PRODUCT_SUCCESS': {
      // Find all instances of the product and update them
      const productId = action.payload.productId;
      const updatedProducts = state.products.map(product => 
        product.id === productId 
          ? { ...product, isSaved: false } 
          : product
      );
      const updatedUserProducts = state.userProducts.map(product => 
        product.id === productId 
          ? { ...product, isSaved: false } 
          : product
      );
      
      // Remove the product from savedProducts if it's there
      const updatedSavedProducts = state.savedProducts
        .filter(product => !action.payload.savedProductIds.includes(product.id) ? product.id !== productId : true)
        .map(product => 
          product.id === productId 
            ? { ...product, isSaved: false } 
            : product
        );
      
      // Update currentProduct if it's the unsaved product
      const updatedCurrentProduct = state.currentProduct?.id === productId
        ? { ...state.currentProduct, isSaved: false }
        : state.currentProduct;
      
      return {
        ...state,
        products: updatedProducts,
        userProducts: updatedUserProducts,
        savedProducts: updatedSavedProducts,
        savedProductIds: action.payload.savedProductIds,
        currentProduct: updatedCurrentProduct
      };
    }
    case 'SAVE_PRODUCT_FAILURE':
    case 'UNSAVE_PRODUCT_FAILURE':
      return {
        ...state,
        error: action.payload,
      };
    case 'INCREMENT_PRODUCT_VIEWS':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.productId
            ? { ...product, views: (product.views || 0) + 1 }
            : product
        ),
        userProducts: state.userProducts.map(product =>
          product.id === action.payload.productId
            ? { ...product, views: (product.views || 0) + 1 }
            : product
        ),
        savedProducts: state.savedProducts.map(product =>
          product.id === action.payload.productId
            ? { ...product, views: (product.views || 0) + 1 }
            : product
        ),
        currentProduct: state.currentProduct?.id === action.payload.productId
          ? { ...state.currentProduct, views: (state.currentProduct.views || 0) + 1 }
          : state.currentProduct,
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create a context for products
interface ProductsContextType {
  state: ProductsState;
  dispatch: React.Dispatch<ProductsAction>;
  fetchProducts: () => Promise<void>;
  fetchUserProducts: (userId: string) => Promise<void>;
  fetchSavedProducts: (userId?: string) => Promise<void>;
  fetchProductById: (productId: string) => Promise<void>;
  setCurrentProduct: (product: ProductItem) => void;
  saveProduct: (productId: string) => Promise<boolean>;
  unsaveProduct: (productId: string) => Promise<boolean>;
  isProductSaved: (productId: string) => boolean;
  incrementProductViews: (productId: string) => Promise<void>;
}

// Create the context with default values
const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// Create a provider component
interface ProductsProviderProps {
  children: ReactNode;
}

export const ProductsProvider: React.FC<ProductsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(productsReducer, initialState);

  // Function to fetch all products
  const fetchProducts = async () => {
    dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
    try {
      const response = await api.get('/pg/products');
      let products = [];
      
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products;
      }
      
      const standardizedProducts = products.map((product: any) => standardizeProductFormat(product));
      dispatch({ type: 'FETCH_PRODUCTS_SUCCESS', payload: standardizedProducts });
    } catch (error) {
      console.error('Error fetching products:', error);
      dispatch({
        type: 'FETCH_PRODUCTS_FAILURE',
        payload: 'Failed to fetch products',
      });
    }
  };

  // Function to fetch user products
  const fetchUserProducts = async (userId: string): Promise<void> => {
    dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
    try {
      const response = await api.get(`/pg/products/user/${userId}`);
      
      if (response?.data?.success && response.data.products) {
        const products = response.data.products;
        console.log(`ProductsContext: Received ${products.length} user products`);
        
        // Enhance products with seller data if missing
        const enhancedProducts = await Promise.all(products.map(async (product: any) => {
          // If product is missing seller data, try to fetch it
          if (!product.seller && !product.sellerData && (product.userId || product.user_id)) {
            console.warn(`User product ${product.id} is missing seller data, fetching...`);
            const productUserId = product.userId || product.user_id;
            const userData = await fetchUserData(productUserId);
            
            if (userData) {
              product.sellerData = userData;
              console.log(`Added seller data to product ${product.id}:`, JSON.stringify(userData));
            } else {
              console.warn(`Failed to fetch seller data for product ${product.id}`);
            }
          }
          
          return product;
        }));
        
        // Standardize product format for each product
        const standardizedProducts = enhancedProducts.map((product: any) => standardizeProductFormat(product));
        
        dispatch({ type: 'FETCH_USER_PRODUCTS_SUCCESS', payload: standardizedProducts });
      } else {
        // Fallback to general products and filter by userId
        try {
          const fallbackResponse = await api.get('/pg/products');
          let userProducts = [];
          
          if (Array.isArray(fallbackResponse.data)) {
            userProducts = fallbackResponse.data.filter((product: any) => product.userId === userId);
          } else if (fallbackResponse.data.products && Array.isArray(fallbackResponse.data.products)) {
            userProducts = fallbackResponse.data.products.filter((product: any) => product.userId === userId);
          }
          
          console.log(`ProductsContext: Found ${userProducts.length} products with fallback`);
          
          // Enhance fallback products with seller data if missing
          const enhancedFallbackProducts = await Promise.all(userProducts.map(async (product: any) => {
            // If product is missing seller data, try to fetch it
            if (!product.seller && !product.sellerData && (product.userId || product.user_id)) {
              console.warn(`Fallback product ${product.id} is missing seller data, fetching...`);
              const productUserId = product.userId || product.user_id;
              const userData = await fetchUserData(productUserId);
              
              if (userData) {
                product.sellerData = userData;
                console.log(`Added seller data to fallback product ${product.id}:`, JSON.stringify(userData));
              } else {
                console.warn(`Failed to fetch seller data for fallback product ${product.id}`);
              }
            }
            
            return product;
          }));
          
          const standardizedProducts = enhancedFallbackProducts.map((product: any) => standardizeProductFormat(product));
          dispatch({ type: 'FETCH_USER_PRODUCTS_SUCCESS', payload: standardizedProducts });
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("Error fetching user products:", error);
      dispatch({
        type: 'FETCH_USER_PRODUCTS_FAILURE',
        payload: 'Failed to fetch user products',
      });
    }
  };

  // Function to fetch saved products
  const fetchSavedProducts = async (userId?: string): Promise<void> => {
    dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // Call API to get saved products
      const response = await api.get('/pg/products/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Saved products API response structure:", Object.keys(response.data));
      
      if (response?.data?.savedProducts && response?.data?.savedProductIds) {
        const { savedProducts, savedProductIds } = response.data;
        console.log(`ProductsContext: Received ${savedProducts.length} saved products`);
        
        // Standardize product format for each product
        const standardizedProducts = savedProducts.map((product: any) => standardizeProductFormat(product));
        
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('savedProductIds', JSON.stringify(savedProductIds));
        
        dispatch({ 
          type: 'FETCH_SAVED_PRODUCTS_SUCCESS', 
          payload: { products: standardizedProducts, productIds: savedProductIds }
        });
      } else {
        console.warn("No savedProducts field in API response");
        dispatch({ 
          type: 'FETCH_SAVED_PRODUCTS_SUCCESS', 
          payload: { products: [], productIds: [] }
        });
      }
    } catch (error) {
      console.error('Error fetching saved products:', error);
      dispatch({
        type: 'FETCH_SAVED_PRODUCTS_FAILURE',
        payload: 'Failed to fetch saved products',
      });
    }
  };

  // Function to fetch a product by ID
  const fetchProductById = async (productId: string) => {
    try {
      console.log(`Fetching product with ID: ${productId}`);
      
      // First, check if the product exists in our current state
      const existingProduct = state.products.find(product => product.id === productId) || 
                            state.userProducts.find(product => product.id === productId) ||
                            state.savedProducts.find(product => product.id === productId);
      
      if (existingProduct) {
        console.log('Product found in existing state');
        
        // Standardize the product format before setting as current product
        const formattedProduct = standardizeProductFormat(existingProduct);
        dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
        
        // Increment the view count when viewing an existing product
        incrementProductViews(productId);
        return;
      }
      
      // If not in our state, fetch from API
      try {
        const response = await api.get(`/pg/products/${productId}`);
        
        if (response.data && response.data.product) {
          console.log('Product fetched from API');
          
          // Standardize the product format
          const formattedProduct = standardizeProductFormat(response.data.product);
          dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
        } else {
          throw new Error('Product not found');
        }
      } catch (apiError) {
        console.error('Error fetching product from API:', apiError);
        console.error('Product not found in any source');
        throw new Error('Product not found in any source');
      }
    } catch (error) {
      console.error('Error in fetchProductById:', error);
    }
  };

  // Function to set the current product
  const setCurrentProduct = (product: ProductItem) => {
    // Standardize the product format before setting as current product
    const formattedProduct = standardizeProductFormat(product);
    dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
  };

  // Function to check if a product is saved
  const isProductSaved = (productId: string): boolean => {
    return state.savedProductIds.includes(productId);
  };

  // Function to save a product
  const saveProduct = async (productId: string): Promise<boolean> => {
    try {
      // Check if product is already saved
      if (state.savedProductIds.includes(productId)) {
        console.log(`Product ${productId} is already saved, ignoring duplicate request`);
        return true; // Already saved, so we consider this successful
      }

      console.log(`Sending save request for product: ${productId}`);
      const response = await api.post(`/products/${productId}/save`);
      
      console.log(`Response from /products/${productId}/save:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state with the saved product ID
        dispatch({
          type: 'SAVE_PRODUCT_SUCCESS',
          payload: { 
            productId, 
            savedProductIds: [...state.savedProductIds, productId] 
          }
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      dispatch({
        type: 'SAVE_PRODUCT_FAILURE',
        payload: 'Failed to save product',
      });
      
      return false;
    }
  };

  // Function to unsave a product
  const unsaveProduct = async (productId: string): Promise<boolean> => {
    try {
      // Check if product is not saved already
      if (!state.savedProductIds.includes(productId)) {
        console.log(`Product ${productId} is not saved, ignoring unsave request`);
        return true; // Not saved, so nothing to unsave
      }

      console.log(`Sending unsave request for product: ${productId}`);
      const response = await api.post(`/products/${productId}/unsave`);
      
      console.log(`Response from unsave product ${productId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state by removing the product ID from saved products
        dispatch({
          type: 'UNSAVE_PRODUCT_SUCCESS',
          payload: { 
            productId, 
            savedProductIds: state.savedProductIds.filter(id => id !== productId) 
          }
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error unsaving product:', error);
      
      dispatch({
        type: 'UNSAVE_PRODUCT_FAILURE',
        payload: 'Failed to unsave product',
      });
      
      return false;
    }
  };

  // Function to increment product views with API call
  const incrementProductViews = async (productId: string): Promise<void> => {
    try {
      // Call the API to increment product views
      await api.get(`/pg/products/${productId}`);
      
      // Update state locally
      dispatch({ 
        type: 'INCREMENT_PRODUCT_VIEWS', 
        payload: { productId }
      });
    } catch (error) {
      console.error('Error incrementing product views:', error);
      // We don't dispatch an error here to keep the UX smooth
    }
  };

  // Initialize products data from AsyncStorage after functions are defined
  useEffect(() => {
    const initProductsData = async () => {
      try {
        console.log('Initializing products data from storage');
        
        // Initialize saved products IDs from AsyncStorage
        const storedSavedProductIds = await AsyncStorage.getItem('savedProductIds');
        if (storedSavedProductIds) {
          // We only initialize the IDs from storage, the actual products will be fetched when needed
          const savedProductIds = JSON.parse(storedSavedProductIds);
          console.log(`Found ${savedProductIds.length} saved product IDs in storage`);
          dispatch({ 
            type: 'FETCH_SAVED_PRODUCTS_SUCCESS', 
            payload: { products: [], productIds: savedProductIds } 
          });
        } else {
          console.log('No saved products found in storage');
        }
        
        // Initialize user data to fetch user products
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.id) {
            console.log('Found user data in storage, user ID:', user.id);
            
            // Initialize both user products and saved products in parallel
            Promise.all([
              // Fetch user products
              fetchUserProducts(user.id).catch(error => {
                console.error('Error initializing user products:', error);
                return null;
              }),
              
              // Fetch saved products
              fetchSavedProducts(user.id).catch(error => {
                console.error('Error initializing saved products:', error);
                return null;
              })
            ]).then(([userProductsResult, savedProductsResult]) => {
              console.log('Initial data fetch complete:', {
                userProductsFetched: userProductsResult !== null,
                savedProductsFetched: savedProductsResult !== null
              });
            });
          } else {
            console.log('User data found but missing ID');
          }
        } else {
          console.log('No user data found in storage');
        }
      } catch (error) {
        console.error('Error initializing products data:', error);
      }
    };

    initProductsData();
  }, []);

  return (
    <ProductsContext.Provider
      value={{
        state,
        dispatch,
        fetchProducts,
        fetchUserProducts,
        fetchSavedProducts,
        fetchProductById,
        setCurrentProduct,
        saveProduct,
        unsaveProduct,
        isProductSaved,
        incrementProductViews,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

// Custom hook to use the products context
export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

export default ProductsContext;