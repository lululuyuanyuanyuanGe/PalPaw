import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import { PostItem } from '../app/(root)/(tabs)/(profile)/types';
import { fetchUserPosts as fetchUserPostsService, fetchPostsFallback } from '../app/(root)/(tabs)/(profile)/renderService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';

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
    case 'LIKE_POST_SUCCESS':
      // Update the likedPostIds array with the new postId
      return {
        ...state,
        likedPostIds: action.payload.likedPostIds,
        posts: state.posts.map(post =>
          post.id === action.payload.postId
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ),
        likedPosts: state.likedPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload.postId
          ? { ...state.currentPost, likes: (state.currentPost.likes || 0) + 1 }
          : state.currentPost,
      };
    case 'UNLIKE_POST_SUCCESS':
      // Remove the postId from the likedPostIds array
      return {
        ...state,
        likedPostIds: action.payload.likedPostIds,
        posts: state.posts.map(post =>
          post.id === action.payload.postId && (post.likes || 0) > 0
            ? { ...post, likes: (post.likes || 0) - 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.postId && (post.likes || 0) > 0
            ? { ...post, likes: (post.likes || 0) - 1 }
            : post
        ),
        likedPosts: state.likedPosts.map(post =>
          post.id === action.payload.postId && (post.likes || 0) > 0
            ? { ...post, likes: (post.likes || 0) - 1 }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload.postId && (state.currentPost.likes || 0) > 0
          ? { ...state.currentPost, likes: (state.currentPost.likes || 0) - 1 }
          : state.currentPost,
      };
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
  fetchLikedPosts: () => Promise<void>;
  fetchPostById: (postId: string) => Promise<void>;
  setCurrentPost: (post: PostItem) => void;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
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

  // Initialize liked posts from AsyncStorage on mount
  useEffect(() => {
    const initLikedPosts = async () => {
      try {
        const storedLikedPostIds = await AsyncStorage.getItem('likedPostIds');
        if (storedLikedPostIds) {
          // We only initialize the IDs from storage, the actual posts will be fetched when needed
          const likedPostIds = JSON.parse(storedLikedPostIds);
          dispatch({ 
            type: 'FETCH_LIKED_POSTS_SUCCESS', 
            payload: { posts: [], postIds: likedPostIds } 
          });
        }
      } catch (error) {
        console.error('Error initializing liked posts:', error);
      }
    };

    initLikedPosts();
  }, []);

  // Function to fetch all posts
  const fetchPosts = async () => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      // In a real app, replace with actual API call to fetch all posts
      const posts = await fetchPostsFallback('all');
      dispatch({ type: 'FETCH_POSTS_SUCCESS', payload: posts });
    } catch (error) {
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
      const posts = await fetchUserPostsService(userId);
      dispatch({ type: 'FETCH_USER_POSTS_SUCCESS', payload: posts });
    } catch (error) {
      dispatch({
        type: 'FETCH_USER_POSTS_FAILURE',
        payload: 'Failed to fetch user posts',
      });
    }
  };

  // Helper function to check if a URL is a video URL
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
  
  // Helper function to format image URLs
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
    
    // Use same API base URL as in renderService
    const API_BASE_URL = 'http://192.168.2.11:5001';
    return `${API_BASE_URL}${path}`;
  };
  
  // Function to fetch liked posts
  const fetchLikedPosts = async () => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // Call the API to get liked posts
      const response = await api.get('/likes/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      let { likedPosts, likedPostIds } = response.data;
      
      // Process the liked posts to match the exact structure of regular posts
      likedPosts = likedPosts.map((post: any) => {
        // Format authors the exact same way as in getPostById controller
        let authorData = null;
        
        // Process author data from the nested 'author' field
        if (post.author) {
          authorData = {
            id: post.author.id,
            username: post.author.username,
            avatar: post.author.avatar
          };
        }
        
        // Default values
        let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
        let mediaType: 'image' | 'video' = 'image';
        let mediaUrl = '';
        let thumbnailUri = '';
        
        // Process media array to find the right thumbnail
        if (post.media && Array.isArray(post.media) && post.media.length > 0) {
          // First, try to find an image to use as thumbnail
          const firstImage = post.media.find((item: any) => {
            if (typeof item === 'object' && item !== null && item.type) {
              return item.type === 'image';
            } else if (typeof item === 'string') {
              return !isVideoUrl(item);
            }
            return false;
          });
          
          // Now look for videos
          const videoMedia = post.media.find((item: any) => {
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
                // If no image is available, use a placeholder
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
            const firstMedia = post.media[0];
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
        }
        
        // Create a new post object with the exact same structure as posts from the getPostById API endpoint
        const formattedPost = {
          id: post.id,
          title: post.title || "Untitled Post",
          content: post.content || "",
          likes: post.likes || 0,
          views: post.views || 0,
          tags: post.tags || [],
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          // Author data in the exact format expected by the UI
          authorData: authorData,
          // Media handling
          image: { uri: imageUrl },
          imageUrl: imageUrl,
          mediaType: mediaType,
          mediaUrl: mediaUrl,
          thumbnailUri: thumbnailUri,
          allMedia: post.media || [],
          // Comments in the right format
          comments: Array.isArray(post.comments) ? post.comments.map((comment: any) => ({
            id: comment.id,
            author: comment.author?.username || 'Unknown',
            content: comment.content,
            timestamp: comment.createdAt || new Date(),
            avatarUri: comment.author?.avatar || 'https://robohash.org/unknown?set=set4',
            likes: comment.likes || 0
          })) : []
        };
        
        return formattedPost;
      });
      
      // Save to AsyncStorage for offline access
      await AsyncStorage.setItem('likedPostIds', JSON.stringify(likedPostIds));
      
      dispatch({ 
        type: 'FETCH_LIKED_POSTS_SUCCESS', 
        payload: { posts: likedPosts, postIds: likedPostIds }
      });
    } catch (error) {
      console.error('Error fetching liked posts:', error);
      dispatch({
        type: 'FETCH_LIKED_POSTS_FAILURE',
        payload: 'Failed to fetch liked posts',
      });
    }
  };

  // Helper function to standardize post format
  const standardizePostFormat = (post: any): PostItem => {
    // Ensure authorData is in the correct format
    let authorData = post.authorData || null;
    
    // If there's no authorData but there is an author field, create authorData from it
    if (!authorData && post.author) {
      authorData = {
        id: post.author.id,
        username: post.author.username,
        avatar: post.author.avatar
      };
    }
    
    // If there's still no authorData but there is a userId, create a placeholder
    if (!authorData && (post.userId || post.user_id)) {
      const userId = post.userId || post.user_id;
      authorData = {
        id: userId,
        username: 'User',
        avatar: `https://robohash.org/${userId}?set=set4`
      };
    }
    
    // Make sure comments are in the correct format
    let comments = [];
    if (Array.isArray(post.comments)) {
      comments = post.comments.map((comment: any) => {
        if (typeof comment.author === 'string') {
          // Already in the correct format
          return comment;
        } else {
          // Need to convert from API format
          return {
            id: comment.id,
            author: comment.author?.username || 'Unknown',
            content: comment.content,
            timestamp: comment.createdAt || new Date(),
            avatarUri: comment.author?.avatar || 'https://robohash.org/unknown?set=set4',
            likes: comment.likes || 0
          };
        }
      });
    }
    
    // Create a new standardized post object
    return {
      id: post.id,
      title: post.title || "Untitled Post",
      content: post.content || "",
      likes: post.likes || 0,
      views: post.views || 0,
      tags: post.tags || [],
      createdAt: post.createdAt,
      image: post.image || { uri: post.imageUrl || 'https://robohash.org/default?set=set4' },
      mediaType: post.mediaType || 'image',
      mediaUrl: post.mediaUrl || post.imageUrl,
      thumbnailUri: post.thumbnailUri || post.imageUrl,
      allMedia: post.allMedia || post.media || [],
      authorData: authorData,
      comments: comments,
      // Only include other fields if they exist in the PostItem type
      ...(post.isLiked !== undefined ? { isLiked: post.isLiked } : {})
    } as PostItem;
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

  // Function to like a post with API call
  const likePost = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // Call the API to like the post
      const response = await api.post(`/likes/post/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { likedPostIds } = response.data;

      // Save updated liked post IDs to AsyncStorage
      await AsyncStorage.setItem('likedPostIds', JSON.stringify(likedPostIds));

      // Update state
      dispatch({ 
        type: 'LIKE_POST_SUCCESS', 
        payload: { postId, likedPostIds } 
      });
    } catch (error) {
      console.error('Error liking post:', error);
      dispatch({
        type: 'LIKE_POST_FAILURE',
        payload: 'Failed to like post',
      });
    }
  };

  // Function to unlike a post with API call
  const unlikePost = async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // Call the API to unlike the post
      const response = await api.delete(`/likes/post/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { likedPostIds } = response.data;

      // Save updated liked post IDs to AsyncStorage
      await AsyncStorage.setItem('likedPostIds', JSON.stringify(likedPostIds));

      // Update state
      dispatch({ 
        type: 'UNLIKE_POST_SUCCESS', 
        payload: { postId, likedPostIds } 
      });
    } catch (error) {
      console.error('Error unliking post:', error);
      dispatch({
        type: 'UNLIKE_POST_FAILURE',
        payload: 'Failed to unlike post',
      });
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