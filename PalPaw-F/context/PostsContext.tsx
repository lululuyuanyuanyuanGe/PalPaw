import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import { PostItem } from '../app/(root)/(tabs)/(profile)/types';
import { fetchUserPosts, fetchPostsFallback } from '../app/(root)/(tabs)/(profile)/renderService';

// Define the context state interface
interface PostsState {
  posts: PostItem[];
  userPosts: PostItem[];
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
  | { type: 'SET_CURRENT_POST'; payload: PostItem }
  | { type: 'CLEAR_CURRENT_POST' }
  | { type: 'LIKE_POST'; payload: string } // Post ID
  | { type: 'UNLIKE_POST'; payload: string } // Post ID
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
    case 'LIKE_POST':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload
          ? { ...state.currentPost, likes: (state.currentPost.likes || 0) + 1 }
          : state.currentPost,
      };
    case 'UNLIKE_POST':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload && (post.likes || 0) > 0
            ? { ...post, likes: (post.likes || 0) - 1 }
            : post
        ),
        userPosts: state.userPosts.map(post =>
          post.id === action.payload && (post.likes || 0) > 0
            ? { ...post, likes: (post.likes || 0) - 1 }
            : post
        ),
        currentPost: state.currentPost?.id === action.payload && (state.currentPost.likes || 0) > 0
          ? { ...state.currentPost, likes: (state.currentPost.likes || 0) - 1 }
          : state.currentPost,
      };
    case 'ADD_COMMENT':
      // In a real app, you'd update the post to include the new comment
      // Here we're just demonstrating the structure
      return state;
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
  setCurrentPost: (post: PostItem) => void;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
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
  const fetchUserPostsById = async (userId: string) => {
    dispatch({ type: 'FETCH_POSTS_REQUEST' });
    try {
      const posts = await fetchUserPosts(userId);
      dispatch({ type: 'FETCH_USER_POSTS_SUCCESS', payload: posts });
    } catch (error) {
      dispatch({
        type: 'FETCH_USER_POSTS_FAILURE',
        payload: 'Failed to fetch user posts',
      });
    }
  };

  // Function to set current post
  const setCurrentPost = (post: PostItem) => {
    dispatch({ type: 'SET_CURRENT_POST', payload: post });
  };

  // Function to like a post
  const likePost = (postId: string) => {
    dispatch({ type: 'LIKE_POST', payload: postId });
    // In a real app, you would make an API call to like the post
  };

  // Function to unlike a post
  const unlikePost = (postId: string) => {
    dispatch({ type: 'UNLIKE_POST', payload: postId });
    // In a real app, you would make an API call to unlike the post
  };

  // Function to add a comment
  const addComment = (postId: string, comment: Comment) => {
    dispatch({
      type: 'ADD_COMMENT',
      payload: { postId, comment },
    });
    // In a real app, you would make an API call to add the comment
  };

  return (
    <PostsContext.Provider
      value={{
        state,
        dispatch,
        fetchPosts,
        fetchUserPosts: fetchUserPostsById,
        setCurrentPost,
        likePost,
        unlikePost,
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