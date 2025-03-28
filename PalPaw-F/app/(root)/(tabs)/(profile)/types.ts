// Base item type with common properties
export interface BaseItem {
  id: string;
  image?: {uri?: string} | null;
  isButton?: boolean;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  thumbnailUri?: string;
  allMedia?: any[];
}

// Define post type
export interface PostItem extends BaseItem {
  userId?: string;
  title?: string;
  likes?: number;
  views?: number;
  content?: string;
  createdAt?: Date;
  updatedAt?: Date;
  location?: string | null;
  visibility?: 'public' | 'private' | 'followers';
  isDeleted?: boolean;
  media?: any[];
  imageUrl?: string;
  authorData?: {
    id: string;
    username: string;
    avatar: string;
  };
  comments?: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
    avatarUri: string;
    likes: number;
  }>;
  tags?: string[];
}

// Define new post button type
export interface ButtonItem extends BaseItem {
  isButton: true;
  title: string;
  image: null;
}

// Define product type
export interface ProductItem extends BaseItem {
  userId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  media: any[];
  quantity: number;
  status: 'active' | 'sold' | 'archived';
  tags: string[];
  shipping: any;
  views: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sellerData?: {
    id: string;
    username: string;
    avatar: string;
  };
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  thumbnailUri?: string;
  allMedia?: any[];
  isSaved?: boolean;
  rating?: number;
  sold?: number;
}

// Define new product button type
export interface ProductButtonItem extends BaseItem {
  isButton: true;
  name: string;
  image: null;
}

// Define user type
export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  email?: string;
  stats?: {
    posts?: number;
    followers?: number;
    following?: number;
    products?: number;
  };
}

// Type guard functions
export const isPostItem = (item: any): item is PostItem => {
  if (!item) return false;
  return ('title' in item && !('price' in item)) || ('content' in item);
};

export const isProductItem = (item: any): item is ProductItem => {
  if (!item) return false;
  return ('name' in item && 'price' in item) || ('rating' in item && 'sold' in item);
};

export const isButtonItem = (item: BaseItem): boolean => {
  return !!item && item.isButton === true;
};

// Create new post button item
export const newPostButton: ButtonItem = { id: "newPost", isButton: true, title: "", image: null };

// Create new product button item
export const newProductButton: ProductButtonItem = { id: "newProduct", isButton: true, name: "", image: null };

export type ProfileTab = 'posts' | 'products' | 'liked'; 