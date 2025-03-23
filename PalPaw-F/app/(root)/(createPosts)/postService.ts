import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define interfaces
export interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  isExisting?: boolean; // Flag to indicate if media is already uploaded
}

// Define location coordinates interface
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface PostData {
  title: string;
  content: string;
  media: Media[];
  location?: string;
  locationCoordinates?: LocationCoordinates;
  tags?: string[];
  postType: 'pet' | 'market';
  price?: number;
  category?: string;
  shippingOptions?: string[];
  mediaToDelete?: string[]; // Array of media URLs to delete during update
}

// Pet tag category interface
export interface PetTagCategory {
  name: string;
  tags: string[];
  color: string;
}

// Base URL for the API
const API_BASE_URL = 'http://192.168.2.11:5001/api'; // Updated to match the original port

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
    console.log('Title before appending:', data.title);
    formData.append('title', String(data.title.trim()));
    formData.append('content', data.content);
    formData.append('postType', data.postType);
    
    // Log FormData (approximate, since FormData can't be directly logged)
    console.log('FormData entries:');
    for (const pair of (formData as any).entries()) {
      console.log(pair[0], pair[1]);
    }
    
    // Add optional fields if they exist
    if (data.location) formData.append('location', data.location);
    if (data.price) formData.append('price', data.price.toString());
    if (data.category) formData.append('category', data.category);
    
    // Add location coordinates if available
    if (data.locationCoordinates) {
      formData.append('latitude', data.locationCoordinates.latitude.toString());
      formData.append('longitude', data.locationCoordinates.longitude.toString());
    }
    
    // Add arrays as JSON strings
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    
    if (data.shippingOptions && data.shippingOptions.length > 0) {
      formData.append('shippingOptions', JSON.stringify(data.shippingOptions));
    }
    
    // Add media files
    data.media.forEach((item, index) => {
      formData.append('media', mediaToFormData(item, index) as any);
    });
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    // Make the API request
    console.log('Making POST request to:', `${API_BASE_URL}/upload/post`);
    const response = await fetch(`${API_BASE_URL}/upload/post`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
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
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

/**
 * Get pet tag suggestions organized by categories
 * In a real app, this would fetch from the API
 */
export const getPetTagSuggestions = async (): Promise<PetTagCategory[]> => {
  // This would be an API call in a real implementation
  // For now we'll use mock data
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      name: 'Species',
      tags: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Guinea Pig', 'Turtle'],
      color: '#8B5CF6' // Purple
    },
    {
      name: 'Breeds',
      tags: ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 
             'Beagle', 'Siamese', 'Persian', 'Maine Coon', 'Bengal', 'Scottish Fold'],
      color: '#EC4899' // Pink
    },
    {
      name: 'Characteristics',
      tags: ['Playful', 'Calm', 'Friendly', 'Energetic', 'Shy', 'Loyal', 'Intelligent', 'Protective'],
      color: '#F59E0B' // Amber
    },
    {
      name: 'Activities',
      tags: ['Walking', 'Hiking', 'Swimming', 'Agility', 'Fetch', 'Training', 'Grooming', 'Cuddling'],
      color: '#10B981' // Emerald
    },
    {
      name: 'Age',
      tags: ['Puppy', 'Kitten', 'Young', 'Adult', 'Senior'],
      color: '#3B82F6' // Blue
    }
  ];
};

/**
 * Updates an existing post with the given data
 * @param id Post ID to update
 * @param data Post data including title, content, and media
 * @returns Promise with the response from the server
 */
export const updatePost = async (
  id: string,
  data: PostData
): Promise<{ success: boolean; message: string; post?: any }> => {
  try {
    const formData = new FormData();
    
    // Add base post data
    if (data.title) formData.append('title', String(data.title.trim()));
    if (data.content !== undefined) formData.append('content', data.content);
    
    // Add optional fields if they exist
    if (data.location !== undefined) formData.append('location', data.location);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.category) formData.append('category', data.category);
    
    // Add location coordinates if available
    if (data.locationCoordinates) {
      formData.append('latitude', data.locationCoordinates.latitude.toString());
      formData.append('longitude', data.locationCoordinates.longitude.toString());
    }
    
    // Add arrays as JSON strings
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    
    if (data.shippingOptions && data.shippingOptions.length > 0) {
      formData.append('shippingOptions', JSON.stringify(data.shippingOptions));
    }
    
    // Add media files to be deleted if specified
    if (data.mediaToDelete && data.mediaToDelete.length > 0) {
      formData.append('mediaToDelete', JSON.stringify(data.mediaToDelete));
    }
    
    // Add new media files
    if (data.media) {
      const newMedia = data.media.filter(item => !item.isExisting);
      newMedia.forEach((item, index) => {
        formData.append('media', mediaToFormData(item, index) as any);
      });
    }
    
    // Get auth token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
    // Make the API request
    console.log(`Making PUT request to: ${API_BASE_URL}/posts/${id}`);
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    if (response.ok) {
      return { 
        success: true, 
        message: 'Post updated successfully!',
        post: responseData.post
      };
    } else {
      return { 
        success: false, 
        message: responseData.message || 'Failed to update post'
      };
    }
  } catch (error) {
    console.error('Error updating post:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};