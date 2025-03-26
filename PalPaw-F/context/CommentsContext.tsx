import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';
import { Alert } from 'react-native';

// Define interfaces for comments
export interface CommentAuthor {
  id: string;
  username: string;
  avatar: string;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  author: CommentAuthor;
  isReply?: boolean;
  parentId?: string | null;
  replies?: CommentItem[];
}

// Define the context state interface
interface CommentsState {
  postComments: { [postId: string]: CommentItem[] };
  totalCounts: { [postId: string]: number };
  loading: boolean;
  error: string | null;
}

// Define actions that can be dispatched
export type CommentsAction =
  | { type: 'FETCH_COMMENTS_REQUEST' }
  | { type: 'FETCH_COMMENTS_SUCCESS'; payload: { postId: string; comments: CommentItem[]; totalCount: number } }
  | { type: 'FETCH_COMMENTS_FAILURE'; payload: string }
  | { type: 'ADD_COMMENT_SUCCESS'; payload: { postId: string; comment: CommentItem } }
  | { type: 'ADD_COMMENT_FAILURE'; payload: string }
  | { type: 'LIKE_COMMENT_SUCCESS'; payload: { commentId: string; postId: string; likes: number } }
  | { type: 'LIKE_COMMENT_FAILURE'; payload: string }
  | { type: 'UNLIKE_COMMENT_SUCCESS'; payload: { commentId: string; postId: string; likes: number } }
  | { type: 'UNLIKE_COMMENT_FAILURE'; payload: string }
  | { type: 'CLEAR_COMMENTS'; payload: { postId: string } }
  | { type: 'CLEAR_ERRORS' };

// Define initial state
const initialState: CommentsState = {
  postComments: {},
  totalCounts: {},
  loading: false,
  error: null,
};

// Helper function to count total comments including replies
const countTotalComments = (comments: CommentItem[]): number => {
  return comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);
};

// Create the reducer function
const commentsReducer = (state: CommentsState, action: CommentsAction): CommentsState => {
  switch (action.type) {
    case 'FETCH_COMMENTS_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_COMMENTS_SUCCESS':
      return {
        ...state,
        postComments: {
          ...state.postComments,
          [action.payload.postId]: action.payload.comments,
        },
        totalCounts: {
          ...state.totalCounts,
          [action.payload.postId]: action.payload.totalCount,
        },
        loading: false,
        error: null,
      };
    case 'FETCH_COMMENTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'ADD_COMMENT_SUCCESS': {
      const { postId, comment } = action.payload;
      let updatedComments = [...(state.postComments[postId] || [])];
      
      // If it's a reply to an existing comment, add it to the replies array
      if (comment.parentId) {
        updatedComments = updatedComments.map(existingComment => {
          if (existingComment.id === comment.parentId) {
            return {
              ...existingComment,
              replies: [comment, ...(existingComment.replies || [])],
            };
          }
          return existingComment;
        });
      } else {
        // Otherwise, add as a top-level comment
        updatedComments = [comment, ...updatedComments];
      }
      
      // Update total count
      const newTotalCount = (state.totalCounts[postId] || 0) + 1;
      
      return {
        ...state,
        postComments: {
          ...state.postComments,
          [postId]: updatedComments,
        },
        totalCounts: {
          ...state.totalCounts,
          [postId]: newTotalCount,
        },
        loading: false,
        error: null,
      };
    }
    case 'ADD_COMMENT_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'LIKE_COMMENT_SUCCESS': {
      const { commentId, postId, likes } = action.payload;
      const updatedComments = (state.postComments[postId] || []).map(comment => {
        if (comment.id === commentId) {
          return { ...comment, likes };
        }
        
        // Check in replies
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId ? { ...reply, likes } : reply
            ),
          };
        }
        
        return comment;
      });
      
      return {
        ...state,
        postComments: {
          ...state.postComments,
          [postId]: updatedComments,
        },
      };
    }
    case 'LIKE_COMMENT_FAILURE':
    case 'UNLIKE_COMMENT_FAILURE':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_COMMENTS':
      const { [action.payload.postId]: _, ...remainingComments } = state.postComments;
      const { [action.payload.postId]: __, ...remainingCounts } = state.totalCounts;
      
      return {
        ...state,
        postComments: remainingComments,
        totalCounts: remainingCounts,
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

// Create the context
interface CommentsContextType {
  state: CommentsState;
  dispatch: React.Dispatch<CommentsAction>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string | null) => Promise<CommentItem | null>;
  likeComment: (commentId: string, postId: string) => Promise<boolean>;
  unlikeComment: (commentId: string, postId: string) => Promise<boolean>;
  clearComments: (postId: string) => void;
}

