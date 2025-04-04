import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';
import {processMediaFiles } from '../utils/mediaUtils';

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
    sellerData = {
      ...product.sellerData,
      avatar: product.sellerData.avatar || null  // Ensure avatar is explicitly included
    };
    console.log(`Using existing sellerData for product ${product.id}:`, JSON.stringify(sellerData));
  } else if (product.seller) {
    sellerData = {
      id: product.seller.id,
      username: product.seller.username || 'User',
      avatar: product.seller.avatar || null
    };
    console.log(`Created sellerData from seller for product ${product.id}:`, JSON.stringify(sellerData));
  } else if (product.userId || product.user_id) {
    const userId = product.userId || product.user_id;
    sellerData = {
      id: userId,
      username: 'User',
      avatar: null
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
  otherUserProducts: ProductItem[];
  feedProducts: ProductItem[];
  searchProducts: ProductItem[];
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
  | { type: 'FETCH_FEED_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_FEED_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_SEARCH_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_SEARCH_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_USER_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_USER_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_OTHER_USER_PRODUCTS_REQUEST' }
  | { type: 'FETCH_OTHER_USER_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_OTHER_USER_PRODUCTS_FAILURE'; payload: string }
  | { type: 'FETCH_SAVED_PRODUCTS_SUCCESS'; payload: { products: ProductItem[], productIds: string[] } }
  | { type: 'FETCH_SAVED_PRODUCTS_FAILURE'; payload: string }
  | { type: 'SET_CURRENT_PRODUCT'; payload: ProductItem }
  | { type: 'CLEAR_CURRENT_PRODUCT' }
  | { type: 'SAVE_PRODUCT_SUCCESS'; payload: { productId: string, savedProductIds: string[] } }
  | { type: 'UNSAVE_PRODUCT_SUCCESS'; payload: { productId: string, savedProductIds: string[] } }
  | { type: 'SAVE_PRODUCT_FAILURE'; payload: string }
  | { type: 'UNSAVE_PRODUCT_FAILURE'; payload: string }
  | { type: 'INCREMENT_PRODUCT_VIEWS'; payload: { productId: string } }
  | { type: 'DELETE_PRODUCT_SUCCESS'; payload: string }
  | { type: 'DELETE_PRODUCT_FAILURE'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_OTHER_USER_PRODUCTS' };

// Define initial state
const initialState: ProductsState = {
  products: [],
  otherUserProducts: [],
  feedProducts: [],
  searchProducts: [],
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
    case 'FETCH_OTHER_USER_PRODUCTS_REQUEST':
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
    case 'FETCH_OTHER_USER_PRODUCTS_SUCCESS':
      return {
        ...state,
        otherUserProducts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_OTHER_USER_PRODUCTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'CLEAR_OTHER_USER_PRODUCTS':
      return {
        ...state,
        otherUserProducts: [],
      };
    case 'FETCH_FEED_PRODUCTS_SUCCESS':
      return {
        ...state,
        feedProducts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_FEED_PRODUCTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_SEARCH_PRODUCTS_SUCCESS':
      return {
        ...state,
        searchProducts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_SEARCH_PRODUCTS_FAILURE':
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
      
      // Also update otherUserProducts
      const updatedOtherUserProducts = state.otherUserProducts.map(product => 
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
                           updatedUserProducts.find(product => product.id === productId) ||
                           updatedOtherUserProducts.find(product => product.id === productId);
        if (productToAdd) {
          newSavedProducts = [productToAdd, ...newSavedProducts];
        }
      }
      
      return {
        ...state,
        products: updatedProducts,
        userProducts: updatedUserProducts,
        otherUserProducts: updatedOtherUserProducts,
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
      
      // Also update otherUserProducts
      const updatedOtherUserProducts = state.otherUserProducts.map(product => 
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
        otherUserProducts: updatedOtherUserProducts,
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
        otherUserProducts: state.otherUserProducts.map(product =>
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
    case 'DELETE_PRODUCT_SUCCESS':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
        userProducts: state.userProducts.filter(product => product.id !== action.payload),
        otherUserProducts: state.otherUserProducts.filter(product => product.id !== action.payload),
        savedProducts: state.savedProducts.filter(product => product.id !== action.payload),
        savedProductIds: state.savedProductIds.filter(id => id !== action.payload),
        currentProduct: state.currentProduct?.id === action.payload ? null : state.currentProduct,
        loading: false,
        error: null,
      };
    case 'DELETE_PRODUCT_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
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
  fetchFeedProducts: (category?: string) => Promise<void>;
  fetchSearchProducts: (query: string) => Promise<void>;
  fetchUserProducts: (userId: string) => Promise<void>;
  fetchOtherUserProducts: (userId: string) => Promise<ProductItem[]>;
  clearOtherUserProducts: () => void;
  fetchSavedProducts: (userId?: string) => Promise<void>;
  fetchProductById: (productId: string | any) => Promise<void>;
  setCurrentProduct: (product: ProductItem) => void;
  saveProduct: (productId: string) => Promise<boolean>;
  unsaveProduct: (productId: string) => Promise<boolean>;
  isProductSaved: (productId: string) => boolean;
  incrementProductViews: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<boolean>;
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
    const response = await api.get(`/upload/products/${userId}`);
    
    if (response?.data?.success && response.data.products) {
      const products = response.data.products;
      console.log(`ProductsContext: Received ${products.length} user products`);
      
      // Standardize products with the seller data already included from backend
      const standardizedProducts = products.map((product: any) =>
        standardizeProductFormat(product)
      );
      
      dispatch({ type: 'FETCH_USER_PRODUCTS_SUCCESS', payload: standardizedProducts });
    } else {
      // If the response is valid but doesn't contain the expected data format
      console.warn('Response did not contain expected data format:', response.data);
      
      // Try to fall back to the main products endpoint as a last resort
      try {
        const fallbackResponse = await api.get('/pg/products');
        let userProducts = [];

        if (Array.isArray(fallbackResponse.data)) {
          userProducts = fallbackResponse.data.filter((product: any) => product.userId === userId);
        } else if (fallbackResponse.data.products && Array.isArray(fallbackResponse.data.products)) {
          userProducts = fallbackResponse.data.products.filter((product: any) => product.userId === userId);
        }

        console.log(`ProductsContext: Found ${userProducts.length} products with fallback to general products endpoint`);

        // Standardize fallback products
        const standardizedProducts = userProducts.map((product: any) =>
          standardizeProductFormat(product)
        );

        dispatch({ type: 'FETCH_USER_PRODUCTS_SUCCESS', payload: standardizedProducts });
      } catch (fallbackError) {
        console.error('Error in fallback products fetch:', fallbackError);
        throw new Error('Failed to fetch user products with both primary and fallback methods');
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
      console.log("ProductsContext: Starting to fetch saved products");
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.warn("ProductsContext: No auth token found for saved products fetch");
        throw new Error('No auth token found');
      }

      // Call API to get saved products
      console.log("ProductsContext: Calling API to fetch saved products");
      const response = await api.get('/pg/products/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("ProductsContext: Saved products API response received");
      console.log("ProductsContext: Response status:", response.status);
      console.log("ProductsContext: Response data keys:", Object.keys(response.data));
      
      // Handle different possible response structures
      let savedProducts = [];
      let savedProductIds = [];
      
      if (response?.data?.products) {
        // Handle response format: { products: [...], count: X }
        savedProducts = response.data.products;
        console.log(`ProductsContext: Found ${savedProducts.length} products in response.data.products`);
        
        // Extract IDs from products if not provided separately
        savedProductIds = savedProducts.map((product: any) => product.id);
      } else if (response?.data?.savedProducts) {
        // Handle response format: { savedProducts: [...], savedProductIds: [...] }
        savedProducts = response.data.savedProducts;
        savedProductIds = response.data.savedProductIds || savedProducts.map((product: any) => product.id);
        console.log(`ProductsContext: Found ${savedProducts.length} products in response.data.savedProducts`);
      } else if (Array.isArray(response.data)) {
        // Handle direct array response
        savedProducts = response.data;
        savedProductIds = savedProducts.map((product: any) => product.id);
        console.log(`ProductsContext: Found ${savedProducts.length} products in direct array response`);
      }
      
      // Log what we found
      console.log(`ProductsContext: Final saved products count: ${savedProducts.length}`);
      console.log(`ProductsContext: Final saved product IDs: ${JSON.stringify(savedProductIds)}`);
      
      // Standardize product format for each product
      const standardizedProducts = savedProducts.map((product: any) => {
        const formatted = standardizeProductFormat(product);
        formatted.isSaved = true; // Explicitly mark as saved
        return formatted;
      });
      
      // Dispatch success action with products and IDs
      dispatch({ 
        type: 'FETCH_SAVED_PRODUCTS_SUCCESS', 
        payload: { products: standardizedProducts, productIds: savedProductIds }
      });
    } catch (error) {
      console.error('Error fetching saved products:', error);
      dispatch({
        type: 'FETCH_SAVED_PRODUCTS_FAILURE',
        payload: 'Failed to fetch saved products',
      });
    }
  };

  // Function to fetch a product by ID
  const fetchProductById = async (productId: string | any) => {
    try {
      // Ensure we have a string ID, not an object
      const id = typeof productId === 'string' ? productId : 
                 (productId && typeof productId === 'object' && productId.id) ? productId.id : productId;
      
      console.log(`Fetching product with ID: ${id}`);
      
      if (!id) {
        console.error('Invalid product ID:', productId);
        throw new Error('Invalid product ID');
      }
      
      // If not in our state, fetch from API
      try {
        const response = await api.get(`/pg/products/${id}`);
        
        if (response.data && response.data.product) {
          console.log('Product fetched from API');
          
          // Standardize the product format
          const formattedProduct = standardizeProductFormat(response.data.product);
          
          // Backend already incremented the view count in the database.
          // Decrement it locally before setting the state so we can increment it
          // back using the INCREMENT_PRODUCT_VIEWS action for consistency
          if (formattedProduct.views > 0) {
            formattedProduct.views -= 1;
          }
          
          // Set the current product with the decremented view count
          dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
          
          // Now increment the view count locally to match the backend count
          dispatch({ 
            type: 'INCREMENT_PRODUCT_VIEWS', 
            payload: { productId: id }
          });
        } else {
          throw new Error('Product not found');
        }
      } catch (apiError) {
        console.error('Error fetching product from API:', apiError);
        
        // Try fallback endpoint as a last resort
        try {
          const fallbackResponse = await api.get(`/upload/product/${id}`);
          
          if (fallbackResponse.data && fallbackResponse.data.product) {
            console.log('Product fetched from fallback API endpoint');
            
            // Standardize the product format
            const formattedProduct = standardizeProductFormat(fallbackResponse.data.product);
            
            // Same approach for fallback: decrement before setting, then increment
            if (formattedProduct.views > 0) {
              formattedProduct.views -= 1;
            }
            
            // Set the current product with the decremented view count
            dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
            
            // Increment view count locally to match backend
            dispatch({ 
              type: 'INCREMENT_PRODUCT_VIEWS', 
              payload: { productId: id }
            });
            return;
          }
        } catch (fallbackError) {
          console.error('Error fetching product from fallback API:', fallbackError);
        }
        
        console.error('Product not found in any source');
        throw new Error('Product not found in any source');
      }
    } catch (error) {
      console.error('Error in fetchProductById:', error);
    }
  };

  // Function to set the current product
  const setCurrentProduct = (product: ProductItem) => {
    try {
      // Try to fetch the full product details
      fetchProductById(product.id).catch(error => {
        console.log('Error fetching product details, using standardized format:', error);
        // If fetch fails, still standardize the product format and update state
        const formattedProduct = standardizeProductFormat(product);
        dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
      });
    } catch (error) {
      console.error('Error in setCurrentProduct:', error);
      // Ensure we still set a current product even if there's an error
      const formattedProduct = standardizeProductFormat(product);
      dispatch({ type: 'SET_CURRENT_PRODUCT', payload: formattedProduct });
    }
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
      const response = await api.post(`/pg/products/${productId}/save`);
      
      console.log(`Response from /pg/products/${productId}/save:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state with the saved product ID
        dispatch({
          type: 'SAVE_PRODUCT_SUCCESS',
          payload: { 
            productId, 
            savedProductIds: response.data.savedProductIds || [...state.savedProductIds, productId] 
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
      const response = await api.delete(`/pg/products/${productId}/save`);
      
      console.log(`Response from unsave product ${productId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state by removing the product ID from saved products
        dispatch({
          type: 'UNSAVE_PRODUCT_SUCCESS',
          payload: { 
            productId, 
            savedProductIds: response.data.savedProductIds || state.savedProductIds.filter(id => id !== productId) 
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

  // Function to increment product views in local state only
  const incrementProductViews = async (productId: string): Promise<void> => {
    try {
      // Just update the local state without API call
      // The backend already increments the count in the database when fetching the product
      dispatch({ 
        type: 'INCREMENT_PRODUCT_VIEWS', 
        payload: { productId }
      });
    } catch (error) {
      console.error('Error incrementing product views in local state:', error);
    }
  };

  // Function to delete a product
  const deleteProduct = async (productId: string): Promise<boolean> => {
    try {
      console.log(`Attempting to delete product: ${productId}`);
      const response = await api.delete(`/upload/product/${productId}`);
      
      console.log(`Response from delete product ${productId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state by removing the product
        dispatch({
          type: 'DELETE_PRODUCT_SUCCESS',
          payload: productId
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      
      dispatch({
        type: 'DELETE_PRODUCT_FAILURE',
        payload: 'Failed to delete product'
      });
      
      return false;
    }
  };

  // Function to fetch feed products - can be filtered by category
  const fetchFeedProducts = async (category?: string) => {
    dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
    try {
      // Build the URL with optional category filter
      let url = '/pg/products/feed';
      if (category && category !== 'All') {
        url += `?category=${encodeURIComponent(category)}`;
      }
      
      console.log(`ProductsContext: Fetching feed products with URL: ${url}`);
      const response = await api.get(url);
      let products = [];
      
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products;
      }
      
      console.log(`ProductsContext: Retrieved ${products.length} feed products`);
      const standardizedProducts = products.map((product: any) => standardizeProductFormat(product));
      
      // Update saved status for each product
      const productsWithSavedStatus = standardizedProducts.map((product: ProductItem) => ({
        ...product,
        isSaved: state.savedProductIds.includes(product.id)
      }));
      
      dispatch({ type: 'FETCH_FEED_PRODUCTS_SUCCESS', payload: productsWithSavedStatus });
    } catch (error) {
      console.error('Error fetching feed products:', error);
      dispatch({
        type: 'FETCH_FEED_PRODUCTS_FAILURE',
        payload: 'Failed to fetch feed products',
      });
    }
  };

  // Function to fetch search products
  const fetchSearchProducts = async (query: string) => {
    if (!query || query.trim() === '') {
      // If query is empty, set empty search results
      dispatch({ type: 'FETCH_SEARCH_PRODUCTS_SUCCESS', payload: [] });
      return;
    }
    
    dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
    try {
      const trimmedQuery = query.trim().toLowerCase();
      console.log(`ProductsContext: Searching products with query: ${trimmedQuery}`);
      
      // Call search API endpoint
      const response = await api.get(`/pg/products/search?q=${encodeURIComponent(trimmedQuery)}`);
      let products = [];
      
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products;
      }
      
      console.log(`ProductsContext: Found ${products.length} products matching search query`);
      const standardizedProducts = products.map((product: any) => standardizeProductFormat(product));
      
      // Update saved status for each product
      const productsWithSavedStatus = standardizedProducts.map((product: ProductItem) => ({
        ...product,
        isSaved: state.savedProductIds.includes(product.id)
      }));
      
      dispatch({ type: 'FETCH_SEARCH_PRODUCTS_SUCCESS', payload: productsWithSavedStatus });
    } catch (error) {
      console.error('Error searching products:', error);
      dispatch({
        type: 'FETCH_SEARCH_PRODUCTS_FAILURE',
        payload: 'Failed to search products',
      });
    }
  };

  // Function to fetch other user's products
  const fetchOtherUserProducts = async (userId: string): Promise<ProductItem[]> => {
    if (!userId) {
      console.error('ProductsContext: No userId provided for fetchOtherUserProducts');
      return [];
    }

    dispatch({ type: 'FETCH_OTHER_USER_PRODUCTS_REQUEST' });

    try {
      console.log(`ProductsContext: Fetching products for other user ${userId}`);
      const response = await api.get(`/upload/products/${userId}`);
      
      if (response?.data?.success && response.data.products) {
        const products = response.data.products;
        console.log(`ProductsContext: Received ${products.length} products for other user ${userId}`);

        // Standardize the product format
        const standardizedProducts = products.map((product: any) => {
          console.log(`ProductsContext: Standardizing other user product ${product.id}`);
          return standardizeProductFormat(product);
        });
        
        // Update saved status for each product using the current savedProductIds
        const productsWithSavedStatus = standardizedProducts.map((product: ProductItem) => ({
          ...product,
          isSaved: state.savedProductIds.includes(product.id)
        }));
        
        console.log(`ProductsContext: Formatted ${standardizedProducts.length} other user products with proper types`);
        // Only update otherUserProducts state, not any other product collections
        dispatch({ type: 'FETCH_OTHER_USER_PRODUCTS_SUCCESS', payload: productsWithSavedStatus });
        return productsWithSavedStatus;
      } else {
        // Fallback to general products and filter by userId
        try {
          console.log(`ProductsContext: Using fallback method to fetch other user products`);
          const fallbackResponse = await api.get('/pg/products');
          let userProducts = [];

          if (Array.isArray(fallbackResponse.data)) {
            userProducts = fallbackResponse.data.filter((product: any) => product.userId === userId);
          } else if (fallbackResponse.data.products && Array.isArray(fallbackResponse.data.products)) {
            userProducts = fallbackResponse.data.products.filter((product: any) => product.userId === userId);
          }
  
          console.log(`ProductsContext: Found ${userProducts.length} products with fallback for other user ${userId}`);

          // Standardize the products
          const standardizedProducts = userProducts.map((product: any) => standardizeProductFormat(product));
          
          // Update saved status for each product
          const productsWithSavedStatus = standardizedProducts.map((product: ProductItem) => ({
            ...product,
            isSaved: state.savedProductIds.includes(product.id)
          }));
          
          console.log(`ProductsContext: Formatted ${standardizedProducts.length} fallback other user products`);
          // Only update otherUserProducts state, not any other product collections
          dispatch({ type: 'FETCH_OTHER_USER_PRODUCTS_SUCCESS', payload: productsWithSavedStatus });
          return productsWithSavedStatus;
        } catch (fallbackError) {
          console.error('ProductsContext: Error in fallback fetch for other user products:', fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("ProductsContext: Error fetching other user products:", error);
      dispatch({
        type: 'FETCH_OTHER_USER_PRODUCTS_FAILURE',
        payload: 'Failed to fetch other user products',
      });
      return [];
    }
  };

  // Function to clear other user products
  const clearOtherUserProducts = () => {
    dispatch({ type: 'CLEAR_OTHER_USER_PRODUCTS' });
  };

  // Initialize products data from database only
  useEffect(() => {
    const initProductsData = async () => {
      try {
        console.log('Initializing products data from database');
        
        // Initialize user data for fetching user-specific products
        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        
        // Fetch general products always
        fetchProducts().catch(error => {
          console.error('Error initializing general products:', error);
        });
        
        // If user is logged in, fetch user-specific data
        if (user && user.id) {
          console.log('Found user data in storage, user ID:', user.id);
          
          // Fetch user products and saved products in parallel
          Promise.all([
            fetchUserProducts(user.id).catch(error => {
              console.error('Error initializing user products:', error);
              return null;
            }),
            fetchSavedProducts(user.id).catch(error => {
              console.error('Error initializing saved products:', error);
              return null;
            })
          ]).then(([userProductsResult, savedProductsResult]) => {
            console.log('Initial user data fetch complete:', {
              userProductsFetched: userProductsResult !== null,
              savedProductsFetched: savedProductsResult !== null
            });
          });
        }
      } catch (error) {
        console.error('Error in products initialization:', error);
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
        fetchFeedProducts,
        fetchSearchProducts,
        fetchUserProducts,
        fetchOtherUserProducts,
        clearOtherUserProducts,
        fetchSavedProducts,
        fetchProductById,
        setCurrentProduct,
        saveProduct,
        unsaveProduct,
        isProductSaved,
        incrementProductViews,
        deleteProduct,
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