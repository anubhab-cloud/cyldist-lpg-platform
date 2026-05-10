import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components';
import { CustomerLayout, AdminLayout, AgentLayout } from './layouts';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerOrders from './pages/customer/CustomerOrders';
import CreateOrder from './pages/customer/CreateOrder';
import TrackOrder from './pages/customer/TrackOrder';
import ChatPage from './pages/customer/ChatPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminInventory from './pages/admin/AdminInventory';
import AdminUsers from './pages/admin/AdminUsers';

// Agent
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentActiveDelivery from './pages/agent/AgentActiveDelivery';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer routes */}
      <Route path="/customer" element={
        <ProtectedRoute roles={['customer']}>
          <CustomerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="orders/new" element={<CreateOrder />} />
        <Route path="track/:orderId" element={<TrackOrder />} />
        <Route path="chat/:roomId" element={<ChatPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* Agent routes */}
      <Route path="/agent" element={
        <ProtectedRoute roles={['agent']}>
          <AgentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AgentDashboard />} />
        <Route path="orders" element={<AgentDashboard />} />
        <Route path="delivery/:orderId" element={<AgentActiveDelivery />} />
        <Route path="chat/:roomId" element={<ChatPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
