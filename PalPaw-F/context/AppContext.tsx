import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// Define the app theme types
type ThemeMode = 'light' | 'dark' | 'system';

// Define the app state interface
interface AppState {
  theme: ThemeMode;
  currentTheme: 'light' | 'dark'; // The actual theme based on system or user preference
  isFirstLaunch: boolean;
  notificationsEnabled: boolean;
  loading: boolean;
}

// Define actions for app state
type AppAction =
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'APPLY_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_FIRST_LAUNCH'; payload: boolean }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AppState = {
  theme: 'system',
  currentTheme: Appearance.getColorScheme() || 'light',
  isFirstLaunch: true,
  notificationsEnabled: true,
  loading: true,
};

// App reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'APPLY_THEME':
      return {
        ...state,
        currentTheme: action.payload,
      };
    case 'SET_FIRST_LAUNCH':
      return {
        ...state,
        isFirstLaunch: action.payload,
      };
    case 'TOGGLE_NOTIFICATIONS':
      return {
        ...state,
        notificationsEnabled: !state.notificationsEnabled,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

// Create the app context
interface AppContextProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  setTheme: (theme: ThemeMode) => void;
  toggleNotifications: () => void;
  completeFirstLaunch: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// App provider props
interface AppProviderProps {
  children: ReactNode;
}

// Create the app provider
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Set loading state
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load theme preference
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          dispatch({ type: 'SET_THEME', payload: savedTheme as ThemeMode });
          
          // Apply the correct theme based on preference
          if (savedTheme === 'system') {
            dispatch({ 
              type: 'APPLY_THEME', 
              payload: Appearance.getColorScheme() || 'light' 
            });
          } else {
            dispatch({ type: 'APPLY_THEME', payload: savedTheme as 'light' | 'dark' });
          }
        }
        
        // Load first launch status
        const firstLaunchString = await AsyncStorage.getItem('isFirstLaunch');
        if (firstLaunchString !== null) {
          dispatch({ 
            type: 'SET_FIRST_LAUNCH', 
            payload: JSON.parse(firstLaunchString) 
          });
        }
        
        // Load notifications preference
        const notificationsString = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsString !== null) {
          const notificationsEnabled = JSON.parse(notificationsString);
          if (!notificationsEnabled) {
            dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
          }
        }
        
        // Set loading state to false
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error loading preferences:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadPreferences();

    // Listen for appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (state.theme === 'system') {
        dispatch({ 
          type: 'APPLY_THEME', 
          payload: colorScheme || 'light' 
        });
      }
    });

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [state.theme]);

  // Function to set theme
  const setTheme = async (theme: ThemeMode) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    
    // Apply the correct theme based on preference
    if (theme === 'system') {
      dispatch({ 
        type: 'APPLY_THEME', 
        payload: Appearance.getColorScheme() || 'light' 
      });
    } else {
      dispatch({ type: 'APPLY_THEME', payload: theme });
    }
    
    // Save theme preference
    try {
      await AsyncStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Function to toggle notifications
  const toggleNotifications = async () => {
    dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
    
    // Save notifications preference
    try {
      await AsyncStorage.setItem(
        'notificationsEnabled', 
        JSON.stringify(!state.notificationsEnabled)
      );
    } catch (error) {
      console.error('Error saving notifications preference:', error);
    }
  };

  // Function to mark first launch as complete
  const completeFirstLaunch = async () => {
    dispatch({ type: 'SET_FIRST_LAUNCH', payload: false });
    
    // Save first launch status
    try {
      await AsyncStorage.setItem('isFirstLaunch', JSON.stringify(false));
    } catch (error) {
      console.error('Error saving first launch status:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setTheme,
        toggleNotifications,
        completeFirstLaunch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 