// Create the context with default values
const CommentsContext = createContext<CommentsContextType | undefined>(undefined);

// Create a provider component
interface CommentsProviderProps {
  children: ReactNode;
}

export const CommentsProvider: React.FC<CommentsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(commentsReducer, initialState);

  // Function to fetch comments for a specific post
  const fetchComments = async (postId: string): Promise<void> => {
    if (!postId) return;

    dispatch({ type: 'FETCH_COMMENTS_REQUEST' });

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch({
          type: 'FETCH_COMMENTS_FAILURE',
          payload: 'Authentication required',
        });
        return;
      }

      const response = await api.get(`/comments/post/${postId}`);

      if (response.data && response.data.success) {
        const comments = response.data.comments || [];
        const totalCount = countTotalComments(comments);
        
        dispatch({
          type: 'FETCH_COMMENTS_SUCCESS',
          payload: {
            postId,
            comments,
            totalCount,
          },
        });
      } else {
        dispatch({
          type: 'FETCH_COMMENTS_FAILURE',
          payload: 'Failed to load comments',
        });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      dispatch({
        type: 'FETCH_COMMENTS_FAILURE',
        payload: 'Error fetching comments. Please try again.',
      });
    }
  };

  // Function to add a new comment
  const addComment = async (
    postId: string,
    content: string,
    parentId: string | null = null
  ): Promise<CommentItem | null> => {
    if (!content.trim()) return null;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to comment');
        return null;
      }

      const commentData = {
        postId,
        content: content.trim(),
        parentId
      };

      const response = await api.post('/comments', commentData);

      if (response.data && response.data.success) {
        const newComment = response.data.comment;
        
        if (!newComment.author || !newComment.author.avatar) {
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            const user = JSON.parse(userString);
            if (!newComment.author) {
              newComment.author = {
                id: user.id,
                username: user.username,
                avatar: user.avatar || `https://robohash.org/${user.id}?set=set4`,
              };
            } else if (!newComment.author.avatar) {
              newComment.author.avatar = user.avatar || `https://robohash.org/${user.id}?set=set4`;
            }
          }
        }
        
        dispatch({
          type: 'ADD_COMMENT_SUCCESS',
          payload: {
            postId,
            comment: newComment,
          },
        });
        
        return newComment;
      } else {
        Alert.alert('Error', 'Failed to post comment');
        dispatch({
          type: 'ADD_COMMENT_FAILURE',
          payload: 'Failed to add comment',
        });
        return null;
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
      dispatch({
        type: 'ADD_COMMENT_FAILURE',
        payload: 'Error posting comment',
      });
      return null;
    }
  };

  // Function to like a comment
  const likeComment = async (commentId: string, postId: string): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to like comments');
        return false;
      }

      const response = await api.post(`/comments/${commentId}/like`);

      if (response.data && response.data.success) {
        dispatch({
          type: 'LIKE_COMMENT_SUCCESS',
          payload: {
            commentId,
            postId,
            likes: response.data.likes,
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error liking comment:', error);
      dispatch({
        type: 'LIKE_COMMENT_FAILURE',
        payload: 'Failed to like comment',
      });
      return false;
    }
  };

  // Function to unlike a comment
  const unlikeComment = async (commentId: string, postId: string): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to unlike comments');
        return false;
      }

      const response = await api.post(`/comments/${commentId}/unlike`);

      if (response.data && response.data.success) {
        dispatch({
          type: 'LIKE_COMMENT_SUCCESS',
          payload: {
            commentId,
            postId,
            likes: response.data.likes,
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unliking comment:', error);
      dispatch({
        type: 'UNLIKE_COMMENT_FAILURE',
        payload: 'Failed to unlike comment',
      });
      return false;
    }
  };

  // Function to clear comments for a specific post
  const clearComments = (postId: string) => {
    dispatch({
      type: 'CLEAR_COMMENTS',
      payload: { postId },
    });
  };

  return (
    <CommentsContext.Provider
      value={{
        state,
        dispatch,
        fetchComments,
        addComment,
        likeComment,
        unlikeComment,
        clearComments,
      }}
    >
      {children}
    </CommentsContext.Provider>
  );
};

// Custom hook to use the comments context
export const useComments = () => {
  const context = useContext(CommentsContext);
  if (context === undefined) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
}; 