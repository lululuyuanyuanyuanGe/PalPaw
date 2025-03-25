import api, { getUserProducts, getUserPosts } from "@/utils/apiClient";
import { PostItem, ProductItem } from "./types";

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

// Fetch user's posts
export const fetchUserPosts = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: Fetching posts");
  
  try {
    // Use the getUserPosts function from apiClient
    const posts = await getUserPosts(userId);
    console.log(`ProfileService: Received ${posts.length} posts`);
    
    const fetchedPosts = posts.map((post: any) => {
      // Default values
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
      
      return {
        id: post.id,
        title: post.title || "Untitled Post",
        content: post.content,
        likes: post.likes || 0,
        image: { uri: imageUrl },
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        thumbnailUri: thumbnailUri,
        // Add the full media array for reference
        allMedia: post.media
      };
    });
    
    return fetchedPosts;
  } catch (error) {
    console.error("Error fetching posts from new API:", error);
    
    // Try fallback to old endpoints
    return fetchPostsFallback(userId);
  }
};

// Fallback function for posts if new endpoint fails
const fetchPostsFallback = async (userId: string): Promise<PostItem[]> => {
  try {
    const postsResponse = await api.get('/pg/posts');
    
    if (postsResponse?.data) {
      let userPosts = [];
      
      if (Array.isArray(postsResponse.data)) {
        userPosts = postsResponse.data.filter((post: any) => post.userId === userId);
      } else if (postsResponse.data.posts && Array.isArray(postsResponse.data.posts)) {
        userPosts = postsResponse.data.posts.filter((post: any) => post.userId === userId);
      } else if (typeof postsResponse.data === 'object') {
        userPosts = [];
      }
      
      console.log(`ProfileService: Found ${userPosts.length} posts with fallback`);
      
      const fetchedPosts = userPosts.map((post: any) => {
        // Default values
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
        
        return {
          id: post.id,
          title: post.title || "Untitled Post",
          content: post.content,
          likes: post.likes || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl,
          thumbnailUri: thumbnailUri,
          // Add the full media array for reference
          allMedia: post.media
        };
      });
      
      return fetchedPosts;
    }
    return [];
  } catch (error) {
    console.error("Error in post fallback:", error);
    return [];
  }
};

// Fetch user's products
export const fetchUserProducts = async (userId: string): Promise<ProductItem[]> => {
  console.log("ProfileService: Fetching products");
  
  try {
    // Use the new upload/products endpoint with userId
    const productsResponse = await api.get(`/upload/products/${userId}`);
    
    if (productsResponse?.data?.success && productsResponse.data.products) {
      const userProducts = productsResponse.data.products;
      console.log(`ProfileService: Received ${userProducts.length} products`);
      
      const fetchedProducts = userProducts.map((product: any) => {
        // Default values
        let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        
        // Process media array to find the right thumbnail
        if (product.media && Array.isArray(product.media) && product.media.length > 0) {
          const mediaResult = processMediaFiles(product.media);
          imageUrl = mediaResult.imageUrl;
          mediaType = mediaResult.mediaType;
          mediaUrl = mediaResult.mediaUrl;
        }
        
        return {
          id: product.id,
          name: product.name || "Untitled Product",
          price: product.price || 0,
          rating: 4.5,
          sold: product.sold || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl,
          // Add the full media array for reference
          allMedia: product.media
        };
      });
      
      console.log(`ProfileService: Processed ${fetchedProducts.length} products for display`);
      return fetchedProducts;
    }
    
    // Fallback to old implementation
    return fetchProductsFallback(userId);
  } catch (error: any) {
    console.error("Error fetching products from new endpoint:", error.message);
    if (error.response) {
      console.error(`Status code: ${error.response.status}, data:`, error.response.data);
    }
    
    // Try fallback
    return fetchProductsFallback(userId);
  }
};

// Fallback function for products if new endpoint fails
const fetchProductsFallback = async (userId: string): Promise<ProductItem[]> => {
  try {
    // Try using the existing getUserProducts helper
    try {
      const userProducts = await getUserProducts(userId);
      console.log(`ProfileService: Received ${userProducts.length} products with fallback`);
      
      const fetchedProducts = userProducts.map((product: any) => {
        // Default values
        let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        
        // Process media array to find the right thumbnail
        if (product.media && Array.isArray(product.media) && product.media.length > 0) {
          const mediaResult = processMediaFiles(product.media);
          imageUrl = mediaResult.imageUrl;
          mediaType = mediaResult.mediaType;
          mediaUrl = mediaResult.mediaUrl;
        }
        
        return {
          id: product.id,
          name: product.name || "Untitled Product",
          price: product.price || 0,
          rating: 4.5,
          sold: product.sold || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl,
          allMedia: product.media
        };
      });
      
      return fetchedProducts;
    } catch (error) {
      // Try fallback to direct API call
      const productsResponse = await api.get(`/pg/products`);
      if (productsResponse?.data) {
        let userProducts = [];
        
        if (Array.isArray(productsResponse.data)) {
          userProducts = productsResponse.data.filter((product: any) => product.userId === userId);
        } else if (productsResponse.data.products && Array.isArray(productsResponse.data.products)) {
          userProducts = productsResponse.data.products.filter((product: any) => product.userId === userId);
        }
        
        console.log(`ProfileService: Found ${userProducts.length} products with second fallback`);
        
        return userProducts.map((product: any) => {
          // Process media array to find the right thumbnail
          let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
          let mediaType: 'image' | 'video' = 'image';
          let mediaUrl = '';
          
          if (product.media && Array.isArray(product.media) && product.media.length > 0) {
            const mediaResult = processMediaFiles(product.media);
            imageUrl = mediaResult.imageUrl;
            mediaType = mediaResult.mediaType;
            mediaUrl = mediaResult.mediaUrl;
          }
          
          return {
            id: product.id,
            name: product.name || "Untitled Product",
            price: product.price || 0,
            rating: 4.5,
            sold: product.sold || 0,
            image: { uri: imageUrl },
            mediaType: mediaType,
            mediaUrl: mediaUrl,
            allMedia: product.media
          };
        });
      }
    }
    return [];
  } catch (error) {
    console.error("Error in product fallback:", error);
    return [];
  }
};

// Fetch user profile data
export const fetchUserProfileData = async (userId: string) => {
  console.log("ProfileService: Fetching user profile data");
  
  try {
    const response = await api.get(`/pg/users/${userId}`);
    console.log("ProfileService: User profile data received");
    
    if (response.data && response.data.user) {
      return response.data.user;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching user profile data:", error.message);
    if (error.response) {
      console.error(`Status code: ${error.response.status}, data:`, error.response.data);
    }
    return null;
  }
}; 