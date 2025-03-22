import { Platform } from 'react-native';

// Define interfaces
export interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

export interface PostData {
  title: string;
  content: string;
  media: Media[];
  location?: string;
  petTags?: string[];
  postType: 'pet' | 'market';
  price?: number;
  category?: string;
  shippingOptions?: string[];
}

// Base URL for the API
const API_BASE_URL = 'https://api.palpaw.com'; // Replace with your actual API base URL

/**
 * Converts a Media object to a FormData-compatible object
 */
const mediaToFormData = (item: Media, index: number) => {
  // Get file extension based on uri or type
  const fileExtension = item.type === 'image' 
    ? (item.uri.match(/\.([^.]+)$/) || [, 'jpg'])[1] 
    : 'mp4';
  
  // Get filename from uri or generate a unique name
  const fileName = item.uri.split('/').pop() || `media_${index}.${fileExtension}`;
  
  // Create object with properties needed for FormData
  return {
    uri: Platform.OS === 'ios' ? item.uri.replace('file://', '') : item.uri,
    type: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
    name: fileName
  };
};

/**
 * Creates a new post with the given data
 * @param data Post data including title, content, and media
 * @returns Promise with the response from the server
 */
export const createPost = async (data: PostData): Promise<{ success: boolean; message: string; postId?: string }> => {
  try {
    const formData = new FormData();
    
    // Add base post data
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('postType', data.postType);
    
    // Add optional fields if they exist
    if (data.location) formData.append('location', data.location);
    if (data.price) formData.append('price', data.price.toString());
    if (data.category) formData.append('category', data.category);
    
    // Add arrays as JSON strings
    if (data.petTags && data.petTags.length > 0) {
      formData.append('petTags', JSON.stringify(data.petTags));
    }
    
    if (data.shippingOptions && data.shippingOptions.length > 0) {
      formData.append('shippingOptions', JSON.stringify(data.shippingOptions));
    }
    
    // Add media files
    data.media.forEach((item, index) => {
      formData.append(`media[${index}]`, mediaToFormData(item, index) as any);
    });
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${authToken}`
      },
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      return { 
        success: true, 
        message: 'Post created successfully!',
        postId: responseData.postId
      };
    } else {
      return { 
        success: false, 
        message: responseData.message || 'Failed to create post'
      };
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Creates a draft post that is saved locally
 * @param data Post data
 * @returns Promise with the local draft ID
 */
export const saveDraft = async (data: PostData): Promise<{ success: boolean; draftId?: string }> => {
  try {
    // In a real implementation, this would save to local storage or a local database
    // For this example, we're just simulating success
    const draftId = `draft_${Date.now()}`;
    
    // Here you would implement AsyncStorage, sqlite, or another local storage solution
    // await AsyncStorage.setItem(draftId, JSON.stringify(data));
    
    return { success: true, draftId };
  } catch (error) {
    console.error('Error saving draft:', error);
    return { success: false };
  }
};

/**
 * Uploads a single media file to get its URL before creating the full post
 * Useful for progressive uploads
 */
export const uploadMedia = async (media: Media): Promise<{ success: boolean; url?: string }> => {
  try {
    const formData = new FormData();
    formData.append('media', mediaToFormData(media, 0) as any);
    
    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      return { success: true, url: responseData.url };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error('Error uploading media:', error);
    return { success: false };
  }
}; 