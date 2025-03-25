// Base item type with common properties
export interface BaseItem {
  id: string;
  image?: any;
  isButton?: boolean;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
}

// Define post type
export interface PostItem extends BaseItem {
  title: string;
  likes?: number;
  content?: string;
}

// Define new post button type
export interface ButtonItem extends BaseItem {
  isButton: true;
  title: string;
  image: null;
}

// Define product type
export interface ProductItem extends BaseItem {
  name: string;
  price: number;
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
  return 'title' in item && !('price' in item);
};

export const isProductItem = (item: any): item is ProductItem => {
  return 'name' in item && 'price' in item;
};

export const isButtonItem = (item: BaseItem): boolean => {
  return item.isButton === true;
};

// Create new post button item
export const newPostButton: ButtonItem = { id: "newPost", isButton: true, title: "", image: null };

// Create new product button item
export const newProductButton: ProductButtonItem = { id: "newProduct", isButton: true, name: "", image: null };

export type ProfileTab = 'posts' | 'products'; 