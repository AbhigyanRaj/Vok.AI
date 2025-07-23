import Hero from "./components/Hero";
import { Routes, Route } from 'react-router-dom';
import BuyToken from './components/BuyToken';
import ModulesPage from './components/ModulesPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from "./components/Navbar";

function App() {
  return (
    <>
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
    </>
  );
}

export default App