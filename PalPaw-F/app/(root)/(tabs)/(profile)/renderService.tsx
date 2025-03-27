import api, { getUserProducts, getUserPosts } from "@/utils/apiClient";
import { PostItem, ProductItem } from "./types";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePosts } from "@/context";

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Format image URL function
export const formatImageUrl = (path: string | undefined): string => {
  if (!path) {
    return 'https://robohash.org/default?set=set4&bgset=bg1';
  }
  
  // Log the path for debugging
  console.log('Formatting URL for path:', path);
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path has a leading slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  return `${API_BASE_URL}${path}`;
};

// Helper function to check if URL is a video
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check common video extensions
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
  const lowercasedUrl = url.toLowerCase();
  
  for (const ext of videoExtensions) {
    if (lowercasedUrl.endsWith(ext)) {
      console.log('Detected video URL by extension:', url);
      return true;
    }
  }
  
  // Also check if the URL contains a video indicator
  const isVideo = lowercasedUrl.includes('/video/') || 
         lowercasedUrl.includes('video=true') || 
         lowercasedUrl.includes('type=video');
         
  if (isVideo) {
    console.log('Detected video URL by indicator:', url);
  }
  
  return isVideo;
};

// Helper function to process media files and select appropriate thumbnail
const processMediaFiles = (mediaArray: any[]): { imageUrl: string, mediaType: 'image' | 'video', mediaUrl: string, thumbnailUri?: string } => {
  let imageUrl = '';
  let mediaType: 'image' | 'video' = 'image';
  let mediaUrl = '';
  let thumbnailUri = '';
  
  console.log('Processing media array:', JSON.stringify(mediaArray));
  
  // Default to placeholder if no media
  imageUrl = 'https://robohash.org/default?set=set4&bgset=bg1';
  
  if (!mediaArray || !Array.isArray(mediaArray) || mediaArray.length === 0) {
    console.log('No media found, using default placeholder');
    return { imageUrl, mediaType, mediaUrl };
  }
  
  // First, try to find an image to use as thumbnail
  const firstImage = mediaArray.find(item => {
    if (typeof item === 'object' && item !== null && item.type) {
      return item.type === 'image';
    } else if (typeof item === 'string') {
      return !isVideoUrl(item);
    }
    return false;
  });
  
  if (firstImage) {
    console.log('Found image for thumbnail:', 
      typeof firstImage === 'object' ? JSON.stringify(firstImage) : firstImage);
  }
  
  // Now look for videos
  const videoMedia = mediaArray.find(item => {
    if (typeof item === 'object' && item !== null && item.type) {
      return item.type === 'video';
    } else if (typeof item === 'string') {
      return isVideoUrl(item);
    }
    return false;
  });
  
  if (videoMedia) {
    console.log('Found video media:', 
      typeof videoMedia === 'object' ? JSON.stringify(videoMedia) : videoMedia);
  }
  
  // If we found a video, use it for the mediaUrl and set type to video
  if (videoMedia) {
    mediaType = 'video';
    
    if (typeof videoMedia === 'object' && videoMedia !== null) {
      // Make sure the URL is an absolute path
      mediaUrl = formatImageUrl(videoMedia.url);
      console.log('Using video URL from object:', mediaUrl);
      
      // Check if video media has a thumbnail field first
      if (videoMedia.thumbnail) {
        thumbnailUri = formatImageUrl(videoMedia.thumbnail);
        imageUrl = thumbnailUri;
        console.log('Using video thumbnail from object:', thumbnailUri);
      }
      // If no thumbnail but we found an image, use that for the thumbnail
      else if (firstImage) {
        if (typeof firstImage === 'object' && firstImage !== null) {
          imageUrl = formatImageUrl(firstImage.url);
          console.log('Using image URL from object as thumbnail:', imageUrl);
        } else if (typeof firstImage === 'string') {
          imageUrl = formatImageUrl(firstImage);
          console.log('Using image string as thumbnail:', imageUrl);
        }
      } else {
        // If no image is available, we still need to set the imageUrl
        // but we'll set it to a placeholder instead of the video URL
        // since using the video URL directly doesn't work well as a thumbnail
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
        console.log('No image found for thumbnail, using placeholder');
      }
    } else if (typeof videoMedia === 'string') {
      mediaUrl = formatImageUrl(videoMedia);
      console.log('Using video URL from string:', mediaUrl);
      
      // If we also found an image, use that for the thumbnail
      if (firstImage && typeof firstImage === 'string') {
        imageUrl = formatImageUrl(firstImage);
        console.log('Using image string as thumbnail:', imageUrl);
      } else {
        // If no image is available, we'll use a placeholder
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
        console.log('No image found for thumbnail, using placeholder');
      }
    }
  } else if (firstImage) {
    // No videos, just use the first image
    mediaType = 'image';
    if (typeof firstImage === 'object' && firstImage !== null) {
      mediaUrl = formatImageUrl(firstImage.url);
      imageUrl = mediaUrl;
      console.log('Using image URL from object for both media and thumbnail:', mediaUrl);
    } else if (typeof firstImage === 'string') {
      mediaUrl = formatImageUrl(firstImage);
      imageUrl = mediaUrl;
      console.log('Using image string for both media and thumbnail:', mediaUrl);
    }
  } else {
    // No videos or images, use the first media item whatever it is
    const firstMedia = mediaArray[0];
    if (typeof firstMedia === 'object' && firstMedia !== null) {
      mediaUrl = formatImageUrl(firstMedia.url || '');
      mediaType = firstMedia.type === 'video' ? 'video' : 'image';
      // For videos, use a placeholder for the thumbnail
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
        console.log('Using first media item (video) with placeholder thumbnail:', mediaUrl);
      } else {
        imageUrl = mediaUrl;
        console.log('Using first media item (image) for both media and thumbnail:', mediaUrl);
      }
    } else if (typeof firstMedia === 'string') {
      mediaUrl = formatImageUrl(firstMedia);
      mediaType = isVideoUrl(firstMedia) ? 'video' : 'image';
      // For videos, use a placeholder for the thumbnail
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
        console.log('Using first media string (video) with placeholder thumbnail:', mediaUrl);
      } else {
        imageUrl = mediaUrl;
        console.log('Using first media string (image) for both media and thumbnail:', mediaUrl);
      }
    }
  }
  
  console.log(`Media processing result: type=${mediaType}, imageUrl=${imageUrl}, mediaUrl=${mediaUrl}, thumbnailUri=${thumbnailUri}`);
  return { imageUrl, mediaType, mediaUrl, thumbnailUri };
};

