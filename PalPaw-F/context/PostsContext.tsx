import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import { PostItem } from '../app/(root)/(tabs)/(profile)/types';
import { fetchUserPosts as fetchUserPostsService, fetchPostsFallback } from '../app/(root)/(tabs)/(profile)/renderService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Format image URL function
const formatImageUrl = (path: string | undefined): string => {
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

// Helper function to check if URL is a video
const isVideoUrl = (url: string): boolean => {
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

// Helper function to process media files and select appropriate thumbnail
const processMediaFiles = (mediaArray: any[]): { imageUrl: string, mediaType: 'image' | 'video', mediaUrl: string, thumbnailUri?: string } => {
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
        // If no image is available, we still need to set the imageUrl
        // but we'll set it to a placeholder instead of the video URL
        // since using the video URL directly doesn't work well as a thumbnail
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      }
    } else if (typeof videoMedia === 'string') {
      mediaUrl = formatImageUrl(videoMedia);
      
      // If we also found an image, use that for the thumbnail
      if (firstImage && typeof firstImage === 'string') {
        imageUrl = formatImageUrl(firstImage);
      } else {
        // If no image is available, we'll use a placeholder
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
      // For videos, use a placeholder for the thumbnail
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      } else {
        imageUrl = mediaUrl;
      }
    } else if (typeof firstMedia === 'string') {
      mediaUrl = formatImageUrl(firstMedia);
      mediaType = isVideoUrl(firstMedia) ? 'video' : 'image';
      // For videos, use a placeholder for the thumbnail
      if (mediaType === 'video') {
        imageUrl = 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      } else {
        imageUrl = mediaUrl;
      }
    }
  }
  
  return { imageUrl, mediaType, mediaUrl, thumbnailUri };
};

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

// Helper function to standardize post format
const standardizePostFormat = (post: any): PostItem => {
  console.log("Standardizing post format for id:", post.id);
  
  // Process author data
  let authorData = null;
  if (post.authorData) {
    authorData = post.authorData;
    console.log(`Using existing authorData for post ${post.id}:`, JSON.stringify(authorData));
  } else if (post.author) {
    authorData = {
      id: post.author.id,
      username: post.author.username || 'User',
      avatar: post.author.avatar || `https://robohash.org/${post.author.id}?set=set4`
    };
    console.log(`Created authorData from author for post ${post.id}:`, JSON.stringify(authorData));
  } else if (post.userId || post.user_id) {
    const userId = post.userId || post.user_id;
    authorData = {
      id: userId,
      username: 'User',
      avatar: `https://robohash.org/${userId}?set=set4`
    };
    console.log(`Created placeholder authorData for post ${post.id} using userId:`, JSON.stringify(authorData));
  }
  
  // Ensure tags is always an array and has valid values
  const tags = Array.isArray(post.tags) ? post.tags.filter((tag: string) => tag) : [];
  console.log(`Tags for post ${post.id}:`, JSON.stringify(tags));
  
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

// Define the context state interface
interface PostsState {
  posts: PostItem[];
  userPosts: PostItem[];
  likedPosts: PostItem[];
  likedPostIds: string[];
  currentPost: PostItem | null;
  loading: boolean;
  error: string | null;
}

// Define actions that can be dispatched to modify the state
export type PostsAction =
  | { type: 'FETCH_POSTS_REQUEST' }
  | { type: 'FETCH_POSTS_SUCCESS'; payload: PostItem[] }
  | { type: 'FETCH_POSTS_FAILURE'; payload: string }
  | { type: 'FETCH_USER_POSTS_SUCCESS'; payload: PostItem[] }
  | { type: 'FETCH_USER_POSTS_FAILURE'; payload: string }
  | { type: 'FETCH_LIKED_POSTS_SUCCESS'; payload: { posts: PostItem[], postIds: string[] } }
  | { type: 'FETCH_LIKED_POSTS_FAILURE'; payload: string }
  | { type: 'SET_CURRENT_POST'; payload: PostItem }
  | { type: 'CLEAR_CURRENT_POST' }
  | { type: 'LIKE_POST_SUCCESS'; payload: { postId: string, likedPostIds: string[] } }
  | { type: 'UNLIKE_POST_SUCCESS'; payload: { postId: string, likedPostIds: string[] } }
  | { type: 'LIKE_POST_FAILURE'; payload: string }
  | { type: 'UNLIKE_POST_FAILURE'; payload: string }
  | { type: 'INCREMENT_POST_VIEWS'; payload: { postId: string } }
  | { type: 'ADD_COMMENT'; payload: { postId: string; comment: Comment } }
  | { type: 'CLEAR_ERRORS' };

// Comment interface
interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  avatarUri: string;
  likes: number;
}

