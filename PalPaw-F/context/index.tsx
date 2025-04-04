import React, { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { PostsProvider, usePosts } from './PostsContext';
import { AppProvider, useApp } from './AppContext';
import { UserProvider, useUser } from './UserContext';
import { ProductsProvider, useProducts } from './ProductsContext';
import { ChatProvider, useChat } from './chatContext';


// Export all context hooks for easy import elsewhere
export {
  AuthProvider,
  useAuth,
  AppProvider,
  useApp,
  UserProvider,
  useUser,
  PostsProvider,
  usePosts,
  ProductsProvider,
  useProducts,
  ChatProvider,
  useChat,
};

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
            <ProductsProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </ProductsProvider>
          </PostsProvider>
        </UserProvider>
      </AuthProvider>
    </AppProvider>
  );
}; 