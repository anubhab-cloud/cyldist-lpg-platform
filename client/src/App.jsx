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
import CustomerSupport from './pages/customer/CustomerSupport';
import RaiseComplaint from './pages/customer/RaiseComplaint';
import CustomerWallet from './pages/customer/CustomerWallet';
import CustomerInvoices from './pages/customer/CustomerInvoices';
import CustomerTrackingHub from './pages/customer/CustomerTrackingHub';
import CustomerProducts from './pages/customer/CustomerProducts';
import CustomerSettings from './pages/customer/CustomerSettings';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminInventory from './pages/admin/AdminInventory';
import AdminUsers from './pages/admin/AdminUsers';
import AdminNotifications from './pages/admin/AdminNotifications';
import BroadcastCenter from './pages/admin/BroadcastCenter';
import AdminSupport from './pages/admin/AdminSupport';

// Agent
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentActiveDelivery from './pages/agent/AgentActiveDelivery';
import AgentDeliveries from './pages/agent/AgentDeliveries';
import AgentRoute from './pages/agent/AgentRoute';
import AgentQueue from './pages/agent/AgentQueue';
import AgentEarnings from './pages/agent/AgentEarnings';
import AgentPerformance from './pages/agent/AgentPerformance';
import AgentNotifications from './pages/agent/AgentNotifications';
import AgentProfile from './pages/agent/AgentProfile';

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
        <Route path="track" element={<CustomerTrackingHub />} />
        <Route path="invoices" element={<CustomerInvoices />} />
        <Route path="products" element={<CustomerProducts />} />
        <Route path="wallet" element={<CustomerWallet />} />
        <Route path="settings" element={<CustomerSettings />} />
        <Route path="chat/:roomId" element={<ChatPage />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="support/raise" element={<RaiseComplaint />} />
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
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="broadcast" element={<BroadcastCenter />} />
        <Route path="support" element={<AdminSupport />} />
      </Route>

      {/* Agent routes */}
      <Route path="/agent" element={
        <ProtectedRoute roles={['agent']}>
          <AgentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AgentDashboard />} />
        <Route path="deliveries" element={<AgentDeliveries />} />
        <Route path="route" element={<AgentRoute />} />
        <Route path="queue" element={<AgentQueue />} />
        <Route path="earnings" element={<AgentEarnings />} />
        <Route path="performance" element={<AgentPerformance />} />
        <Route path="notifications" element={<AgentNotifications />} />
        <Route path="profile" element={<AgentProfile />} />
        <Route path="orders" element={<AgentDashboard />} />
        <Route path="delivery/:orderId" element={<AgentActiveDelivery />} />
        <Route path="chat/:roomId" element={<ChatPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

import { WhatsAppWidget } from './components/WhatsAppWidget';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <SocketProvider>
              <AppRoutes />
              <WhatsAppWidget />
            </SocketProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
