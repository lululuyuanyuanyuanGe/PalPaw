import api, { getUserProducts, getUserPosts } from "@/utils/apiClient";
import { PostItem, ProductItem } from "./types";
import { usePosts } from "@/context";
import { formatImageUrl, isVideoUrl, processMediaFiles } from '@/utils/mediaUtils';

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Helper function to standardize post data format
export const standardizePostFormat = (post: any): any => {
  console.log("Standardizing post format for id:", post.id);
  
  // Process author data
  let authorData = null;
  if (post.authorData) {
    authorData = post.authorData;
  } else if (post.author) {
    authorData = {
      id: post.author.id,
      username: post.author.username,
      avatar: post.author.avatar || 'https://robohash.org/default?set=set4'
    };
  } else if (post.userId || post.user_id) {
    const userId = post.userId || post.user_id;
    authorData = {
      id: userId,
      username: 'User',
      avatar: `https://robohash.org/${userId}?set=set4`
    };
  }
  
  // Process media for consistent format
  let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
  let mediaType: 'image' | 'video' = 'image';
  let mediaUrl = '';
  let thumbnailUri = '';
  
  // Process media array to find the right thumbnail
  if (post.media && Array.isArray(post.media) && post.media.length > 0) {
    // Use the shared utility function
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
  
  // Ensure tags is always an array
  const tags = Array.isArray(post.tags) ? post.tags : [];
  
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

// Fetch user posts - deprecated in favor of context methods
export const fetchUserPosts = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext methods directly.");
  return [];
};

// Fetch user posts fallback - also deprecated
export const fetchUserPostsFallback = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext methods directly.");
  return [];
};

// Fallback function - also deprecated in favor of context methods
export const fetchPostsFallback = async (userId: string): Promise<PostItem[]> => {
  console.log("ProfileService: This function is deprecated. Use PostsContext methods directly.");
  return [];
};

// Fetch user's products