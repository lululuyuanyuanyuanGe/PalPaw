import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getApiBaseUrl } from '../../../utils/mediaUtils';

// Define interfaces
export interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  isExisting?: boolean; // Flag to indicate if media is already uploaded
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  media: Media[];
  category?: string;
  subcategory?: string;
  condition?: string;
  shippingOptions?: string[];
  quantity?: number;
  tags?: string[];
  mediaToDelete?: string[]; // URLs of media to delete during update
}

// Base URL for the API
const API_BASE_URL = getApiBaseUrl()+'/api';

/**
 * Basic check to estimate if an image might be too large
 * @param uri Image URI
 * @returns Boolean indicating if special handling is needed
 */
const shouldProcessImage = async (uri: string): Promise<boolean> => {
  try {
    // Try to get file info - this will work on the file system
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    // If we can get the size and it's large, return true
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > 2 * 1024 * 1024) {
      console.log(`Image may be too large (${Math.round(fileInfo.size / 1024 / 1024)}MB)`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking image size:', error);
    return false;
  }
};

/**
 * Converts a Media object to a FormData-compatible object
 */
const mediaToFormData = (item: Media, index: number) => {
  // Get file extension based on uri or type
  const fileExtension = item.type === 'image' 
    ? (item.uri.match(/\.([^.]+)$/) || [, 'jpg'])[1] 
    : 'mp4';
  
  // Get filename from uri or generate a unique name
  const fileName = item.uri.split('/').pop() || `product_media_${index}.${fileExtension}`;
  
  // Create object with properties needed for FormData
  return {
    uri: Platform.OS === 'ios' ? item.uri.replace('file://', '') : item.uri,
    type: item.type === 'image' ? 
      (fileExtension === 'png' ? 'image/png' : 
       fileExtension === 'webp' ? 'image/webp' : 'image/jpeg') : 
      'video/mp4',
    name: fileName
  };
};

/**
 * Creates a new product with the given data
 * @param data Product data including name, description, price, and media
 * @returns Promise with the response from the server
 */
export const createProduct = async (data: ProductData): Promise<{ success: boolean; message: string; productId?: string; warning?: string }> => {
  try {
    // Create a fresh FormData object
    const formData = new FormData();
    
    console.log('Creating product with data:', {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      condition: data.condition,
      mediaCount: data.media?.length || 0
    });
    
    // Add base product data
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    
    // Add optional fields if they exist
    if (data.category) formData.append('category', data.category);
    if (data.subcategory) formData.append('subcategory', data.subcategory);
    if (data.condition) formData.append('condition', data.condition);
    if (data.quantity) formData.append('quantity', data.quantity.toString());
    
    // Add arrays as JSON strings
    if (data.shippingOptions && data.shippingOptions.length > 0) {
      formData.append('shippingOptions', JSON.stringify(data.shippingOptions));
    }
    
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    
    // Add media files using the same pattern as createPost
    if (data.media && data.media.length > 0) {
      const mediaCount = Math.min(data.media.length, 10); // Limit to 10 media itemsa
      console.log(`Processing ${mediaCount} media items (limited to 10 max)`);
      
      // Add media files
      data.media.forEach((item, index) => {
        if (!item || !item.uri) {
          console.log(`Skipping invalid media item at index ${index}`);
          return;
        }
        
        formData.append('media', mediaToFormData(item, index) as any);
      });
    } else {
      console.log('No media to upload');
    }
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    console.log('Auth token retrieved:', token ? 'Yes' : 'No');
    
    // Use the upload endpoint that matches backend implementation
    console.log('Making product create request to:', `${API_BASE_URL}/upload/products/upload`);
    
    // Make the API request with the same pattern as createPost
    const response = await fetch(`${API_BASE_URL}/upload/products/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Do not set Content-Type header - it will be set automatically with the boundary
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Create product response:', responseData);
    
    if (response.ok) {
      return { 
        success: true, 
        message: responseData.message || 'Product created successfully!',
        productId: responseData.productId,
        warning: responseData.warning
      };
    } else {
      return { 
        success: false, 
        message: responseData.message || 'Failed to create product'
      };
    }
  } catch (error) {
    console.error('Error creating product:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Updates an existing product with the given data
 * @param id Product ID to update
 * @param data Updated product data
 * @returns Promise with the response from the server
 */
export const updateProduct = async (
  id: string,
  data: ProductData
): Promise<{ success: boolean; message: string; product?: any }> => {
  try {
    const formData = new FormData();
    
    // Add base product data
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.price) formData.append('price', data.price.toString());
    
    // Add optional fields if they exist
    if (data.category) formData.append('category', data.category);
    if (data.subcategory) formData.append('subcategory', data.subcategory);
    if (data.condition) formData.append('condition', data.condition);
    if (data.quantity) formData.append('quantity', data.quantity.toString());
    
    // Add arrays as JSON strings
    if (data.shippingOptions && data.shippingOptions.length > 0) {
      formData.append('shippingOptions', JSON.stringify(data.shippingOptions));
    }
    
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    
    // Add media files to be deleted if specified
    if (data.mediaToDelete && data.mediaToDelete.length > 0) {
      formData.append('mediaToDelete', JSON.stringify(data.mediaToDelete));
    }
    
    // Add new media files
    const newMedia = data.media.filter(item => !item.isExisting);
    newMedia.forEach((item, index) => {
      formData.append('images', mediaToFormData(item, index) as any);
    });
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    console.log(`Making product update request to: ${API_BASE_URL}/products/${id}`);
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    const responseData = await response.json();
    console.log('Update product response:', responseData);
    
    if (response.ok) {
      return { 
        success: true, 
        message: 'Product updated successfully!',
        product: responseData.product
      };
    } else {
      return { 
        success: false, 
        message: responseData.message || 'Failed to update product'
      };
    }
  } catch (error) {
    console.error('Error updating product:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Creates a draft product that is saved locally
 * @param data Product data
 * @returns Promise with the local draft ID
 */
export const saveDraft = async (data: ProductData): Promise<{ success: boolean; draftId?: string }> => {
  try {
    // In a real implementation, this would save to local storage or a local database
    // For this example, we're just simulating success
    const draftId = `product_draft_${Date.now()}`;
    
    // Here you would implement AsyncStorage, sqlite, or another local storage solution
    // await AsyncStorage.setItem(draftId, JSON.stringify(data));
    
    return { success: true, draftId };
  } catch (error) {
    console.error('Error saving draft:', error);
    return { success: false };
  }
};

/**
 * Gets available product categories
 * @returns Promise with an array of category objects
 */
export const getProductCategories = async (): Promise<{ id: string; name: string }[]> => {
  try {
    // In a real implementation, this would fetch from the API
    // For this example, we're just returning mock data
    return [
      { id: '1', name: 'Pet Food' },
      { id: '2', name: 'Toys' },
      { id: '3', name: 'Accessories' },
      { id: '4', name: 'Grooming' },
      { id: '5', name: 'Health & Wellness' },
      { id: '6', name: 'Training' },
      { id: '7', name: 'Beds & Furniture' },
      { id: '8', name: 'Travel & Outdoors' }
    ];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}; 