// Define initial state
const initialState: PostsState = {
  posts: [],
  userPosts: [],
  likedPosts: [],
  likedPostIds: [],
  currentPost: null,
  loading: false,
  error: null,
};

// Create the reducer function
const postsReducer = (state: PostsState, action: PostsAction): PostsState => {
  switch (action.type) {
    case 'FETCH_POSTS_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_POSTS_SUCCESS':
      return {
        ...state,
        posts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_POSTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_USER_POSTS_SUCCESS':
      return {
        ...state,
        userPosts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_USER_POSTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_LIKED_POSTS_SUCCESS':
      return {
        ...state,
        likedPosts: action.payload.posts,
        likedPostIds: action.payload.postIds,
        loading: false,
        error: null,
      };
    case 'FETCH_LIKED_POSTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'SET_CURRENT_POST':
      return {
        ...state,
        currentPost: action.payload,
      };
    case 'CLEAR_CURRENT_POST':
      return {
        ...state,
        currentPost: null,
      };
    case 'LIKE_POST_SUCCESS': {
      // Find all instances of the post and update them
      const postId = action.payload.postId;
      const updatedPosts = state.posts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) + 1) } 
          : post
      );
      const updatedUserPosts = state.userPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) + 1) } 
          : post
      );
      const updatedLikedPosts = state.likedPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) + 1) } 
          : post
      );
      
      // Update currentPost if it's the liked post
      const updatedCurrentPost = state.currentPost?.id === postId
        ? { ...state.currentPost, likes: Math.max(0, (state.currentPost.likes || 0) + 1) }
        : state.currentPost;
      
      // If this is a newly liked post, add it to likedPosts if not already there
      let newLikedPosts = [...state.likedPosts];
      if (!state.likedPosts.some(post => post.id === postId)) {
        const postToAdd = updatedPosts.find(post => post.id === postId) || 
                         updatedUserPosts.find(post => post.id === postId);
        if (postToAdd) {
          newLikedPosts = [postToAdd, ...newLikedPosts];
        }
      }
      
      return {
        ...state,
        posts: updatedPosts,
        userPosts: updatedUserPosts,
        likedPosts: newLikedPosts,
        likedPostIds: action.payload.likedPostIds,
        currentPost: updatedCurrentPost
      };
    }
    
    case 'UNLIKE_POST_SUCCESS': {
      // Find all instances of the post and update them
      const postId = action.payload.postId;
      const updatedPosts = state.posts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } 
          : post
      );
      const updatedUserPosts = state.userPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } 
          : post
      );
      
      // Remove the post from likedPosts if it's there, and update likes for others
      const updatedLikedPosts = state.likedPosts
        .filter(post => !action.payload.likedPostIds.includes(post.id) ? post.id !== postId : true)
        .map(post => 
          post.id === postId 
            ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } 
            : post
        );
      
      // Update currentPost if it's the unliked post
      const updatedCurrentPost = state.currentPost?.id === postId
        ? { ...state.currentPost, likes: Math.max(0, (state.currentPost.likes || 0) - 1) }
        : state.currentPost;
      
      return {
        ...state,
        posts: updatedPosts,
        userPosts: updatedUserPosts,
        likedPosts: updatedLikedPosts,
        likedPostIds: action.payload.likedPostIds,
        currentPost: updatedCurrentPost
      };
    }
    case 'LIKE_POST_FAILURE':
    case 'UNLIKE_POST_FAILURE':
      return {
        ...state,
        error: action.payload,
      };
    case 'INCREMENT_POST_VIEWS':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        likedPosts: state.likedPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload.postId
          ? { ...state.currentPost, views: (state.currentPost.views || 0) + 1 }
          : state.currentPost,
      };
    case 'ADD_COMMENT':
      // Update the post to include the new comment
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload.postId
            ? { 
                ...post, 
                comments: post.comments 
                  ? [action.payload.comment, ...post.comments]
                  : [action.payload.comment]
              }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.postId
            ? { 
                ...post, 
                comments: post.comments 
                  ? [action.payload.comment, ...post.comments]
                  : [action.payload.comment]
              }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload.postId
          ? { 
              ...state.currentPost, 
              comments: state.currentPost.comments 
                ? [action.payload.comment, ...state.currentPost.comments]
                : [action.payload.comment]
            }
          : state.currentPost,
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

