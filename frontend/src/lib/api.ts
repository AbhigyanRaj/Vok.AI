const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://vok-ai.onrender.com/api'
  : 'http://localhost:5001/api';

// API service for backend communication
export const api = {
  // Call management - AUTH REQUIRED
  async initiateCall(token: string, moduleId: string, phoneNumber: string, customerName: string) {
    const response = await fetch(`${API_BASE_URL}/calls/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        moduleId,
        phoneNumber,
        customerName,
      }),
    });
    return response.json();
  },

  // Get call cost information - AUTH REQUIRED
  async getCallCostInfo(token: string) {
    const response = await fetch(`${API_BASE_URL}/calls/cost-info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },
};

// Token management (keeping for future use)
export const getStoredToken = (): string | null => {
  return localStorage.getItem('vokai_token');
};

export const setStoredToken = (token: string) => {
  localStorage.setItem('vokai_token', token);
};

export const removeStoredToken = () => {
  localStorage.removeItem('vokai_token');
}; 