// Common function to standardize post data format
export const standardizePostFormat = (post: any): any => {
  console.log("Standardizing post format for id:", post.id);
  
  // Process author data
  let authorData = null;
  if (post.authorData) {
    authorData = post.authorData;
  } else if (post.author) {
    authorData = {
      id: post.author.id,
      username: post.author.username,
      avatar: post.author.avatar || 'https://robohash.org/default?set=set4'
    };
  } else if (post.userId || post.user_id) {
    const userId = post.userId || post.user_id;
    authorData = {
      id: userId,
      username: 'User',
      avatar: `https://robohash.org/${userId}?set=set4`
    };
  }
  
  // Process media for consistent format
  let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
  let mediaType: 'image' | 'video' = 'image';
  let mediaUrl = '';
  let thumbnailUri = '';
  
  // Process media array to find the right thumbnail
  if (post.media && Array.isArray(post.media) && post.media.length > 0) {
    const mediaResult = processMediaFiles(post.media);
    imageUrl = mediaResult.imageUrl;
    mediaType = mediaResult.mediaType;
    mediaUrl = mediaResult.mediaUrl;
    thumbnailUri = mediaResult.thumbnailUri || '';
  }
  
  // Format comments consistently
  const comments = Array.isArray(post.comments) 
    ? post.comments.map((comment: any) => ({
        id: comment.id,
        author: comment.author?.username || 'Unknown',
        content: comment.content,
        timestamp: comment.createdAt || new Date(),
        avatarUri: comment.author?.avatar || 'https://robohash.org/unknown?set=set4',
        likes: comment.likes || 0
      })) 
    : [];
  
  // Ensure tags is always an array
  const tags = Array.isArray(post.tags) ? post.tags : [];
  
  // Return standardized post object matching ALL fields from the Post model
  return {
    id: post.id,
    userId: post.userId || post.user_id,
    title: post.title || "Untitled Post",
    content: post.content || "",
    media: post.media || [],
    likes: post.likes || 0,
    views: post.views || 0,
    location: post.location || null,
    tags: tags,
    visibility: post.visibility || 'public',
    isDeleted: post.isDeleted || false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    // UI specific fields
    authorData: authorData,
    image: { uri: imageUrl },
    imageUrl: imageUrl,
    mediaType: mediaType,
    mediaUrl: mediaUrl,
    thumbnailUri: thumbnailUri,
    allMedia: post.media || [],
    comments: comments
  };
};

// Fetch user's posts - now just calls the PostsContext method
export const fetchUserPosts = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext.fetchUserPosts directly.");
  
  try {
    // Get the usePosts context
    const { fetchUserPosts, state } = usePosts();
    
    // Call the context method and return its result
    await fetchUserPosts(userId);
    return state.userPosts;
  } catch (error: any) {
    console.error("Error in fetchUserPosts:", error);
    return [];
  }
};

// Fetch liked posts - now just calls the PostsContext method
export const fetchLikedPosts = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext.fetchLikedPosts directly.");
  
  try {
    // Get the usePosts context
    const { fetchLikedPosts, state } = usePosts();
    
    // Call the context method and return its result
    await fetchLikedPosts(userId);
    return state.likedPosts;
  } catch (error: any) {
    console.error("Error in fetchLikedPosts:", error);
    return [];
  }
};

// Fallback function - also deprecated in favor of context methods
export const fetchPostsFallback = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext methods directly.");
  return [];
};

// Fetch user's products