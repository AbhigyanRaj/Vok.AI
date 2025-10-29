import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import * as auth from '../lib/auth';

interface AuthContextType {
  user: auth.User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: auth.User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<auth.User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('AuthProvider rendered with user:', user, 'loading:', loading);

  useEffect(() => {
    console.log('AuthProvider useEffect - setting up auth state change listener');
    const unsubscribe = auth.onAuthStateChange((user) => {
      console.log('Auth state changed:', user);
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Get user info from Google
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        }).then(res => res.json());

        // Authenticate with our backend
        const authResponse = await auth.signInWithGoogle(userInfo);
        if (authResponse.success) {
          setUser(authResponse.user);
        }
      } catch (error) {
        console.error('Google login error:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
    }
  });

  const signIn = async () => {
    try {
      googleLogin();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOutUser();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 