import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import api from '../utils/apiClient';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

// Define user profile interface based on User model fields
interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  role: 'user' | 'admin';
  lastLogin?: string;
  followerCount: number;
  followingCount: number;
  likedPostsCount: number;
  likedPostIds: string[];
  savedProductIds: string[];
  following?: string[];
  createdAt: string;
  updatedAt: string;
}

// Define the user state interface
interface UserState {
  profile: UserProfile | null;
  followedUsers: UserProfile[];
  followers: UserProfile[];
  loading: boolean;
  error: string | null;
}

// Define actions for user state
type UserAction =
  | { type: 'FETCH_PROFILE_REQUEST' }
  | { type: 'FETCH_PROFILE_SUCCESS'; payload: UserProfile }
  | { type: 'FETCH_PROFILE_FAILURE'; payload: string }
  | { type: 'UPDATE_PROFILE_REQUEST' }
  | { type: 'UPDATE_PROFILE_SUCCESS'; payload: UserProfile }
  | { type: 'UPDATE_PROFILE_FAILURE'; payload: string }
  | { type: 'FETCH_FOLLOWERS_REQUEST' }
  | { type: 'FETCH_FOLLOWERS_SUCCESS'; payload: UserProfile[] }
  | { type: 'FETCH_FOLLOWERS_FAILURE'; payload: string }
  | { type: 'FETCH_FOLLOWING_REQUEST' }
  | { type: 'FETCH_FOLLOWING_SUCCESS'; payload: UserProfile[] }
  | { type: 'FETCH_FOLLOWING_FAILURE'; payload: string }
  | { type: 'FOLLOW_USER_REQUEST'; payload: string }
  | { type: 'FOLLOW_USER_SUCCESS'; payload: string }
  | { type: 'FOLLOW_USER_FAILURE'; payload: string }
  | { type: 'UNFOLLOW_USER_REQUEST'; payload: string }
  | { type: 'UNFOLLOW_USER_SUCCESS'; payload: string }
  | { type: 'UNFOLLOW_USER_FAILURE'; payload: string }
  | { type: 'SAVE_PRODUCT_SUCCESS'; payload: string }
  | { type: 'UNSAVE_PRODUCT_SUCCESS'; payload: string }
  | { type: 'LIKE_POST_SUCCESS'; payload: string }
  | { type: 'UNLIKE_POST_SUCCESS'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile };

// Define interface for profile update data
interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
}

// Initial state
const initialState: UserState = {
  profile: null,
  followedUsers: [],
  followers: [],
  loading: false,
  error: null,
};

// User reducer
const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'FETCH_PROFILE_REQUEST':
    case 'UPDATE_PROFILE_REQUEST':
    case 'FETCH_FOLLOWERS_REQUEST':
    case 'FETCH_FOLLOWING_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_PROFILE_SUCCESS':
    case 'UPDATE_PROFILE_SUCCESS':
      return {
        ...state,
        profile: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_PROFILE_FAILURE':
    case 'UPDATE_PROFILE_FAILURE':
    case 'FETCH_FOLLOWERS_FAILURE':
    case 'FETCH_FOLLOWING_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'FETCH_FOLLOWERS_SUCCESS':
      return {
        ...state,
        followers: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_FOLLOWING_SUCCESS':
      return {
        ...state,
        followedUsers: action.payload,
        loading: false,
        error: null,
      };
    case 'FOLLOW_USER_SUCCESS':
      if (!state.profile) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          following: [...(state.profile.following || []), action.payload],
        },
        loading: false,
        error: null,
      };
    case 'UNFOLLOW_USER_SUCCESS':
      return {
        ...state,
        followedUsers: state.followedUsers.filter(user => user.id !== action.payload),
        profile: state.profile ? {
          ...state.profile,
          followingCount: state.profile.followingCount - 1
        } : null,
      };
    case 'SAVE_PRODUCT_SUCCESS':
      return {
        ...state,
        profile: state.profile ? {
          ...state.profile,
          savedProductIds: [...state.profile.savedProductIds, action.payload]
        } : null,
      };
    case 'UNSAVE_PRODUCT_SUCCESS':
      return {
        ...state,
        profile: state.profile ? {
          ...state.profile,
          savedProductIds: state.profile.savedProductIds.filter(id => id !== action.payload)
        } : null,
      };
    case 'LIKE_POST_SUCCESS':
      return {
        ...state,
        profile: state.profile ? {
          ...state.profile,
          likedPostIds: [...state.profile.likedPostIds, action.payload],
          likedPostsCount: state.profile.likedPostsCount + 1
        } : null,
      };
    case 'UNLIKE_POST_SUCCESS':
      return {
        ...state,
        profile: state.profile ? {
          ...state.profile,
          likedPostIds: state.profile.likedPostIds.filter(id => id !== action.payload),
          likedPostsCount: state.profile.likedPostsCount - 1
        } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_USER_PROFILE':
      return {
        ...state,
        profile: action.payload,
      };
    default:
      return state;
  }
};

// Create the user context
export interface UserContextProps {
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
  fetchUserProfile: (userId?: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  fetchFollowers: (userId?: string) => Promise<void>;
  fetchFollowing: (userId?: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  saveProduct: (productId: string) => Promise<void>;
  unsaveProduct: (productId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  hasLikedPost: (postId: string) => boolean;
  hasSavedProduct: (productId: string) => boolean;
  isFollowing: (userId: string) => boolean;
  clearError: () => void;
  getUserProfile: () => Promise<void>;
  updateUserProfile: (formData: FormData) => Promise<void>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

// User provider props
interface UserProviderProps {
  children: ReactNode;
}

// Create the user provider
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { state: authState } = useAuth();

  // Fetch the current user's profile when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      fetchUserProfile();
    }
  }, [authState.isAuthenticated, authState.user]);

