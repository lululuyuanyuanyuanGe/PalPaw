import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import api from '../utils/apiClient';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simplified user profile interface with only essential fields
interface UserProfile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  following?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Simplified user state interface
interface UserState {
  profile: UserProfile | null;
  otherUserProfile: UserProfile | null;
  otherUserFollowers: UserProfile[];
  otherUserFollowing: UserProfile[];
  followedUsers: UserProfile[];
  followers: UserProfile[];
  loading: boolean;
  error: string | null;
}

// Simplified actions for user state
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
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }
  | { type: 'FETCH_OTHER_USER_PROFILE_REQUEST' }
  | { type: 'FETCH_OTHER_USER_PROFILE_SUCCESS'; payload: UserProfile }
  | { type: 'FETCH_OTHER_USER_PROFILE_FAILURE'; payload: string }
  | { type: 'FETCH_OTHER_USER_FOLLOWERS_REQUEST' }
  | { type: 'FETCH_OTHER_USER_FOLLOWERS_SUCCESS'; payload: UserProfile[] }
  | { type: 'FETCH_OTHER_USER_FOLLOWERS_FAILURE'; payload: string }
  | { type: 'FETCH_OTHER_USER_FOLLOWING_REQUEST' }
  | { type: 'FETCH_OTHER_USER_FOLLOWING_SUCCESS'; payload: UserProfile[] }
  | { type: 'FETCH_OTHER_USER_FOLLOWING_FAILURE'; payload: string };

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
  otherUserProfile: null,
  otherUserFollowers: [],
  otherUserFollowing: [],
  followedUsers: [],
  followers: [],
  loading: false,
  error: null,
};

// Simplified user reducer
const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'FETCH_PROFILE_REQUEST':
    case 'UPDATE_PROFILE_REQUEST':
    case 'FETCH_FOLLOWERS_REQUEST':
    case 'FETCH_FOLLOWING_REQUEST':
    case 'FETCH_OTHER_USER_PROFILE_REQUEST':
    case 'FETCH_OTHER_USER_FOLLOWERS_REQUEST':
    case 'FETCH_OTHER_USER_FOLLOWING_REQUEST':
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
    case 'FETCH_OTHER_USER_PROFILE_SUCCESS':
      return {
        ...state,
        otherUserProfile: action.payload,
        loading: false,
        error: null,
      };
    case 'FETCH_PROFILE_FAILURE':
    case 'UPDATE_PROFILE_FAILURE':
    case 'FETCH_FOLLOWERS_FAILURE':
    case 'FETCH_FOLLOWING_FAILURE':
    case 'FETCH_OTHER_USER_PROFILE_FAILURE':
    case 'FETCH_OTHER_USER_FOLLOWERS_FAILURE':
    case 'FETCH_OTHER_USER_FOLLOWING_FAILURE':
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
    case 'FETCH_OTHER_USER_FOLLOWERS_SUCCESS':
      return {
        ...state,
        otherUserFollowers: action.payload,
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
    case 'FETCH_OTHER_USER_FOLLOWING_SUCCESS':
      return {
        ...state,
        otherUserFollowing: action.payload,
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
          followingCount: state.profile.followingCount + 1
        },
        loading: false,
        error: null,
      };
    case 'UNFOLLOW_USER_SUCCESS':
      if (!state.profile) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          following: state.profile.following?.filter(id => id !== action.payload),
          followingCount: state.profile.followingCount - 1
        },
        followedUsers: state.followedUsers.filter(user => user.id !== action.payload),
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

