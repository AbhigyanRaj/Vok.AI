import Hero from "./components/Hero";
import { Routes, Route } from 'react-router-dom';
import BuyToken from './components/BuyToken';
import ModulesPage from './components/ModulesPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from "./components/Navbar";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  // Updated for Vercel deployment with proper environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE";
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/buy-token" element={<BuyToken />} />
          <Route path="/modules" element={
            <ProtectedRoute>
              <ModulesPage />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App