// SearchScreen.tsx - With fixes for notch protection and modal overlay
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Modal,
  StyleSheet,
  Platform,
  StatusBar
} from 'react-native';
import { 
  Feather, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';

// Define types
type SearchHistoryItem = string;

type TrendingPost = {
  id: number;
  title: string;
  likes: number;
};

// Define component
const SearchScreen: React.FC = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([
    'golden retriever',
    'cat toys',
    'pet adoption',
    'veterinarians near me',
    'dog training tips'
  ]);
  
  const trendingPosts: TrendingPost[] = [
    { id: 1, title: "10 Cutest Puppies of the Week", likes: 2453 },
    { id: 2, title: "How to Help Your Cat Stay Active", likes: 1892 },
    { id: 3, title: "Rare Bird Species Found in Local Park", likes: 1645 },
  ];

  // Handler functions
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to search history if not already present
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory([searchQuery, ...searchHistory.slice(0, 4)]);
      }
      
      // In a real app, this would trigger the search action
      console.log(`Searching for: ${searchQuery} with filter: ${selectedFilter}`);
    }
  };

  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  const removeHistoryItem = (item: string) => {
    setSearchHistory(searchHistory.filter(history => history !== item));
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    setShowFilterModal(false);
  };

  // Get the background color class for the history item
  const getHistoryItemBgClass = (index: number): string => {
    const bgClasses = ['bg-pink-100', 'bg-purple-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100'];
    return bgClasses[index % bgClasses.length];
  };

  // Get the text color class for the history item
  const getHistoryItemTextClass = (index: number): string => {
    const textClasses = ['text-pink-600', 'text-purple-600', 'text-blue-600', 'text-green-600', 'text-yellow-600'];
    return textClasses[index % textClasses.length];
  };

  // Get color for icon based on index (removing text- prefix)
  const getIconColor = (index: number): string => {
    const colors = ['#DB2777', '#9333EA', '#2563EB', '#059669', '#D97706'];
    return colors[index % colors.length];
  };

  return (
    <SafeAreaView style={styles.safeArea} className="flex-1 bg-blue-50">
      <StatusBar backgroundColor="#A855F7" barStyle="light-content" />
      
      {/* Header with cute animal app title - uses style for gradient-like effect */}
      <View style={styles.headerContainer}>
        <Text className="text-white text-xl font-bold text-center mb-3">PalPaw</Text>
        <View className="flex-row items-center">
          <View className="relative flex-1">
            <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
              <Feather name="search" size={18} color="#9CA3AF" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-white py-3 pl-10 pr-10 rounded-full w-full"
              placeholder="Search for pets, tips, vets..."
              onSubmitEditing={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={clearSearchQuery}
                className="absolute right-3 top-0 bottom-0 justify-center z-10"
              >
                <Feather name="x" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            className="ml-2 p-3 bg-white rounded-full"
          >
            <Feather name="sliders" size={20} color="#A855F7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content area */}
      <ScrollView className="p-4 flex-1">
        {/* Trending section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Feather name="trending-up" size={18} color="#EC4899" />
            <Text className="text-sm font-bold text-gray-700 ml-2">Trending Now</Text>
          </View>
          <View className="space-y-2">
            {trendingPosts.map((post) => (
              <TouchableOpacity 
                key={post.id} 
                className="bg-white p-3 rounded-xl shadow-sm border border-pink-100"
              >
                <Text className="font-medium text-gray-800">{post.title}</Text>
                <View className="flex-row items-center mt-2">
                  <MaterialCommunityIcons name="heart" size={14} color="#EC4899" />
                  <Text className="text-sm text-gray-500 ml-1">{post.likes.toLocaleString()} likes</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search history */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-gray-700 mb-3">Recent Searches</Text>
          {searchHistory.length > 0 ? (
            <View className="space-y-2">
              {searchHistory.map((item, index) => (
                <View 
                  key={index} 
                  className={`flex-row items-center justify-between p-3 rounded-xl shadow-sm ${getHistoryItemBgClass(index)}`}
                >
                  <TouchableOpacity 
                    className="flex-1 flex-row items-center"
                    onPress={() => setSearchQuery(item)}
                  >
                    <Feather 
                      name="search" 
                      size={16} 
                      color={getIconColor(index)} 
                      style={{marginRight: 8, opacity: 0.7}}
                    />
                    <Text className={getHistoryItemTextClass(index)}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeHistoryItem(item)}
                  >
                    <Feather 
                      name="x" 
                      size={16} 
                      color={getIconColor(index)} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-6 bg-white rounded-xl">
              <Text className="text-gray-400">No recent searches</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter modal with transparent background */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View className="bg-white rounded-t-2xl p-5">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-lg font-bold text-gray-800">Filter Search</Text>
                <TouchableOpacity 
                  onPress={() => setShowFilterModal(false)}
                  className="bg-gray-100 p-2 rounded-full"
                >
                  <Feather name="x" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={() => handleFilterSelect('all')}
                  className={`flex-row items-center p-4 rounded-xl ${
                    selectedFilter === 'all' 
                      ? 'bg-purple-100 border-2 border-purple-200' 
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <Feather name="search" size={22} color={selectedFilter === 'all' ? '#9333EA' : '#374151'} />
                  <Text className={`font-medium ml-3 ${selectedFilter === 'all' ? 'text-purple-600' : 'text-gray-700'}`}>
                    All Results
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => handleFilterSelect('animals')}
                  className={`flex-row items-center p-4 rounded-xl ${
                    selectedFilter === 'animals' 
                      ? 'bg-pink-100 border-2 border-pink-200' 
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <MaterialCommunityIcons name="heart" size={22} color={selectedFilter === 'animals' ? '#DB2777' : '#374151'} />
                  <Text className={`font-medium ml-3 ${selectedFilter === 'animals' ? 'text-pink-600' : 'text-gray-700'}`}>
                    Animals
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => handleFilterSelect('users')}
                  className={`flex-row items-center p-4 rounded-xl ${
                    selectedFilter === 'users' 
                      ? 'bg-blue-100 border-2 border-blue-200' 
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <Feather name="user" size={22} color={selectedFilter === 'users' ? '#2563EB' : '#374151'} />
                  <Text className={`font-medium ml-3 ${selectedFilter === 'users' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Pet Owners
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => handleFilterSelect('posts')}
                  className={`flex-row items-center p-4 rounded-xl ${
                    selectedFilter === 'posts' 
                      ? 'bg-green-100 border-2 border-green-200' 
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <Feather name="file-text" size={22} color={selectedFilter === 'posts' ? '#059669' : '#374151'} />
                  <Text className={`font-medium ml-3 ${selectedFilter === 'posts' ? 'text-green-600' : 'text-gray-700'}`}>
                    Posts & Articles
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.applyButton}
                className="w-full mt-5 p-4 rounded-xl"
              >
                <Text className="text-white font-bold text-center">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles for elements that need more styling than NativeWind can provide
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    backgroundColor: '#A855F7', // Main color
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // This doesn't create a gradient but adds a subtle shadow effect at the bottom
    borderBottomWidth: 3,
    borderBottomColor: '#EC4899',
  },
  applyButton: {
    backgroundColor: '#A855F7',
    // Add a diagonal line effect with borders
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#EC4899',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent background
    justifyContent: 'flex-end',
  },
  modalContainer: {
    // This makes sure the modal content is in front but background is still visible
    backgroundColor: 'transparent',
  }
});

export default SearchScreen;