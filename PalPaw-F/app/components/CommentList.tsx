import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../utils/apiClient';

// Types
interface CommentAuthor {
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

interface CommentListProps {
  postId: string;
  onCommentsLoaded?: (count: number) => void;
}

// Utility function to format relative time
const formatRelativeTime = (date: string | Date): string => {
  if (!date) return "Recent";
  
  // Convert to milliseconds if it's a string
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const now = new Date().getTime();
  const diff = now - timestamp;
  
  // Calculate time difference in various units
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Return appropriate formatted string
  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else if (weeks < 4) {
    return `${weeks}w ago`;
  } else if (months < 12) {
    return `${months}mo ago`;
  } else {
    return `${years}y ago`;
  }
};

// Single Comment Component
const CommentItem: React.FC<{
  comment: CommentItem;
  onReply: (commentId: string, author: string) => void;
  onLike: (commentId: string) => void;
  nested?: boolean;
}> = ({ comment, onReply, onLike, nested = false }) => {
  const likeScale = useSharedValue(1);
  const likeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeScale.value }]
    };
  });

  const handleLikePress = () => {
    likeScale.value = withSpring(1.3, { damping: 10 }, () => {
      likeScale.value = withSpring(1);
    });
    onLike(comment.id);
  };

  return (
    <View className={`${nested ? 'ml-12 mt-2' : 'mb-4'} bg-white p-4 rounded-xl shadow-sm border border-gray-50`}>
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: comment.author.avatar || 'https://robohash.org/unknown?set=set4' }}
          className="w-9 h-9 rounded-full border-2 border-purple-100"
        />
        <View className="ml-3 flex-1">
          <Text className="font-rubik-semibold text-gray-800">{comment.author.username}</Text>
          <Text className="font-rubik text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</Text>
        </View>
      </View>
      
      <Text className="font-rubik text-gray-700 leading-5 mb-2">{comment.content}</Text>
      
      <View className="flex-row items-center mt-1">
        <TouchableOpacity className="flex-row items-center mr-4" onPress={handleLikePress}>
          <Animated.View style={likeAnimatedStyle}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
          </Animated.View>
          <Text className="ml-1 text-xs text-gray-500 font-rubik">{Math.max(0, comment.likes || 0)}</Text>
        </TouchableOpacity>
        
        {!nested && (
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => onReply(comment.id, comment.author.username)}
          >
            <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
            <Text className="ml-1 text-xs text-gray-500 font-rubik">Reply</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Main CommentList Component
const CommentList: React.FC<CommentListProps> = ({ postId, onCommentsLoaded }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{id: string | null, username: string | null}>({
    id: null, 
    username: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // Fetch current user info
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setUserId(parsedUserData.id);
          setUserName(parsedUserData.username);
          setUserAvatar(parsedUserData.avatar);
        }
      } catch (err) {
        console.error('Error getting user data:', err);
      }
    };
    
    getUserInfo();
  }, []);

  // Fetch comments for the post
  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    if (!postId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/comments/post/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setComments(response.data.comments);
        
        // Count total comments including replies
        let totalCount = 0;
        if (response.data.comments) {
          totalCount = response.data.comments.reduce((acc: number, comment: CommentItem) => {
            return acc + 1 + (comment.replies?.length || 0);
          }, 0);
        }
        
        // Notify parent component about the number of comments
        if (onCommentsLoaded) {
          onCommentsLoaded(totalCount);
        }
      } else {
        setError('Failed to load comments');
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Error fetching comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to like comments');
        return;
      }
      
      const response = await api.post(`/comments/${commentId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        // Update comment likes in state
        setComments(prevComments => 
          prevComments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, likes: response.data.likes };
            }
            
            // Check in replies
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = comment.replies.map(reply => {
                if (reply.id === commentId) {
                  return { ...reply, likes: response.data.likes };
                }
                return reply;
              });
              
              return { ...comment, replies: updatedReplies };
            }
            
            return comment;
          })
        );
      }
    } catch (err) {
      console.error('Error liking comment:', err);
      Alert.alert('Error', 'Failed to like comment. Please try again.');
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to comment');
        setSubmitting(false);
        return;
      }
      
      const commentData = {
        postId,
        content: newComment.trim(),
        parentId: replyTo.id
      };
      
      const response = await api.post('/comments', commentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        const newCommentData = response.data.comment;
        
        if (replyTo.id) {
          // This is a reply to an existing comment
          setComments(prevComments => 
            prevComments.map(comment => {
              if (comment.id === replyTo.id) {
                const updatedReplies = [...(comment.replies || []), newCommentData];
                return { ...comment, replies: updatedReplies };
              }
              return comment;
            })
          );
        } else {
          // This is a new top-level comment
          setComments(prevComments => [newCommentData, ...prevComments]);
        }
        
        // Clear the input and reset replyTo
        setNewComment('');
        setReplyTo({ id: null, username: null });
        
        // Update comment count
        if (onCommentsLoaded) {
          onCommentsLoaded(comments.length + 1);
        }
      } else {
        Alert.alert('Error', 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
    setNewComment(`@${username} `);
  };

  const cancelReply = () => {
    setReplyTo({ id: null, username: null });
    setNewComment('');
  };

  if (loading && comments.length === 0) {
    return (
      <View className="p-4 items-center justify-center">
        <ActivityIndicator size="small" color="#9333EA" />
        <Text className="mt-2 text-gray-500 font-rubik">Loading comments...</Text>
      </View>
    );
  }

  if (error && comments.length === 0) {
    return (
      <View className="p-4 items-center justify-center">
        <Ionicons name="alert-circle-outline" size={24} color="#F43F5E" />
        <Text className="mt-2 text-red-500 font-rubik">{error}</Text>
        <TouchableOpacity 
          className="mt-2 bg-purple-100 px-4 py-2 rounded-full"
          onPress={fetchComments}
        >
          <Text className="text-purple-600 font-rubik-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-white">
      {/* Reply indicator */}
      {replyTo.id && (
        <View className="flex-row items-center bg-purple-50 p-2 rounded-t-xl">
          <Text className="flex-1 text-purple-600 font-rubik">
            Replying to {replyTo.username}
          </Text>
          <TouchableOpacity onPress={cancelReply}>
            <Ionicons name="close-circle" size={20} color="#9333EA" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Comment input */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <Image
            source={{ uri: userAvatar || 'https://robohash.org/myavatar?set=set4' }}
            className="w-8 h-8 rounded-full mr-3"
          />
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              placeholder={replyTo.id ? `Reply to ${replyTo.username}...` : "Add a comment..."}
              className="flex-1 text-gray-700 font-rubik"
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
            />
            {submitting ? (
              <ActivityIndicator size="small" color="#9333EA" />
            ) : (
              <TouchableOpacity onPress={handleSubmitComment}>
                <Ionicons name="send" size={20} color="#9333EA" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Comments list */}
      {comments.length > 0 ? (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View>
              <CommentItem 
                comment={item} 
                onReply={handleReply} 
                onLike={handleLikeComment}
              />
              
              {/* Render replies */}
              {item.replies && item.replies.length > 0 && (
                item.replies.map(reply => (
                  <CommentItem 
                    key={reply.id}
                    comment={reply} 
                    onReply={handleReply} 
                    onLike={handleLikeComment}
                    nested={true}
                  />
                ))
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500 font-rubik">No comments yet. Be the first to comment!</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchComments}
        />
      ) : (
        <View className="items-center justify-center py-8">
          <Text className="text-gray-500 font-rubik">No comments yet. Be the first to comment!</Text>
        </View>
      )}
    </View>
  );
};

export default CommentList; 