// Create a context for posts
interface PostsContextType {
  state: PostsState;
  dispatch: React.Dispatch<PostsAction>;
  fetchPosts: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  fetchLikedPosts: (userId?: string) => Promise<void>;
  fetchPostById: (postId: string) => Promise<void>;
  setCurrentPost: (post: PostItem) => void;
  likePost: (postId: string) => Promise<boolean>;
  unlikePost: (postId: string) => Promise<boolean>;
  isPostLiked: (postId: string) => boolean;
  incrementPostViews: (postId: string) => Promise<void>;
  addComment: (postId: string, comment: Comment) => void;
}

// Create the context with default values
const PostsContext = createContext<PostsContextType | undefined>(undefined);

// Create a provider component
interface PostsProviderProps {
  children: ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(postsReducer, initialState);

  // Move initialization to a separate useEffect with proper dependencies
  // Will define the functions first, then call initialization in another useEffect

  // Function to fetch all posts
  const fetchPosts = async () => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      // In a real app, replace with actual API call to fetch all posts
      const response = await api.get('/pg/posts');
      let posts = [];
      
      if (Array.isArray(response.data)) {
        posts = response.data;
      } else if (response.data.posts && Array.isArray(response.data.posts)) {
        posts = response.data.posts;
      }
      
      const standardizedPosts = posts.map((post: any) => standardizePostFormat(post));
      dispatch({ type: 'FETCH_POSTS_SUCCESS', payload: standardizedPosts });
    } catch (error) {
      console.error('Error fetching posts:', error);
      dispatch({
        type: 'FETCH_POSTS_FAILURE',
        payload: 'Failed to fetch posts',
      });
    }
  };

  // Function to fetch user posts
  const fetchUserPosts = async (userId: string): Promise<void> => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      // Direct API call to fetch user posts
      const response = await api.get(`/upload/posts/${userId}`);
      
      if (response?.data?.success && response.data.posts) {
        const posts = response.data.posts;
        console.log(`PostsContext: Received ${posts.length} user posts`);
        
        // Debug: Log the first post's author and tags
        if (posts.length > 0) {
          console.log("Sample post author data:", JSON.stringify(posts[0].author || posts[0].authorData));
          console.log("Sample post tags:", JSON.stringify(posts[0].tags));
        }
        
        // Enhance posts with author data if missing
        const enhancedPosts = await Promise.all(posts.map(async (post: any) => {
          // Check for missing fields and add warnings
          if (!post.media) {
            console.warn(`User post ${post.id} is missing media field`);
          }
          
          if (!post.tags) {
            console.warn(`User post ${post.id} is missing tags field`);
          }
          
          // If post is missing author data, try to fetch it
          if (!post.author && !post.authorData && (post.userId || post.user_id)) {
            console.warn(`User post ${post.id} is missing author data, fetching...`);
            const postUserId = post.userId || post.user_id;
            const userData = await fetchUserData(postUserId);
            
            if (userData) {
              post.authorData = userData;
              console.log(`Added author data to post ${post.id}:`, JSON.stringify(userData));
            } else {
              console.warn(`Failed to fetch author data for post ${post.id}`);
            }
          }
          
          return post;
        }));
        
        // Standardize post format for each post
        const standardizedPosts = enhancedPosts.map((post: any) => standardizePostFormat(post));
        
        dispatch({ type: 'FETCH_USER_POSTS_SUCCESS', payload: standardizedPosts });
      } else {
        // Try fallback for older API format
        try {
          const fallbackResponse = await api.get('/pg/posts');
          let userPosts = [];
          
          if (Array.isArray(fallbackResponse.data)) {
            userPosts = fallbackResponse.data.filter((post: any) => post.userId === userId);
          } else if (fallbackResponse.data.posts && Array.isArray(fallbackResponse.data.posts)) {
            userPosts = fallbackResponse.data.posts.filter((post: any) => post.userId === userId);
          }
          
          console.log(`PostsContext: Found ${userPosts.length} posts with fallback`);
          
          // Debug: Log the first fallback post's author and tags
          if (userPosts.length > 0) {
            console.log("Sample fallback post author data:", JSON.stringify(userPosts[0].author || userPosts[0].authorData));
            console.log("Sample fallback post tags:", JSON.stringify(userPosts[0].tags));
          }
          
          // Enhance fallback posts with author data if missing
          const enhancedFallbackPosts = await Promise.all(userPosts.map(async (post: any) => {
            // If post is missing author data, try to fetch it
            if (!post.author && !post.authorData && (post.userId || post.user_id)) {
              console.warn(`Fallback post ${post.id} is missing author data, fetching...`);
              const postUserId = post.userId || post.user_id;
              const userData = await fetchUserData(postUserId);
              
              if (userData) {
                post.authorData = userData;
                console.log(`Added author data to fallback post ${post.id}:`, JSON.stringify(userData));
              } else {
                console.warn(`Failed to fetch author data for fallback post ${post.id}`);
              }
            }
            
            return post;
          }));
          
          const standardizedPosts = enhancedFallbackPosts.map((post: any) => standardizePostFormat(post));
          dispatch({ type: 'FETCH_USER_POSTS_SUCCESS', payload: standardizedPosts });
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      dispatch({
        type: 'FETCH_USER_POSTS_FAILURE',
        payload: 'Failed to fetch user posts',
      });
    }
  };

  // Function to fetch liked posts
  const fetchLikedPosts = async (userId?: string): Promise<void> => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // Call API to get liked posts
      const response = await api.get('/likes/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Liked posts API response structure:", Object.keys(response.data));
      
      if (response?.data?.likedPosts && response?.data?.likedPostIds) {
        const { likedPosts, likedPostIds } = response.data;
        console.log(`PostsContext: Received ${likedPosts.length} liked posts`);
        
        // Standardize post format for each post
        const standardizedPosts = likedPosts.map((post: any) => {
          if (!post.media) {
            console.warn(`Liked post ${post.id} is missing media field`);
          }
          
          if (!post.tags) {
            console.warn(`Liked post ${post.id} is missing tags field`);
          }
          
          return standardizePostFormat(post);
        });
        
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('likedPostIds', JSON.stringify(likedPostIds));
        
        dispatch({ 
          type: 'FETCH_LIKED_POSTS_SUCCESS', 
          payload: { posts: standardizedPosts, postIds: likedPostIds }
        });
      } else {
        console.warn("No likedPosts field in API response");
        dispatch({ 
          type: 'FETCH_LIKED_POSTS_SUCCESS', 
          payload: { posts: [], postIds: [] }
        });
      }
    } catch (error) {
      console.error('Error fetching liked posts:', error);
      dispatch({
        type: 'FETCH_LIKED_POSTS_FAILURE',
        payload: 'Failed to fetch liked posts',
      });
    }
  };

  // Function to fetch a post by ID
  const fetchPostById = async (postId: string) => {
    try {
      console.log(`Fetching post with ID: ${postId}`);
      
      // First, check if the post exists in our current state
      const existingPost = state.posts.find(post => post.id === postId) || 
                          state.userPosts.find(post => post.id === postId) ||
                          state.likedPosts.find(post => post.id === postId);
      
      if (existingPost) {
        console.log('Post found in existing state');
        
        // Standardize the post format before setting as current post
        const formattedPost = standardizePostFormat(existingPost);
        dispatch({ type: 'SET_CURRENT_POST', payload: formattedPost });
        
        // Increment the view count when viewing an existing post
        incrementPostViews(postId);
        return;
      }
      
      // If not in our state, try to fetch from API
      try {
        const response = await api.get(`/pg/posts/${postId}`);
        
        if (response.data && response.data.post) {
          console.log('Post fetched from API');
          
          // Standardize the post format
          const formattedPost = standardizePostFormat(response.data.post);
          dispatch({ type: 'SET_CURRENT_POST', payload: formattedPost });
          
          // The view is automatically incremented by the API when we fetch the post
        } else {
          throw new Error('Post not found');
        }
      } catch (apiError) {
        console.error('Error fetching post from API:', apiError);
        
        // As a fallback, look for the post in static/mock data
        const fallbackPosts = await fetchPostsFallback('all');
        const fallbackPost = fallbackPosts.find(post => post.id === postId);
        
        if (fallbackPost) {
          console.log('Post found in fallback data');
          
          // Standardize the post format
          const formattedPost = standardizePostFormat(fallbackPost);
          dispatch({ type: 'SET_CURRENT_POST', payload: formattedPost });
          
          // Increment view count for fallback posts as well
          incrementPostViews(postId);
        } else {
          console.error('Post not found in any source');
          throw new Error('Post not found in any source');
        }
      }
    } catch (error) {
      console.error('Error in fetchPostById:', error);
    }
  };

  // Function to set the current post
  const setCurrentPost = (post: PostItem) => {
    // Standardize the post format before setting as current post
    const formattedPost = standardizePostFormat(post);
    dispatch({ type: 'SET_CURRENT_POST', payload: formattedPost });
  };

  // Function to check if a post is liked
  const isPostLiked = (postId: string): boolean => {
    return state.likedPostIds.includes(postId);
  };

  // Function to like a post
  const likePost = async (postId: string): Promise<boolean> => {
    try {
      // Check if post is already liked
      if (state.likedPostIds.includes(postId)) {
        console.log(`Post ${postId} is already liked, ignoring duplicate request`);
        return true; // Already liked, so we consider this successful
      }

      console.log(`Sending like request for post: ${postId}`);
      const response = await api.post(`/likes/post/${postId}`);
      
      console.log(`Response from /likes/post/${postId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state with the liked post ID
        dispatch({
          type: 'LIKE_POST_SUCCESS',
          payload: { 
            postId, 
            likedPostIds: [...state.likedPostIds, postId] 
          }
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error liking post:', error);
      
      // Check if error is a duplicate constraint error (post already liked)
      // This happens when the backend has a race condition
      if (error.response?.status === 500 && 
          (error.response?.data?.message?.includes('unique constraint') || 
           error.message?.includes('already exists'))) {
        console.log('Post was already liked on the server - considering this a success');
        
        // Still update our local state to reflect that the post is liked
        if (!state.likedPostIds.includes(postId)) {
          dispatch({
            type: 'LIKE_POST_SUCCESS',
            payload: { 
              postId, 
              likedPostIds: [...state.likedPostIds, postId] 
            }
          });
        }
        
        return true;
      }
      
      dispatch({
        type: 'LIKE_POST_FAILURE',
        payload: 'Failed to like post',
      });
      
      return false;
    }
  };

  

  // Function to unlike a post
  const unlikePost = async (postId: string): Promise<boolean> => {
    try {
      // Check if post is not liked already
      if (!state.likedPostIds.includes(postId)) {
        console.log(`Post ${postId} is not liked, ignoring unlike request`);
        return true; // Not liked, so nothing to unlike
      }

      console.log(`Sending unlike request for post: ${postId}`);
      const response = await api.delete(`/likes/post/${postId}`);
      
      console.log(`Response from unlike post ${postId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state by removing the post ID from liked posts
        dispatch({
          type: 'UNLIKE_POST_SUCCESS',
          payload: { 
            postId, 
            likedPostIds: state.likedPostIds.filter(id => id !== postId) 
          }
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error unliking post:', error);
      
      dispatch({
        type: 'UNLIKE_POST_FAILURE',
        payload: 'Failed to unlike post',
      });
      
      return false;
    }
  };

  // Function to add a comment
  const addComment = (postId: string, comment: Comment) => {
    dispatch({
      type: 'ADD_COMMENT',
      payload: { postId, comment },
    });
    // In a real app, you would make an API call to add the comment
  };

  // Function to increment post views with API call
  const incrementPostViews = async (postId: string) => {
    try {
      // Call the API to increment post views
      await api.get(`/pg/posts/${postId}`);
      
      // Update state locally
      dispatch({ 
        type: 'INCREMENT_POST_VIEWS', 
        payload: { postId }
      });
    } catch (error) {
      console.error('Error incrementing post views:', error);
      // We don't dispatch an error here to keep the UX smooth
    }
  };

  // Initialize posts data from AsyncStorage after functions are defined
  useEffect(() => {
    const initPostsData = async () => {
      try {
        console.log('Initializing posts data from storage');
        
        // Initialize liked posts IDs from AsyncStorage
        const storedLikedPostIds = await AsyncStorage.getItem('likedPostIds');
        if (storedLikedPostIds) {
          // We only initialize the IDs from storage, the actual posts will be fetched when needed
          const likedPostIds = JSON.parse(storedLikedPostIds);
          console.log(`Found ${likedPostIds.length} liked post IDs in storage`);
          dispatch({ 
            type: 'FETCH_LIKED_POSTS_SUCCESS', 
            payload: { posts: [], postIds: likedPostIds } 
          });
        } else {
          console.log('No liked posts found in storage');
        }
        
        // Initialize user data to fetch user posts
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.id) {
            console.log('Found user data in storage, user ID:', user.id);
            
            // Initialize both user posts and liked posts in parallel
            Promise.all([
              // Fetch user posts
              fetchUserPosts(user.id).catch(error => {
                console.error('Error initializing user posts:', error);
                return null;
              }),
              
              // Fetch liked posts
              fetchLikedPosts(user.id).catch(error => {
                console.error('Error initializing liked posts:', error);
                return null;
              })
            ]).then(([userPostsResult, likedPostsResult]) => {
              console.log('Initial data fetch complete:', {
                userPostsFetched: userPostsResult !== null,
                likedPostsFetched: likedPostsResult !== null
              });
            });
          } else {
            console.log('User data found but missing ID');
          }
        } else {
          console.log('No user data found in storage');
        }
      } catch (error) {
        console.error('Error initializing posts data:', error);
      }
    };

    initPostsData();
  }, []);

  return (
    <PostsContext.Provider
      value={{
        state,
        dispatch,
        fetchPosts,
        fetchUserPosts,
        fetchLikedPosts,
        fetchPostById,
        setCurrentPost,
        likePost,
        unlikePost,
        isPostLiked,
        incrementPostViews,
        addComment,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
};

// Custom hook to use the posts context
export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
}; 