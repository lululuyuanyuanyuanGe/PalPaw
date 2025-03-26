import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '../../../context';
import CommentList from '../../components/CommentList';

const CommentsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const postId = params.id as string;
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Get access to the posts context
  const { state: postsState, fetchPostById } = usePosts();
  const { currentPost } = postsState;
  
  // Fetch post if needed
  useEffect(() => {
    const loadPost = async () => {
      if (!currentPost || currentPost.id !== postId) {
        setLoading(true);
        await fetchPostById(postId);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    
    loadPost();
  }, [postId]);
  
  // Handle when comments are loaded
  const handleCommentsLoaded = (count: number) => {
    setCommentCount(count);
  };
  
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Custom Header */}
      <View className="bg-white shadow-sm">
        <View className="flex-row items-center px-4 pt-6 pb-4">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-2"
            accessibilityLabel="Back button"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">
            Comments {commentCount > 0 ? `(${commentCount})` : ''}
          </Text>
        </View>
      </View>
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
          <Text className="mt-4 text-gray-600 font-rubik">Loading comments...</Text>
        </View>
      ) : (
        <View className="flex-1">
          {currentPost && (
            <CommentList 
              postId={currentPost.id} 
              onCommentsLoaded={handleCommentsLoaded} 
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default CommentsScreen; 