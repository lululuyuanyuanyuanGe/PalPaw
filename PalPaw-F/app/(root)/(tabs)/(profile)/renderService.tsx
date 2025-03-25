import api, { getUserProducts, getUserPosts } from "@/utils/apiClient";
import { PostItem, ProductItem } from "./types";

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Format image URL function
export const formatImageUrl = (path: string | undefined): string => {
  if (!path) {
    return 'https://robohash.org/default?set=set4&bgset=bg1';
  }
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
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
      return true;
    }
  }
  
  // Also check if the URL contains a video indicator
  return lowercasedUrl.includes('/video/') || 
         lowercasedUrl.includes('video=true') || 
         lowercasedUrl.includes('type=video');
};

// Fetch user's posts
export const fetchUserPosts = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: Fetching posts");
  
  try {
    // Use the getUserPosts function from apiClient
    const posts = await getUserPosts(userId);
    console.log(`ProfileService: Received ${posts.length} posts`);
    
    const fetchedPosts = posts.map((post: any) => {
      // Handle media as JSONB array from updated backend
      let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
      let mediaType: 'image' | 'video' = 'image';
      let mediaUrl = '';
      
      if (post.media && Array.isArray(post.media) && post.media.length > 0) {
        // Check if media is an array of JSONB objects (new format)
        const mediaItem = post.media[0];
        
        if (typeof mediaItem === 'object' && mediaItem !== null) {
          if (mediaItem.url) {
            mediaUrl = formatImageUrl(mediaItem.url);
            // Use the type field from the JSONB object
            mediaType = mediaItem.type === 'video' ? 'video' : 'image';
            imageUrl = mediaUrl;
          }
        } else if (typeof mediaItem === 'string') {
          // Handle old format for backward compatibility
          mediaUrl = formatImageUrl(mediaItem);
          mediaType = isVideoUrl(mediaUrl) ? 'video' : 'image';
          imageUrl = mediaUrl;
        }
      }
      
      return {
        id: post.id,
        title: post.title || "Untitled Post",
        content: post.content,
        likes: post.likes || 0,
        image: { uri: imageUrl },
        mediaType: mediaType,
        mediaUrl: mediaUrl
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
        // Same processing logic as above
        let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        
        if (post.media && Array.isArray(post.media) && post.media.length > 0) {
          // Check if media is an array of JSONB objects (new format)
          const mediaItem = post.media[0];
          
          if (typeof mediaItem === 'object' && mediaItem !== null) {
            if (mediaItem.url) {
              mediaUrl = formatImageUrl(mediaItem.url);
              // Use the type field from the JSONB object
              mediaType = mediaItem.type === 'video' ? 'video' : 'image';
              imageUrl = mediaUrl;
            }
          } else if (typeof mediaItem === 'string') {
            // Handle old format for backward compatibility
            mediaUrl = formatImageUrl(mediaItem);
            mediaType = isVideoUrl(mediaUrl) ? 'video' : 'image';
            imageUrl = mediaUrl;
          }
        }
        
        return {
          id: post.id,
          title: post.title || "Untitled Post",
          content: post.content,
          likes: post.likes || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl
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
        // Handle media from the API format
        let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        
        if (product.media && Array.isArray(product.media) && product.media.length > 0) {
          // Check if media is an array of JSONB objects (new format)
          const mediaItem = product.media[0];
          
          if (typeof mediaItem === 'object' && mediaItem !== null) {
            if (mediaItem.url) {
              mediaUrl = formatImageUrl(mediaItem.url);
              // Use the type field from the JSONB object
              mediaType = mediaItem.type === 'video' ? 'video' : 'image';
              imageUrl = mediaUrl;
            }
          } else if (typeof mediaItem === 'string') {
            // Handle old format for backward compatibility
            mediaUrl = formatImageUrl(mediaItem);
            mediaType = isVideoUrl(mediaUrl) ? 'video' : 'image';
            imageUrl = mediaUrl;
          }
        }
        
        return {
          id: product.id,
          name: product.name || "Untitled Product",
          price: product.price || 0,
          rating: 4.5,
          sold: product.sold || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl
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
        // Same processing logic as above
        let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        
        if (product.media && Array.isArray(product.media) && product.media.length > 0) {
          // Check if media is an array of JSONB objects (new format)
          const mediaItem = product.media[0];
          
          if (typeof mediaItem === 'object' && mediaItem !== null) {
            if (mediaItem.url) {
              mediaUrl = formatImageUrl(mediaItem.url);
              // Use the type field from the JSONB object
              mediaType = mediaItem.type === 'video' ? 'video' : 'image';
              imageUrl = mediaUrl;
            }
          } else if (typeof mediaItem === 'string') {
            // Handle old format for backward compatibility
            mediaUrl = formatImageUrl(mediaItem);
            mediaType = isVideoUrl(mediaUrl) ? 'video' : 'image';
            imageUrl = mediaUrl;
          }
        }
        
        return {
          id: product.id,
          name: product.name || "Untitled Product",
          price: product.price || 0,
          rating: 4.5,
          sold: product.sold || 0,
          image: { uri: imageUrl },
          mediaType: mediaType,
          mediaUrl: mediaUrl
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
        
        return userProducts.map((product: any) => ({
          id: product.id,
          name: product.name || "Untitled Product",
          price: product.price || 0,
          rating: 4.5,
          sold: product.sold || 0,
          image: { uri: formatImageUrl(product.media?.[0] || '') },
        }));
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