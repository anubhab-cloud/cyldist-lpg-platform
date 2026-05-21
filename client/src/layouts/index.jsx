import { Outlet } from 'react-router-dom';
import { CustomerSidebar, AdminSidebar, AgentSidebar } from '../components/Sidebar';
import Footer from '../components/Footer';

export function CustomerLayout() {
  return (
    <div className="app-layout">
      <CustomerSidebar />
      <div className="main-wrapper">
        <main className="main-content"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="main-wrapper">
        <main className="main-content"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}

export function AgentLayout() {
  return (
    <div className="app-layout">
      <AgentSidebar />
      <div className="main-wrapper">
        <main className="main-content"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}
