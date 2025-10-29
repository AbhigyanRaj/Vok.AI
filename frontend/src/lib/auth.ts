const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// JWT-based authentication with Google OAuth
export interface User {
  _id: string;
  name: string;
  email: string;
  tokens: number;
  subscription: {
    tier: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
  };
  totalCallsMade: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

// Token management
export const getStoredToken = (): string | null => {
  return localStorage.getItem('vokai_jwt_token');
};

export const setStoredToken = (token: string) => {
  localStorage.setItem('vokai_jwt_token', token);
};

export const removeStoredToken = () => {
  localStorage.removeItem('vokai_jwt_token');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('vokai_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setStoredUser = (user: User) => {
  localStorage.setItem('vokai_user', JSON.stringify(user));
};

export const removeStoredUser = () => {
  localStorage.removeItem('vokai_user');
};

// Google OAuth authentication
export const signInWithGoogle = async (googleUser: any): Promise<AuthResponse> => {
  try {
    // Extract user info from Google response
    const { email, name, sub: googleId } = googleUser;
    
    // Call backend to authenticate
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        googleId,
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const authResponse: AuthResponse = await response.json();

    if (authResponse.success && authResponse.token) {
      // Store the token and user
      setStoredToken(authResponse.token);
      setStoredUser(authResponse.user);
    }

    return authResponse;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    // Remove stored data
    removeStoredToken();
    removeStoredUser();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return getStoredUser();
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  // For now, just call with current user
  const user = getCurrentUser();
  callback(user);
  
  // Return a cleanup function
  return () => {};
};

// User profile functions
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const createUserProfile = async (userId: string): Promise<void> => {
  // This is handled by the backend during Google OAuth
  console.log('User profile creation handled by backend');
};

export const incrementUserTokens = async (userId: string, amount: number): Promise<void> => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/buy-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update stored user with new token balance
      const currentUser = getStoredUser();
      if (currentUser) {
        currentUser.tokens = data.newBalance;
        setStoredUser(currentUser);
      }
    }
  } catch (error) {
    console.error('Error incrementing tokens:', error);
  }
};

export const upgradePlan = async (tier: string): Promise<User | null> => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/upgrade-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update stored user with new subscription
      if (data.user) {
        setStoredUser(data.user);
        return data.user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return null;
  }
};

// Module management functions
export interface VoiceModule {
  id?: string;
  _id?: string;
  userId: string;
  name: string;
  questions: Array<{
    question: string;
    order: number;
    required: boolean;
    _id?: string;
  }>;
  createdAt: number;
}

export const addVoiceModule = async (userId: string, name: string, questions: string[]): Promise<string> => {
  const token = getStoredToken();
  if (!token) throw new Error('No authentication token');

  try {
    console.log('Creating module with data:', { name, questions });
    
    const response = await fetch(`${API_BASE_URL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        name, 
        type: 'custom', // Specify the module type
        questions: questions.map((question, index) => ({
          question: question.trim(),
          order: index,
          required: true
        }))
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Module created successfully:', data);
      return data.module._id;
    }
    
    // Log the error response for debugging
    const errorData = await response.json().catch(() => ({}));
    console.error('Module creation failed:', errorData);
    throw new Error('Failed to create module');
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
};

export const getUserModules = async (userId: string): Promise<VoiceModule[]> => {
  const token = getStoredToken();
  if (!token) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/modules`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Modules data from backend:', data);
      
      // Transform the backend data to match our interface
      const transformedModules = data.modules.map((module: any) => ({
        id: module._id, // Set id to _id for frontend use
        _id: module._id,
        userId: module.userId,
        name: module.name,
        questions: module.questions || [],
        createdAt: new Date(module.createdAt).getTime()
      }));
      
      console.log('Transformed modules:', transformedModules);
      return transformedModules;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching modules:', error);
    return [];
  }
};

export const updateVoiceModule = async (id: string, data: Partial<VoiceModule>): Promise<void> => {
  const token = getStoredToken();
  if (!token) throw new Error('No authentication token');

  try {
    // Transform questions if they're being updated
    let transformedData = { ...data };
    if (data.questions) {
      transformedData.questions = data.questions.map((q, index) => {
        if (typeof q === 'string') {
          return { question: q, order: index, required: true };
        }
        return q;
      });
    }

    console.log('Updating module with data:', transformedData);

    const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(transformedData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Module update failed:', errorData);
      throw new Error('Failed to update module');
    }
  } catch (error) {
    console.error('Error updating module:', error);
    throw error;
  }
};

export const deleteVoiceModule = async (id: string): Promise<void> => {
  const token = getStoredToken();
  if (!token) throw new Error('No authentication token');

  if (!id) {
    throw new Error('Module ID is required');
  }

  try {
    console.log('Deleting module with ID:', id);
    
    const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Module deletion failed:', errorData);
      throw new Error(errorData.message || 'Failed to delete module');
    }
    
    console.log('Module deleted successfully');
  } catch (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
}; 