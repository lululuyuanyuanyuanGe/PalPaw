import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.2.11:5001';

export const syncUserToMongoDB = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      console.error('No token available for user sync');
      return null;
    }
    
    const response = await axios.post(
      `${API_URL}/api/mongo/users/sync`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      // Store MongoDB user ID
      const mongoUserId = response.data.user.id;
      await AsyncStorage.setItem('mongoUserId', mongoUserId);
      console.log('User synced to MongoDB successfully');
      return mongoUserId;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to sync user to MongoDB:', error);
    return null;
  }
};
