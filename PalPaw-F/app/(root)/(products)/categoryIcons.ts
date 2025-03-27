import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

// Define type for MaterialCommunityIcons name prop
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Function to get icon name based on category
export const getCategoryIcon = (categoryName: string): IconName => {
  const iconMap: {[key: string]: IconName} = {
    'Pet Food': 'food-variant',
    'Pet Toys': 'toy-brick',
    'Pet Beds': 'bed',
    'Pet Clothing': 'tshirt-crew',
    'Health & Wellness': 'medical-bag',
    'Grooming': 'content-cut',
    'Training': 'whistle',
    'Carriers & Travel': 'bag-suitcase',
    'Accessories': 'dog-side'
  };
  
  return iconMap[categoryName] || 'paw';
};

// Get color based on category
export const getCategoryColor = (categoryName: string): string => {
  const colorMap: {[key: string]: string} = {
    'Pet Food': '#8B5CF6',     // Violet-500
    'Pet Toys': '#A855F7',     // Purple-500
    'Pet Beds': '#D946EF',     // Fuchsia-500
    'Pet Clothing': '#EC4899', // Pink-500
    'Health & Wellness': '#06B6D4', // Cyan-500
    'Grooming': '#14B8A6',     // Teal-500
    'Training': '#F59E0B',     // Amber-500
    'Carriers & Travel': '#10B981', // Emerald-500
    'Accessories': '#6366F1'   // Indigo-500
  };
  
  return colorMap[categoryName] || '#9333EA'; // Default to purple if category not found
};

// Get background color (lighter version) for the category
export const getCategoryBgColor = (categoryName: string): string => {
  const bgColorMap: {[key: string]: string} = {
    'Pet Food': '#EDE9FE',     // Violet-100
    'Pet Toys': '#F3E8FF',     // Purple-100
    'Pet Beds': '#FAE8FF',     // Fuchsia-100
    'Pet Clothing': '#FCE7F3', // Pink-100
    'Health & Wellness': '#CFFAFE', // Cyan-100
    'Grooming': '#CCFBF1',     // Teal-100
    'Training': '#FEF3C7',     // Amber-100
    'Carriers & Travel': '#D1FAE5', // Emerald-100
    'Accessories': '#E0E7FF'   // Indigo-100
  };
  
  return bgColorMap[categoryName] || '#F3E8FF'; // Default to purple-100 if not found
}; 