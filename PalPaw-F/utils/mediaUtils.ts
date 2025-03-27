// Constants
const API_BASE_URL = 'http://192.168.2.11:5001';

/**
 * Formats an image URL to ensure it's an absolute path
 * @param path Relative or absolute path to the image
 * @returns Properly formatted absolute URL
 */
export const formatImageUrl = (path: string | undefined): string => {
  if (!path) {
    return 'https://robohash.org/default?set=set4&bgset=bg1';
  }
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path has a leading slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  return `${API_BASE_URL}${path}`;
};

/**
 * Checks if a URL is for a video based on extension or indicators in the URL
 * @param url URL to check
 * @returns boolean indicating if the URL is for a video
 */
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check common video extensions
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
  const lowercasedUrl = url.toLowerCase();
  
  for (const ext of videoExtensions) {
    if (lowercasedUrl.endsWith(ext)) {
      return true;
    }
  }
  
  // Also check if the URL contains a video indicator
  const isVideo = lowercasedUrl.includes('/video/') || 
         lowercasedUrl.includes('video=true') || 
         lowercasedUrl.includes('type=video');
         
  return isVideo;
};

/**
 * Interface for the result of processing media files
 */
export interface MediaProcessingResult {
  imageUrl: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUri?: string;
}

/**
 * Processes an array of media files to determine appropriate thumbnails,
 * video URLs, and image URLs for display in the app
 * @param mediaArray Array of media objects or strings
 * @returns Object with imageUrl, mediaType, mediaUrl, and optional thumbnailUri
 */
export const processMediaFiles = (mediaArray: any[]): MediaProcessingResult => {
  let imageUrl = '';
  let mediaType: 'image' | 'video' = 'image';
  let mediaUrl = '';
  let thumbnailUri = '';
  
  // Default to placeholder if no media
  imageUrl = 'https://robohash.org/default?set=set4&bgset=bg1';
  
  if (!mediaArray || !Array.isArray(mediaArray) || mediaArray.length === 0) {
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
  
  // Now look for videos
  const videoMedia = mediaArray.find(item => {
    if (typeof item === 'object' && item !== null && item.type) {
      return item.type === 'video';
    } else if (typeof item === 'string') {
      return isVideoUrl(item);
    }
    return false;
  });
  
  // If we found a video, use it for the mediaUrl and set type to video
  if (videoMedia) {
    mediaType = 'video';
    
    if (typeof videoMedia === 'object' && videoMedia !== null) {
      // Make sure the URL is an absolute path
      mediaUrl = formatImageUrl(videoMedia.url);
      
      // Check if video media has a thumbnail field first
      if (videoMedia.thumbnail) {
        thumbnailUri = formatImageUrl(videoMedia.thumbnail);
        imageUrl = thumbnailUri;
      }
      // If no thumbnail but we found an image, use that for the thumbnail
      else if (firstImage) {
        if (typeof firstImage === 'object' && firstImage !== null) {
          imageUrl = formatImageUrl(firstImage.url);
        } else if (typeof firstImage === 'string') {
          imageUrl = formatImageUrl(firstImage);
        }
      } else {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      }
    } else if (typeof videoMedia === 'string') {
      mediaUrl = formatImageUrl(videoMedia);
      
      // If we also found an image, use that for the thumbnail
      if (firstImage && typeof firstImage === 'string') {
        imageUrl = formatImageUrl(firstImage);
      } else {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      }
    }
  } else if (firstImage) {
    // No videos, just use the first image
    mediaType = 'image';
    if (typeof firstImage === 'object' && firstImage !== null) {
      mediaUrl = formatImageUrl(firstImage.url);
      imageUrl = mediaUrl;
    } else if (typeof firstImage === 'string') {
      mediaUrl = formatImageUrl(firstImage);
      imageUrl = mediaUrl;
    }
  } else {
    // No videos or images, use the first media item whatever it is
    const firstMedia = mediaArray[0];
    if (typeof firstMedia === 'object' && firstMedia !== null) {
      mediaUrl = formatImageUrl(firstMedia.url || '');
      mediaType = firstMedia.type === 'video' ? 'video' : 'image';
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      } else {
        imageUrl = mediaUrl;
      }
    } else if (typeof firstMedia === 'string') {
      mediaUrl = formatImageUrl(firstMedia);
      mediaType = isVideoUrl(firstMedia) ? 'video' : 'image';
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      } else {
        imageUrl = mediaUrl;
      }
    }
  }
  
  return { imageUrl, mediaType, mediaUrl, thumbnailUri };
};

/**
 * Export API base URL for use in other files
 */
export const getApiBaseUrl = () => API_BASE_URL; 