// Create the user context with simplified interface
export interface UserContextProps {
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
  fetchUserProfile: (userId?: string) => Promise<UserProfile | null>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  fetchFollowers: (userId?: string) => Promise<void>;
  fetchFollowing: (userId?: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  clearError: () => void;
  getUserProfile: () => Promise<UserProfile | null>;
  updateUserProfile: (formData: FormData) => Promise<void>;
  fetchOtherUserProfile: (userId: string) => Promise<void>;
  fetchOtherUserFollowers: (userId: string) => Promise<void>;
  fetchOtherUserFollowing: (userId: string) => Promise<void>;
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
      fetchUserProfile(authState.user.id);
    }
  }, [authState.isAuthenticated, authState.user]);

  // Fetch user profile by ID or current user if no ID provided
  const fetchUserProfile = async (userId?: string) => {
    dispatch({ type: 'FETCH_PROFILE_REQUEST' });

    try {
      // Verify we have a token
      const token = await AsyncStorage.getItem('token');
      if (!token && !userId) {
        throw new Error('Authentication required to access your profile');
      }
      
      // Use 'me' as the ID when fetching the current user's profile
      const endpoint = `/users/${userId || 'me'}`;
      
      console.log(`Fetching user profile from endpoint: ${endpoint}`);
      const response = await api.get(endpoint, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.data && response.data.success) {
        console.log('Profile fetch successful:', response.data.user);
        
        // Extract only the fields we need to store in context
        const profileData: UserProfile = {
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          avatar: response.data.user.avatar,
          bio: response.data.user.bio,
          followerCount: response.data.user.followerCount || 0,
          followingCount: response.data.user.followingCount || 0,
          following: response.data.user.following || [],
          createdAt: response.data.user.createdAt,
          updatedAt: response.data.user.updatedAt
        };
        
        dispatch({
          type: 'FETCH_PROFILE_SUCCESS',
          payload: profileData,
        });
        return profileData;
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      let errorMessage = 'Failed to fetch user profile';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'FETCH_PROFILE_FAILURE',
        payload: errorMessage,
      });
      throw error;
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
      // Use the standard profile update endpoint
      const response = await api.put('/users/profile/update', data);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'UPDATE_PROFILE_SUCCESS',
          payload: response.data.user,
        });
        return response.data.user;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      let errorMessage = 'Failed to update profile';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({
        type: 'UPDATE_PROFILE_FAILURE',
        payload: errorMessage,
      });
      throw error;
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
          payload: userId,
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

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const getUserProfile = async () => {
    try {
      dispatch({ type: 'FETCH_PROFILE_REQUEST' });
      const userData = await fetchUserProfile(authState.user?.id);
      return userData;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  };

  const updateUserProfile = async (formData: FormData) => {
    try {
      dispatch({ type: 'UPDATE_PROFILE_REQUEST' });
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Updating user profile with form data:', Object.fromEntries(formData.entries()));
      
      // Use new endpoint for profile updates
      const response = await api.put('/upload/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Profile update response:', response.data);
      
      if (response.data?.success) {
        dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: response.data.user });
        
        // Refresh the profile after update
        await fetchUserProfile(authState.user?.id);
        return response.data.user;
      } else {
        throw new Error(response.data?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      dispatch({ type: 'UPDATE_PROFILE_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Fetch another user's profile
  const fetchOtherUserProfile = async (userId: string) => {
    if (!userId) {
      dispatch({
        type: 'FETCH_OTHER_USER_PROFILE_FAILURE',
        payload: 'User ID is required',
      });
      return;
    }

    dispatch({ type: 'FETCH_OTHER_USER_PROFILE_REQUEST' });

    try {
      const response = await api.get(`/users/${userId}`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_OTHER_USER_PROFILE_SUCCESS',
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
        type: 'FETCH_OTHER_USER_PROFILE_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Fetch another user's followers
  const fetchOtherUserFollowers = async (userId: string) => {
    if (!userId) {
      dispatch({
        type: 'FETCH_OTHER_USER_FOLLOWERS_FAILURE',
        payload: 'User ID is required',
      });
      return;
    }

    dispatch({ type: 'FETCH_OTHER_USER_FOLLOWERS_REQUEST' });

    try {
      const response = await api.get(`/users/${userId}/followers`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_OTHER_USER_FOLLOWERS_SUCCESS',
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
        type: 'FETCH_OTHER_USER_FOLLOWERS_FAILURE',
        payload: errorMessage,
      });
    }
  };

  // Fetch another user's following
  const fetchOtherUserFollowing = async (userId: string) => {
    if (!userId) {
      dispatch({
        type: 'FETCH_OTHER_USER_FOLLOWING_FAILURE',
        payload: 'User ID is required',
      });
      return;
    }

    dispatch({ type: 'FETCH_OTHER_USER_FOLLOWING_REQUEST' });

    try {
      const response = await api.get(`/users/${userId}/following`);
      
      if (response.data && response.data.success) {
        dispatch({
          type: 'FETCH_OTHER_USER_FOLLOWING_SUCCESS',
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
        type: 'FETCH_OTHER_USER_FOLLOWING_FAILURE',
        payload: errorMessage,
      });
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
        clearError,
        getUserProfile,
        updateUserProfile,
        fetchOtherUserProfile,
        fetchOtherUserFollowers,
        fetchOtherUserFollowing,
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
