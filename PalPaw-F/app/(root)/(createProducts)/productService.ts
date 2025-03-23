import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define interfaces
export interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
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
}

// Base URL for the API
const API_BASE_URL = 'http://192.168.2.11:5001/api'; // Updated to match the local development server

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
    type: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
    name: fileName
  };
};

/**
 * Creates a new product with the given data
 * @param data Product data including name, description, price, and media
 * @returns Promise with the response from the server
 */
export const createProduct = async (data: ProductData): Promise<{ success: boolean; message: string; productId?: string }> => {
  try {
    const formData = new FormData();
    
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
    
    // Add media files
    data.media.forEach((item, index) => {
      formData.append('media', mediaToFormData(item, index) as any);
    });
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      return { 
        success: true, 
        message: 'Product created successfully!',
        productId: responseData.productId
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