  // Fetch user profile by ID or current user if no ID provided
  const fetchUserProfile = async (userId?: string) => {
    dispatch({ type: 'FETCH_PROFILE_REQUEST' });

    try {
      const endpoint = userId ? `/users/${userId}` : `/users/${authState.user?.id}`;
      const response = await api.get(endpoint);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_PROFILE_SUCCESS',
          payload: response.data.user,
        });
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      let errorMessage = 'Failed to fetch user profile';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Update user profile
  const updateProfile = async (data: ProfileUpdateData) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: 'You must be logged in to update your profile',
      });
      return;
    }

    dispatch({ type: 'UPDATE_PROFILE_REQUEST' });

    try {
      const response = await api.put(`/users/${authState.user?.id}`, data);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'UPDATE_PROFILE_SUCCESS',
          payload: response.data.user,
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      let errorMessage = 'Failed to update profile';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Fetch followers
  const fetchFollowers = async (userId?: string) => {
    const targetUserId = userId || authState.user?.id;
    
    if (!targetUserId) {
      dispatch({
        type: 'FETCH_FOLLOWERS_FAILURE',
        payload: 'User ID is required',
      });
      return;
    }

    dispatch({ type: 'FETCH_FOLLOWERS_REQUEST' });

    try {
      const response = await api.get(`/users/${targetUserId}/followers`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_FOLLOWERS_SUCCESS',
          payload: response.data.followers,
        });
      } else {
        throw new Error('Failed to fetch followers');
      }
    } catch (error) {
      let errorMessage = 'Failed to fetch followers';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_FOLLOWERS_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Fetch following
  const fetchFollowing = async (userId?: string) => {
    const targetUserId = userId || authState.user?.id;
    
    if (!targetUserId) {
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: 'User ID is required',
      });
      return;
    }

    dispatch({ type: 'FETCH_FOLLOWING_REQUEST' });

    try {
      const response = await api.get(`/users/${targetUserId}/following`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_FOLLOWING_SUCCESS',
          payload: response.data.following,
        });
      } else {
        throw new Error('Failed to fetch following users');
      }
    } catch (error) {
      let errorMessage = 'Failed to fetch following users';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Follow user
  const followUser = async (userId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: 'You must be logged in to follow users',
      });
      return;
    }

    try {
      const response = await api.post(`/users/${userId}/follow`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FOLLOW_USER_SUCCESS',
          payload: response.data.user,
        });
      } else {
        throw new Error('Failed to follow user');
      }
    } catch (error) {
      let errorMessage = 'Failed to follow user';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Unfollow user
  const unfollowUser = async (userId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: 'You must be logged in to unfollow users',
      });
      return;
    }

    try {
      const response = await api.post(`/users/${userId}/unfollow`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'UNFOLLOW_USER_SUCCESS',
          payload: userId,
        });
      } else {
        throw new Error('Failed to unfollow user');
      }
    } catch (error) {
      let errorMessage = 'Failed to unfollow user';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_FOLLOWING_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Save product
  const saveProduct = async (productId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: 'You must be logged in to save products',
      });
      return;
    }

    try {
      const response = await api.post(`/products/${productId}/save`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'SAVE_PRODUCT_SUCCESS',
          payload: productId,
        });
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      let errorMessage = 'Failed to save product';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Unsave product
  const unsaveProduct = async (productId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: 'You must be logged in to unsave products',
      });
      return;
    }

    try {
      const response = await api.post(`/products/${productId}/unsave`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'UNSAVE_PRODUCT_SUCCESS',
          payload: productId,
        });
      } else {
        throw new Error('Failed to unsave product');
      }
    } catch (error) {
      let errorMessage = 'Failed to unsave product';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Like post
  const likePost = async (postId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: 'You must be logged in to like posts',
      });
      return;
    }

    try {
      const response = await api.post(`/posts/${postId}/like`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'LIKE_POST_SUCCESS',
          payload: postId,
        });
      } else {
        throw new Error('Failed to like post');
      }
    } catch (error) {
      let errorMessage = 'Failed to like post';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Unlike post
  const unlikePost = async (postId: string) => {
    if (!authState.isAuthenticated) {
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: 'You must be logged in to unlike posts',
      });
      return;
    }

    try {
      const response = await api.post(`/posts/${postId}/unlike`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'UNLIKE_POST_SUCCESS',
          payload: postId,
        });
      } else {
        throw new Error('Failed to unlike post');
      }
    } catch (error) {
      let errorMessage = 'Failed to unlike post';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Check if user has liked a post
  const hasLikedPost = (postId: string): boolean => {
    return state.profile?.likedPostIds.includes(postId) || false;
  };

  // Check if user has saved a product
  const hasSavedProduct = (productId: string): boolean => {
    return state.profile?.savedProductIds.includes(productId) || false;
  };

  // Check if user is following another user
  const isFollowing = (userId: string): boolean => {
    return state.followedUsers.some(user => user.id === userId) || false;
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const getUserProfile = async () => {
    await fetchUserProfile();
  };

  const updateUserProfile = async (formData: FormData) => {
    try {
      dispatch({ type: 'UPDATE_PROFILE_REQUEST' });
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_URL}/api/users/profile/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: data.user });
      
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      dispatch({ type: 'UPDATE_PROFILE_FAILURE', payload: error.message });
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        state,
        dispatch,
        fetchUserProfile,
        updateProfile,
        fetchFollowers,
        fetchFollowing,
        followUser,
        unfollowUser,
        saveProduct,
        unsaveProduct,
        likePost,
        unlikePost,
        hasLikedPost,
        hasSavedProduct,
        isFollowing,
        clearError,
        getUserProfile,
        updateUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Create a hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};
