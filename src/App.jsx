import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ShelfProvider } from './context/ShelfContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ShelfDisplay from './pages/ShelfDisplay';
import Alerts from './pages/Alerts';
import ProductManager from './pages/ProductManager';
import Reports from './pages/Reports';
import ProductDetail from './pages/ProductDetail';
import { ROLES } from './constants/roles';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ShelfProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/shelf" element={<ShelfDisplay />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.REPOSITOR]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <ProductManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ShelfProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
