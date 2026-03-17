import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import ruRU from 'antd/locale/ru_RU';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminsPage from './pages/admin/AdminsPage';
import UsersPage from './pages/admin/UsersPage';
import WarehousesPage from './pages/admin/WarehousesPage';
import ProductsPage from './pages/admin/ProductsPage';
import ShopsPage from './pages/admin/ShopsPage';
import InvoicesPage from './pages/admin/InvoicesPage';
import PaymentsReportPage from './pages/admin/PaymentsReportPage';
import UserInvoicesAdminPage from './pages/admin/UserInvoicesAdminPage';
import UserPaymentsAdminPage from './pages/admin/UserPaymentsAdminPage';
import EventLogsPage from './pages/admin/EventLogsPage';
import AdminExpensesPage from './pages/admin/AdminExpensesPage';
import UserExpensesAdminPage from './pages/admin/UserExpensesAdminPage';

// Admin wizards
import SetupWarehouseWizard from './pages/admin/wizards/SetupWarehouseWizard';
import OnboardProductWizard from './pages/admin/wizards/OnboardProductWizard';
import OnboardUserWizard from './pages/admin/wizards/OnboardUserWizard';
import AcceptPaymentWizard from './pages/admin/wizards/AcceptPaymentWizard';

// User pages
import UserDashboard from './pages/user/UserDashboard';
import ProfilePage from './pages/user/ProfilePage';
import UserShopsPage from './pages/user/UserShopsPage';
import MyInvoicesPage from './pages/user/MyInvoicesPage';
import CreatePaymentPage from './pages/user/CreatePaymentPage';
import CreateReturnPage from './pages/user/CreateReturnPage';
import UserInvoicePage from './pages/user/UserInvoicePage';
import UserPaymentPage from './pages/user/UserPaymentPage';
import UserReturnPage from './pages/user/UserReturnPage';
import UserShopPaymentsPage from './pages/user/UserShopPaymentsPage';
import MyAdminPaymentsPage from './pages/user/MyAdminPaymentsPage';
import UserExpensesPage from './pages/user/UserExpensesPage';
import MyPickupsPage from './pages/user/MyPickupsPage';

// User wizards
import DailySalesWizard from './pages/user/wizards/DailySalesWizard';
import CollectPaymentWizard from './pages/user/wizards/CollectPaymentWizard';
import BulkCollectWizard from './pages/user/wizards/BulkCollectWizard';
import ProcessReturnWizard from './pages/user/wizards/ProcessReturnWizard';
import WarehousePickupWizard from './pages/user/wizards/WarehousePickupWizard';

import NotFoundPage from './pages/shared/NotFoundPage';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role === 'USER' && requiredRole === 'admin') return <Navigate to="/user" replace />;
  if (requiredRole && user?.role !== 'USER' && requiredRole === 'user') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const antLocale = i18n.language === 'ru' ? ruRU : enUS;
  return (
    <ConfigProvider locale={antLocale} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AppLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                {/* Wizards */}
                <Route path="wizard/warehouse" element={<SetupWarehouseWizard />} />
                <Route path="wizard/products" element={<OnboardProductWizard />} />
                <Route path="wizard/user" element={<OnboardUserWizard />} />
                {/* Management */}
                <Route path="admins" element={<AdminsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="warehouses" element={<WarehousesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="shops" element={<ShopsPage />} />
                {/* Reports */}
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="payments" element={<PaymentsReportPage />} />
                <Route path="user-invoices" element={<UserInvoicesAdminPage />} />
                <Route path="user-payments" element={<UserPaymentsAdminPage />} />
                <Route path="wizard/accept-payment" element={<AcceptPaymentWizard />} />
                <Route path="event-logs" element={<EventLogsPage />} />
                <Route path="my-expenses" element={<AdminExpensesPage />} />
                <Route path="user-expenses" element={<UserExpensesAdminPage />} />
              </Route>

              {/* User Routes */}
              <Route path="/user" element={<ProtectedRoute requiredRole="user"><AppLayout /></ProtectedRoute>}>
                <Route index element={<UserDashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                {/* Daily task wizards */}
                <Route path="wizard/sales" element={<DailySalesWizard />} />
                <Route path="wizard/payment" element={<CollectPaymentWizard />} />
                <Route path="wizard/bulk-payment" element={<BulkCollectWizard />} />
                <Route path="wizard/return" element={<ProcessReturnWizard />} />
                <Route path="wizard/pickup" element={<WarehousePickupWizard />} />
                {/* Records */}
                <Route path="shops" element={<UserShopsPage />} />
                <Route path="invoices" element={<MyInvoicesPage />} />
                <Route path="payments" element={<CreatePaymentPage />} />
                <Route path="returns" element={<CreateReturnPage />} />
                <Route path="user-invoices" element={<UserInvoicePage />} />
                <Route path="user-payments" element={<UserPaymentPage />} />
                <Route path="user-returns" element={<UserReturnPage />} />
                <Route path="shop-payments" element={<UserShopPaymentsPage />} />
                <Route path="my-admin-payments" element={<MyAdminPaymentsPage />} />
                <Route path="my-expenses" element={<UserExpensesPage />} />
                <Route path="my-pickups" element={<MyPickupsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
      </AppProviders>
    </QueryClientProvider>
  );
};

export default App;
