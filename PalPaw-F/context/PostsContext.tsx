import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import { PostItem } from '../app/(root)/(tabs)/(profile)/types';
import { fetchUserPosts as fetchPostsFallback } from '../app/(root)/(tabs)/(profile)/renderService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';
import { processMediaFiles } from '../utils/mediaUtils';


// Comment interface
interface Comment {
  id: string;
  author: string; // Just a string, not an object
  content: string;
  timestamp: Date;
  avatarUri: string;
  likes: number;
}

// Helper function to fetch and format comments for a post
const fetchAndFormatComments = async (postId: string): Promise<Comment[]> => {
  try {
    console.log(`Fetching comments for post ${postId}`);
    const commentsResponse = await api.get(`/comments/post/${postId}`);
    
    if (commentsResponse.data && commentsResponse.data.success) {
      const fetchedComments = commentsResponse.data.comments || [];
      const formattedComments: Comment[] = [];
      
      // Process each comment to match our Comment interface
      fetchedComments.forEach((comment: any) => {
        formattedComments.push({
          id: comment.id,
          author: comment.author || 'Unknown', // Backend returns author as string
          content: comment.content,
          timestamp: new Date(comment.timestamp || comment.createdAt || Date.now()),
          avatarUri: comment.avatarUri || `https://robohash.org/${comment.author}?set=set4`,
          likes: comment.likes || 0
        });
        
        // Then add all replies as separate comments in the flat array
        if (Array.isArray(comment.replies) && comment.replies.length > 0) {
          comment.replies.forEach((reply: any) => {
            formattedComments.push({
              id: reply.id,
              author: reply.author || 'Unknown', // Backend returns author as string
              content: reply.content,
              timestamp: new Date(reply.timestamp || reply.createdAt || Date.now()),
              avatarUri: reply.avatarUri || `https://robohash.org/${reply.author}?set=set4`,
              likes: reply.likes || 0
            });
          });
        }
      });
      
      console.log(`Added ${formattedComments.length} comments to post ${postId}`);
      return formattedComments;
    }
    return [];
  } catch (error) {
    console.warn(`Failed to fetch comments for post ${postId}:`, error);
    return [];
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
        author: comment.author || 'Unknown', // Backend returns author as string
        content: comment.content,
        timestamp: new Date(comment.timestamp || comment.createdAt || Date.now()),
        avatarUri: comment.avatarUri || `https://robohash.org/${comment.author}?set=set4`,
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

// Helper function to process post data from API or fallback
const processPost = async (post: any, postId: string): Promise<PostItem> => {
  // Ensure post has comments
  if (!post.comments || post.comments.length === 0) {
    try {
      post.comments = await fetchAndFormatComments(postId);
    } catch (commentsError) {
      console.warn(`Failed to fetch comments for post ${postId}:`, commentsError);
      post.comments = [];
    }
  } else {
    // Format existing comments to match our interface
    post.comments = post.comments.map((comment: any) => {
      // Handle different author formats
      let authorName = 'Unknown';
      let authorAvatar = null;
      
      if (comment.author) {
        if (typeof comment.author === 'object') {
          authorName = comment.author.username || 'Unknown';
          authorAvatar = comment.author.avatar;
        } else {
          authorName = comment.author;
        }
      }
      
      // Use explicit avatarUri if available, or author's avatar, or generate from author name
      const avatarUri = comment.avatarUri || authorAvatar || `https://robohash.org/${authorName}?set=set4`;
      
      return {
        id: comment.id,
        author: comment.author, // Keep original author format for the Comment component to handle
        content: comment.content,
        timestamp: comment.timestamp || comment.createdAt || new Date(),
        avatarUri: avatarUri,
        likes: comment.likes || 0
      };
    });
  }
  
  // Standardize and return the post
  return standardizePostFormat(post);
};

// Define the context state interface
interface PostsState {
  Posts: PostItem[];
  otherUserPosts: PostItem[];
  friendsPosts: PostItem[];
  feedPosts: PostItem[];
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
  | { type: 'FETCH_OTHER_USER_POSTS_REQUEST' }
  | { type: 'FETCH_OTHER_USER_POSTS_SUCCESS'; payload: PostItem[] }
  | { type: 'FETCH_OTHER_USER_POSTS_FAILURE'; payload: string }
  | { type: 'FETCH_LIKED_POSTS_SUCCESS'; payload: { posts: PostItem[], postIds: string[] } }
  | { type: 'FETCH_LIKED_POSTS_FAILURE'; payload: string }
  | { type: 'FETCH_FRIENDS_POSTS_SUCCESS'; payload: PostItem[] }
  | { type: 'FETCH_FRIENDS_POSTS_FAILURE'; payload: string }
  | { type: 'SET_CURRENT_POST'; payload: PostItem }
  | { type: 'CLEAR_CURRENT_POST' }
  | { type: 'LIKE_POST_SUCCESS'; payload: { postId: string, likedPostIds: string[] } }
  | { type: 'UNLIKE_POST_SUCCESS'; payload: { postId: string, likedPostIds: string[] } }
  | { type: 'LIKE_POST_FAILURE'; payload: string }
  | { type: 'UNLIKE_POST_FAILURE'; payload: string }
  | { type: 'INCREMENT_POST_VIEWS'; payload: { postId: string } }
  | { type: 'ADD_COMMENT'; payload: { postId: string; comment: Comment } }
  | { type: 'DELETE_POST_SUCCESS'; payload: string }
  | { type: 'DELETE_POST_FAILURE'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'UPDATE_POST_IN_ALL_COLLECTIONS'; payload: PostItem }
  | { type: 'CLEAR_OTHER_USER_POSTS' };

// Define initial state
const initialState: PostsState = {
  Posts: [],
  otherUserPosts: [],
  friendsPosts: [],
  feedPosts: [],
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
    case 'FETCH_OTHER_USER_POSTS_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_POSTS_SUCCESS':
      return {
        ...state,
        feedPosts: action.payload,
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
    case 'FETCH_OTHER_USER_POSTS_SUCCESS':
      return {
        ...state,
        otherUserPosts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_OTHER_USER_POSTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'CLEAR_OTHER_USER_POSTS':
      return {
        ...state,
        otherUserPosts: [],
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
    case 'FETCH_FRIENDS_POSTS_SUCCESS':
      return {
        ...state,
        friendsPosts: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_FRIENDS_POSTS_FAILURE':
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
      const updatedPosts = state.feedPosts.map(post => 
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
      
      // Update otherUserPosts
      const updatedOtherUserPosts = state.otherUserPosts.map(post => 
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
                         updatedUserPosts.find(post => post.id === postId) ||
                         updatedOtherUserPosts.find(post => post.id === postId);
        if (postToAdd) {
          newLikedPosts = [postToAdd, ...newLikedPosts];
        }
      }
      
      return {
        ...state,
        feedPosts: updatedPosts,
        userPosts: updatedUserPosts,
        otherUserPosts: updatedOtherUserPosts,
        likedPosts: newLikedPosts,
        likedPostIds: action.payload.likedPostIds,
        currentPost: updatedCurrentPost
      };
    }
    
    case 'UNLIKE_POST_SUCCESS': {
      // Find all instances of the post and update them
      const postId = action.payload.postId;
      const updatedPosts = state.feedPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } 
          : post
      );
      const updatedUserPosts = state.userPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } 
          : post
      );
      
      // Update otherUserPosts
      const updatedOtherUserPosts = state.otherUserPosts.map(post => 
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
        feedPosts: updatedPosts,
        userPosts: updatedUserPosts,
        otherUserPosts: updatedOtherUserPosts,
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
        feedPosts: state.feedPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        otherUserPosts: state.otherUserPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        likedPosts: state.likedPosts.map(post =>
          post.id === action.payload.postId
            ? { ...post, views: (post.views || 0) + 1 }
            : post
        ),
        friendsPosts: state.friendsPosts.map(post =>
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
        feedPosts: state.feedPosts.map(post =>
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
        otherUserPosts: state.otherUserPosts.map(post =>
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
    case 'DELETE_POST_SUCCESS':
      return {
        ...state,
        feedPosts: state.feedPosts.filter(post => post.id !== action.payload),
        userPosts: state.userPosts.filter(post => post.id !== action.payload),
        otherUserPosts: state.otherUserPosts.filter(post => post.id !== action.payload),
        likedPosts: state.likedPosts.filter(post => post.id !== action.payload),
        likedPostIds: state.likedPostIds.filter(id => id !== action.payload),
        currentPost: state.currentPost?.id === action.payload ? null : state.currentPost,
        loading: false,
        error: null,
      };
    case 'DELETE_POST_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_POST_IN_ALL_COLLECTIONS':
      return {
        ...state,
        feedPosts: state.feedPosts.map(post =>
          post.id === action.payload.id ? action.payload : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload.id ? action.payload : post
        ),
        otherUserPosts: state.otherUserPosts.map(post =>
          post.id === action.payload.id ? action.payload : post
        ),
        likedPosts: state.likedPosts.map(post =>
          post.id === action.payload.id ? action.payload : post
        ),
        friendsPosts: state.friendsPosts.map(post =>
          post.id === action.payload.id ? action.payload : post
        ),
        currentPost: state.currentPost?.id === action.payload.id ? action.payload : state.currentPost,
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
  fetchFeedPosts: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  fetchOtherUserPosts: (userId: string) => Promise<PostItem[]>;
  clearOtherUserPosts: () => void;
  fetchLikedPosts: (userId?: string) => Promise<void>;
  fetchFriendsPosts: () => Promise<void>;
  fetchPostById: (postId: string) => Promise<void>;
  setCurrentPost: (post: PostItem) => void;
  likePost: (postId: string) => Promise<boolean>;
  unlikePost: (postId: string) => Promise<boolean>;
  isPostLiked: (postId: string) => boolean;
  incrementPostViews: (postId: string) => Promise<void>;
  addComment: (postId: string, comment: Comment) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
}

// Create the context with default values
const PostsContext = createContext<PostsContextType | undefined>(undefined);

// Create a provider component
interface PostsProviderProps {
  children: ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(postsReducer, initialState);

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

  // Function to fetch feed posts (for discovery)
  const fetchFeedPosts = async () => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      console.log("Fetching posts for feed...");
      
      // Make API call to fetch feed posts (random posts for discovery)
      const response = await api.get('/pg/posts/feed');
      console.log("Feed API response:", response.status, response.statusText);
      
      let posts = [];
      
      if (Array.isArray(response.data)) {
        posts = response.data;
        console.log("Response data is an array");
      } else if (response.data.posts && Array.isArray(response.data.posts)) {
        posts = response.data.posts;
        console.log("Response data has posts array");
      } else if (response.data.success) {
        // Handle the case where success is true but posts might be in a different format
        console.log("Response indicates success, data format:", typeof response.data);
        if (response.data.posts) {
          posts = response.data.posts;
        }
      }
      
      console.log(`Received ${posts.length} feed posts with IDs:`, posts.map((p: any) => p.id).join(', '));
      
      // Standardize the posts format
      const standardizedPosts = posts.map((post: any) => standardizePostFormat(post));
      
      console.log(`After standardization: ${standardizedPosts.length} posts`);
      
      // Update state with feed posts
      dispatch({ type: 'FETCH_POSTS_SUCCESS', payload: standardizedPosts });
    } catch (error) {
      console.error('Error fetching feed posts:', error);
      
      // Fallback to using getRandomPosts function
      try {
        console.log("Falling back to manual random post selection");
        const fallbackResponse = await api.get('/pg/posts');
        let allPosts = [];
        
        if (Array.isArray(fallbackResponse.data)) {
          allPosts = fallbackResponse.data;
        } else if (fallbackResponse.data.posts && Array.isArray(fallbackResponse.data.posts)) {
          allPosts = fallbackResponse.data.posts;
        }
        
        // Shuffle the array and take 6 posts
        const shuffled = [...allPosts].sort(() => 0.5 - Math.random());
        const randomPosts = shuffled.slice(0, 6);
        
        console.log(`Retrieved ${randomPosts.length} random posts for feed`);
        
        // Standardize before updating state
        const standardizedPosts = randomPosts.map((post: any) => standardizePostFormat(post));
        
        // Update state with random posts
        dispatch({ type: 'FETCH_POSTS_SUCCESS', payload: standardizedPosts });
      } catch (fallbackError) {
        console.error('Error with fallback random posts fetch:', fallbackError);
        dispatch({
          type: 'FETCH_POSTS_FAILURE',
          payload: 'Failed to fetch feed posts',
        });
      }
    }
  };

  const fetchUserPosts = async (userId: string): Promise<void> => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      // Direct API call to fetch user posts
      const response = await api.get(`/upload/posts/${userId}`);
      
      if (response?.data?.success && response.data.posts) {
        const posts = response.data.posts;
        console.log(`PostsContext: Received ${posts.length} user posts with complete data`);

        // Standardize the post format and update state
        const standardizedPosts = posts.map((post: any) => standardizePostFormat(post));
        
        // Update posts in state with complete post data
        dispatch({ type: 'FETCH_USER_POSTS_SUCCESS', payload: standardizedPosts });
        
        // Update posts in all collections to ensure consistency 
        standardizedPosts.forEach((post: PostItem) => {
          dispatch({
            type: 'UPDATE_POST_IN_ALL_COLLECTIONS',
            payload: post
          });
        });
      } else {
        // Fallback to general posts and filter by userId
        try {
          const fallbackResponse = await api.get('/pg/posts');
          let userPosts = [];

          if (Array.isArray(fallbackResponse.data)) {
            userPosts = fallbackResponse.data.filter((post: any) => post.userId === userId);
          } else if (fallbackResponse.data.posts && Array.isArray(fallbackResponse.data.posts)) {
            userPosts = fallbackResponse.data.posts.filter((post: any) => post.userId === userId);
          }
  
          console.log(`PostsContext: Found ${userPosts.length} posts with fallback`);

          // Standardize the posts and update state
          const standardizedPosts = userPosts.map((post: any) => standardizePostFormat(post));
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
        
        // Enhance posts with comments if missing
        const enhancedPosts = await Promise.all(likedPosts.map(async (post: any) => {
          if (!post.media) {
            console.warn(`Liked post ${post.id} is missing media field`);
          }
          
          if (!post.tags) {
            console.warn(`Liked post ${post.id} is missing tags field`);
          }
          
          // Fetch comments if not included or empty
          if (!post.comments || post.comments.length === 0) {
            try {
              // Use helper function to fetch and format comments
              post.comments = await fetchAndFormatComments(post.id);
            } catch (commentsError) {
              console.warn(`Failed to fetch comments for liked post ${post.id}:`, commentsError);
              // Initialize with empty array if fetch fails
              post.comments = [];
            }
          }
          
          return post;
        }));
        
        // Standardize post format for each post
        const standardizedPosts = enhancedPosts.map((post: any) => standardizePostFormat(post));
        
        // Save to AsyncStorage for offline access
        // await AsyncStorage.setItem('likedPostIds', JSON.stringify(likedPostIds));
        // await AsyncStorage.removeItem('likedPostIds');

        
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
  const fetchPostById = async (postId: string): Promise<void> => {
    try {
      console.log(`Fetching post with ID: ${postId}`);
      
      // Make API call to fetch the post
      try {
        const response = await api.get(`/pg/posts/${postId}`);
        
        if (response.data && response.data.success) {
          console.log('Post fetched from API');
          
          // Process the post data with our helper function
          const formattedPost = await processPost(response.data.post, postId);
          
          // Backend already incremented the view count in the database.
          // Decrement it locally before setting the state so we can increment it
          // back using the INCREMENT_POST_VIEWS action for consistency
          
          // Update post in all collections directly
          dispatch({
            type: 'UPDATE_POST_IN_ALL_COLLECTIONS',
            payload: formattedPost
          });
          
          // Now increment the view count locally to match the backend count
          dispatch({ 
            type: 'INCREMENT_POST_VIEWS', 
            payload: { postId }
          });
          
          return;
        }
        throw new Error('Post not found or response format incorrect');
      } catch (apiError) {
        console.error('Error fetching post from API:', apiError);
        
        // As a fallback, look for the post in static/mock data
        const fallbackPosts = await fetchPostsFallback('all');
        const fallbackPost = fallbackPosts.find(post => post.id === postId);
        
        if (fallbackPost) {
          console.log('Post found in fallback data');
          
          // Process the fallback post data with our helper function
          const formattedPost = await processPost(fallbackPost, postId);
          
          // Update post in all collections directly
          dispatch({
            type: 'UPDATE_POST_IN_ALL_COLLECTIONS',
            payload: formattedPost
          });
          
          // Increment view count for fallback posts as well
          incrementPostViews(postId);
          return;
        } else {
          console.error('Post not found in any source');
          throw new Error('Post not found in any source');
        }
      }
    } catch (error) {
      console.error('Error in fetchPostById:', error);
      throw error;
    }
  };

  // Function to set the current post
  const setCurrentPost = (post: PostItem) => {
    // Fetch the full post data if possible
    fetchPostById(post.id).catch(() => {
      // If we can't fetch, at least standardize and update everywhere
      const formattedPost = standardizePostFormat(post);
      dispatch({
        type: 'UPDATE_POST_IN_ALL_COLLECTIONS',
        payload: formattedPost
      });
    });
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
  const addComment = async (postId: string, comment: Comment): Promise<boolean> => {
    try {
      // Make API call to add the comment
      const response = await api.post('/comments', {
        postId,
        content: comment.content,
      });
      
      console.log('Server response from adding comment:', JSON.stringify(response.data));
      
      if (response.data && response.data.success) {
        // Backend returns comment in the format that matches our interface
        const serverComment = response.data.comment;
        console.log('Server comment data:', JSON.stringify(serverComment));
        
        // Create comment directly from the server response which already matches our format
        const transformedComment: Comment = {
          id: serverComment.id,
          author: serverComment.author,
          content: serverComment.content,
          timestamp: new Date(serverComment.timestamp || serverComment.createdAt || Date.now()),
          avatarUri: serverComment.avatarUri, // Use the avatarUri directly from the server
          likes: serverComment.likes || 0
        };
        
        console.log('Transformed comment:', JSON.stringify(transformedComment));
        
        dispatch({
          type: 'ADD_COMMENT',
          payload: { 
            postId, 
            comment: transformedComment
          },
        });
        return true;
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  };

  // Function to increment post views with API call
  const incrementPostViews = async (postId: string) => {
    try {
      // Fetch the post by ID, which will automatically increment the view count in the backend
      const response = await api.get(`/pg/posts/${postId}`);
      
      if (response.data && response.data.success) {
        console.log('Post fetched and view count incremented in backend');
        
        // Get the post with updated view count from the response
        const updatedPost = response.data.post;
        
        // Create a standardized post object
        const formattedPost = standardizePostFormat(updatedPost);
        
        // Set the current post with updated view count
        dispatch({ type: 'SET_CURRENT_POST', payload: formattedPost });
        
        // Update the post in all collections
        dispatch({
          type: 'UPDATE_POST_IN_ALL_COLLECTIONS',
          payload: formattedPost
        });
      } else {
        // Fallback to just incrementing views in the local state
        dispatch({ 
          type: 'INCREMENT_POST_VIEWS', 
          payload: { postId }
        });
      }
    } catch (error) {
      console.error('Error incrementing post views:', error);
      
      // Fallback to just incrementing views in the local state if the API fails
      dispatch({ 
        type: 'INCREMENT_POST_VIEWS', 
        payload: { postId }
      });
    }
  };

  // Function to delete a post
  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      console.log(`Attempting to delete post: ${postId}`);
      const response = await api.delete(`/upload/post/${postId}`);
      
      console.log(`Response from delete post ${postId}:`, response.status, JSON.stringify(response.data));
      
      if (response.data?.success) {
        // Update state by removing the post from all arrays
        dispatch({
          type: 'DELETE_POST_SUCCESS',
          payload: postId
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error deleting post:', error);
      
      dispatch({
        type: 'DELETE_POST_FAILURE',
        payload: 'Failed to delete post'
      });
      
      return false;
    }
  };

  // Function to fetch posts from friends (followers and following)
  const fetchFriendsPosts = async (): Promise<void> => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    
    try {
      console.log("Fetching posts from friends (followers and following)...");
      
      // Get auth token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No auth token found');
        dispatch({ type: 'FETCH_FRIENDS_POSTS_FAILURE', payload: 'No auth token found' });
        return;
      }
      
      // Make API call to fetch friends' posts
      console.log("Making API call to fetch friends' posts");
      const response = await api.get('/pg/posts/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("Raw API response:", JSON.stringify(response.data));
      
      let posts = [];
      
      if (Array.isArray(response.data)) {
        posts = response.data;
      } else if (response.data.posts && Array.isArray(response.data.posts)) {
        posts = response.data.posts;
      } else if (response.data.success) {
        if (response.data.posts) {
          posts = response.data.posts;
        }
      }
      
      console.log(`Received ${posts.length} posts from API`);
      
      // Process posts and fetch comments if needed
      if (posts.length > 0) {
        console.log("Processing posts and fetching comments...");
        const enhancedPosts = await Promise.all(posts.map(async (post: any) => {
          // Fetch comments if not included or empty
          if (!post.comments || post.comments.length === 0) {
            try {
              post.comments = await fetchAndFormatComments(post.id);
            } catch (commentsError) {
              console.warn(`Failed to fetch comments for post ${post.id}:`, commentsError);
              post.comments = [];
            }
          }
          return post;
        }));
        
        // Standardize the posts format
        const standardizedPosts = enhancedPosts.map((post: any) => standardizePostFormat(post));
        
        console.log(`Successfully processed ${standardizedPosts.length} friends' posts`);
        
        // Update state with posts
        dispatch({ type: 'FETCH_FRIENDS_POSTS_SUCCESS', payload: standardizedPosts });
      } else {
        // API returned no posts, set empty array
        console.log("API returned no friends' posts");
        dispatch({ type: 'FETCH_FRIENDS_POSTS_SUCCESS', payload: [] });
      }
    } catch (error) {
      console.error('Error fetching friends posts:', error);
      // Update state with error
      dispatch({
        type: 'FETCH_FRIENDS_POSTS_FAILURE',
        payload: 'Failed to fetch friends posts'
      });
    }
  };

  // Function to fetch other user posts
  const fetchOtherUserPosts = async (userId: string): Promise<PostItem[]> => {
    if (!userId) {
      console.error('PostsContext: No userId provided for fetchOtherUserPosts');
      return [];
    }

    dispatch({ type: 'FETCH_OTHER_USER_POSTS_REQUEST' });

    try {
      console.log(`PostsContext: Fetching posts for other user ${userId}`);
      // Direct API call to fetch user posts
      const response = await api.get(`/upload/posts/${userId}`);
      
      if (response?.data?.success && response.data.posts) {
        const posts = response.data.posts;
        console.log(`PostsContext: Received ${posts.length} posts for other user ${userId}`);

        // Standardize the post format
        const standardizedPosts = posts.map((post: any) => {
          console.log(`PostsContext: Standardizing other user post ${post.id}`);
          return standardizePostFormat(post);
        });
        
        // Update saved status for each post using the current likedPostIds
        const postsWithLikedStatus = standardizedPosts.map((post: PostItem) => ({
          ...post,
          liked: state.likedPostIds.includes(post.id)
        }));
        
        console.log(`PostsContext: Formatted ${standardizedPosts.length} other user posts with proper types`);
        // Only update otherUserPosts, not any other collection
        dispatch({ type: 'FETCH_OTHER_USER_POSTS_SUCCESS', payload: postsWithLikedStatus });
        return postsWithLikedStatus;
      } else {
        // Fallback to general posts and filter by userId
        try {
          console.log(`PostsContext: Using fallback method to fetch other user posts`);
          const fallbackResponse = await api.get('/pg/posts');
          let userPosts = [];

          if (Array.isArray(fallbackResponse.data)) {
            userPosts = fallbackResponse.data.filter((post: any) => post.userId === userId);
          } else if (fallbackResponse.data.posts && Array.isArray(fallbackResponse.data.posts)) {
            userPosts = fallbackResponse.data.posts.filter((post: any) => post.userId === userId);
          }
  
          console.log(`PostsContext: Found ${userPosts.length} posts with fallback for other user ${userId}`);

          // Standardize the posts
          const standardizedPosts = userPosts.map((post: any) => standardizePostFormat(post));
          
          // Update liked status for each post
          const postsWithLikedStatus = standardizedPosts.map((post: PostItem) => ({
            ...post,
            liked: state.likedPostIds.includes(post.id)
          }));
          
          console.log(`PostsContext: Formatted ${standardizedPosts.length} fallback other user posts`);
          // Only update otherUserPosts, not any other collection
          dispatch({ type: 'FETCH_OTHER_USER_POSTS_SUCCESS', payload: postsWithLikedStatus });
          return postsWithLikedStatus;
        } catch (fallbackError) {
          console.error('PostsContext: Error in fallback fetch for other user posts:', fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("PostsContext: Error fetching other user posts:", error);
      dispatch({
        type: 'FETCH_OTHER_USER_POSTS_FAILURE',
        payload: 'Failed to fetch other user posts',
      });
      return [];
    }
  };

  // Function to clear other user posts
  const clearOtherUserPosts = () => {
    dispatch({ type: 'CLEAR_OTHER_USER_POSTS' });
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
            
            // Initialize user posts, liked posts, and feed posts in parallel
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
              }),
              
              // Fetch feed posts
              fetchFeedPosts().catch(error => {
                console.error('Error initializing feed posts:', error);
                return null;
              }),
              
              // Fetch friends posts
              fetchFriendsPosts().catch(error => {
                console.error('Error initializing friends posts:', error);
                return null;
              })
            ]).then(([userPostsResult, likedPostsResult, feedPostsResult, friendsPostsResult]) => {
              console.log('Initial data fetch complete:', {
                userPostsFetched: userPostsResult !== null,
                likedPostsFetched: likedPostsResult !== null,
                feedPostsFetched: feedPostsResult !== null,
                friendsPostsFetched: friendsPostsResult !== null
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
        fetchFeedPosts,
        fetchUserPosts,
        fetchOtherUserPosts,
        clearOtherUserPosts,
        fetchLikedPosts,
        fetchFriendsPosts,
        fetchPostById,
        setCurrentPost,
        likePost,
        unlikePost,
        isPostLiked,
        incrementPostViews,
        addComment,
        deletePost,
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