import { Outlet } from 'react-router-dom';
import { CustomerSidebar, AdminSidebar, AgentSidebar } from '../components/Sidebar';

export function CustomerLayout() {
  return (
    <div className="app-layout">
      <CustomerSidebar />
      <main className="main-content"><Outlet /></main>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="app-layout">
      <AdminSidebar />
      <main className="main-content"><Outlet /></main>
    </div>
  );
}

export function AgentLayout() {
  return (
    <div className="app-layout">
      <AgentSidebar />
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
