import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.9;
const statusBarHeight = Constants.statusBarHeight || 0;

// Define event types
interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image: any;
  attendees: number;
  description: string;
}

// Sample events data
const events: Event[] = [
  {
    id: '1',
    title: 'Pet Adoption Day',
    date: 'May 15, 2023 • 10:00 AM',
    location: 'Central Park, NY',
    image: require('../../../assets/images/cat1.jpg'),
    attendees: 124,
    description: 'Find your perfect furry companion! Many cats and dogs looking for their forever homes.'
  },
  {
    id: '2',
    title: 'Paws & Paint Festival',
    date: 'May 22, 2023 • 2:00 PM',
    location: 'Gallery Space, Brooklyn',
    image: require('../../../assets/images/cat2.jpg'),
    attendees: 87,
    description: 'Create art with your pets! Special pet-safe paints and canvas provided.'
  },
  {
    id: '3',
    title: 'Pet Health Workshop',
    date: 'June 5, 2023 • 11:00 AM',
    location: 'PetCare Center, Boston',
    image: require('../../../assets/images/cat3.jpg'),
    attendees: 56,
    description: 'Learn about preventative care and health tips from expert veterinarians.'
  },
];

const ExplorerScreen: React.FC = () => {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle scroll events for the carousel
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Calculate which card is active based on scroll position
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 20));
    setActiveCardIndex(newIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={[styles.header, { marginTop: statusBarHeight }]}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Featured Events Carousel */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Events</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10 }}
            snapToInterval={cardWidth + 20}
            decelerationRate="fast"
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
          >
            {events.map((event, index) => (
              <TouchableOpacity 
                key={event.id}
                style={[styles.eventCard, { width: cardWidth }]}
                activeOpacity={0.9}
              >
                <Image 
                  source={event.image} 
                  style={styles.eventImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.eventGradient}
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventDate}>{event.date}</Text>
                    <View style={styles.eventAttendees}>
                      <Ionicons name="people" size={14} color="#FFF" />
                      <Text style={styles.eventAttendeesText}>{event.attendees}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventLocation}>
                    <Ionicons name="location-outline" size={14} color="#FFF" />
                    <Text style={styles.eventLocationText}>{event.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.ScrollView>
          
          {/* Carousel Indicators */}
          <View style={styles.indicators}>
            {events.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  { opacity: activeCardIndex === index ? 1 : 0.5 }
                ]}
              />
            ))}
          </View>
        </View>
        
        {/* AI Features Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          
          <View style={styles.aiCardsContainer}>
            {/* AI Image Generation Card */}
            <TouchableOpacity style={styles.aiCard}>
              <LinearGradient
                colors={['#9333EA', '#C17CEF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiCardGradient}
              >
                <View style={styles.aiCardIcon}>
                  <FontAwesome5 name="magic" size={24} color="#FFF" />
                </View>
                <Text style={styles.aiCardTitle}>AI Image Generator</Text>
                <Text style={styles.aiCardDescription}>
                  Create unique pet images with AI
                </Text>
                <View style={styles.aiCardButton}>
                  <Text style={styles.aiCardButtonText}>Try Now</Text>
                  <AntDesign name="arrowright" size={16} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Pet Recognition Card */}
            <TouchableOpacity style={styles.aiCard}>
              <LinearGradient
                colors={['#FF5C77', '#FF8A9B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiCardGradient}
              >
                <View style={styles.aiCardIcon}>
                  <MaterialCommunityIcons name="paw-outline" size={28} color="#FFF" />
                </View>
                <Text style={styles.aiCardTitle}>Pet Recognition</Text>
                <Text style={styles.aiCardDescription}>
                  Identify breeds and pet characteristics
                </Text>
                <View style={styles.aiCardButton}>
                  <Text style={styles.aiCardButtonText}>Analyze</Text>
                  <AntDesign name="arrowright" size={16} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Community Challenges */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Challenges</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.challengeCard}>
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.challengeGradient}
            >
              <View style={styles.challengeContent}>
                <View>
                  <Text style={styles.challengeTitle}>Weekly Pet Photo Challenge</Text>
                  <Text style={styles.challengeDescription}>
                    Post your best "Pet Sleeping" photo for a chance to win
                  </Text>
                  <View style={styles.challengeMeta}>
                    <View style={styles.challengeMetaItem}>
                      <Feather name="users" size={14} color="#FFF" />
                      <Text style={styles.challengeMetaText}>2.5k participants</Text>
                    </View>
                    <View style={styles.challengeMetaItem}>
                      <Feather name="calendar" size={14} color="#FFF" />
                      <Text style={styles.challengeMetaText}>3 days left</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.challengeBadge}>
                  <Image 
                    source={require('../../../assets/images/cat4.jpg')} 
                    style={styles.challengeBadgeImage}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.challengeButton}>
                <Text style={styles.challengeButtonText}>Join Challenge</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Marketplace Featured */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Trending in Marketplace</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsContainer}
          >
            {/* Product Card 1 */}
            <TouchableOpacity style={styles.productCard}>
              <Image 
                source={require('../../../assets/images/cat2.jpg')} 
                style={styles.productImage}
              />
              <View style={styles.productPriceTag}>
                <Text style={styles.productPrice}>$24.99</Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productTitle}>Premium Cat Toy Bundle</Text>
                <View style={styles.productMeta}>
                  <View style={styles.productRating}>
                    <AntDesign name="star" size={12} color="#FFD700" />
                    <Text style={styles.productRatingText}>4.8</Text>
                  </View>
                  <Text style={styles.productSold}>68 sold</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Product Card 2 */}
            <TouchableOpacity style={styles.productCard}>
              <Image 
                source={require('../../../assets/images/cat3.jpg')} 
                style={styles.productImage}
              />
              <View style={styles.productPriceTag}>
                <Text style={styles.productPrice}>$39.99</Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productTitle}>Luxury Pet Bed</Text>
                <View style={styles.productMeta}>
                  <View style={styles.productRating}>
                    <AntDesign name="star" size={12} color="#FFD700" />
                    <Text style={styles.productRatingText}>4.9</Text>
                  </View>
                  <Text style={styles.productSold}>126 sold</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Product Card 3 */}
            <TouchableOpacity style={styles.productCard}>
              <Image 
                source={require('../../../assets/images/cat1.jpg')} 
                style={styles.productImage}
              />
              <View style={styles.productPriceTag}>
                <Text style={styles.productPrice}>$19.99</Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productTitle}>Automatic Pet Feeder</Text>
                <View style={styles.productMeta}>
                  <View style={styles.productRating}>
                    <AntDesign name="star" size={12} color="#FFD700" />
                    <Text style={styles.productRatingText}>4.7</Text>
                  </View>
                  <Text style={styles.productSold}>94 sold</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Pet Care Tips */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Pet Care Tips</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <MaterialCommunityIcons name="lightbulb-outline" size={28} color="#9333EA" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Keeping Your Cat Hydrated</Text>
              <Text style={styles.tipDescription}>
                Most cats don't drink enough water. Try a cat water fountain to encourage drinking.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
    padding: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF5C77',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginBottom: 15,
  },
  seeAllText: {
    color: '#9333EA',
    fontWeight: '600',
  },
  eventCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 10,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    borderRadius: 16,
  },
  eventContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDate: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventAttendeesText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
    marginLeft: 4,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333EA',
    marginHorizontal: 4,
  },
  aiCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  aiCard: {
    width: '48%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiCardGradient: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  aiCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiCardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aiCardDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 15,
  },
  aiCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiCardButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  challengeCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeGradient: {
    padding: 15,
    borderRadius: 16,
  },
  challengeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  challengeTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  challengeDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 10,
    width: '80%',
  },
  challengeMeta: {
    flexDirection: 'row',
  },
  challengeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  challengeMetaText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 5,
  },
  challengeBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  challengeBadgeImage: {
    width: '100%',
    height: '100%',
  },
  challengeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  challengeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  productsContainer: {
    paddingHorizontal: 10,
  },
  productCard: {
    width: 160,
    borderRadius: 12,
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  productPriceTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#9333EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productPrice: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  productDetails: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRatingText: {
    marginLeft: 3,
    fontSize: 12,
    color: '#666',
  },
  productSold: {
    fontSize: 11,
    color: '#999',
  },
  tipCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  tipIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ExplorerScreen; 