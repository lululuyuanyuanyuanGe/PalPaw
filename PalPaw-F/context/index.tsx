import React, { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { PostsProvider, usePosts } from './PostsContext';
import { AppProvider, useApp } from './AppContext';
import { UserProvider, useUser } from './UserContext';

// Export all context hooks for easy import elsewhere
export { useAuth, usePosts, useApp, useUser };

// Create a combined provider component
interface RootProviderProps {
  children: ReactNode;
}

/**
 * The RootProvider wraps our entire application and provides all context values
 * to any component that needs them. This simplifies our app's setup by allowing
 * us to wrap everything once at the root level.
 */
export const RootProvider: React.FC<RootProviderProps> = ({ children }) => {
  return (
    <AppProvider>
      <AuthProvider>
        <UserProvider>
          <PostsProvider>
            {children}
          </PostsProvider>
        </UserProvider>
      </AuthProvider>
    </AppProvider>
  );
}; 