import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MapPage from '@/pages/map/MapPage';
import RegionsPage from '@/pages/regions/RegionsPage';
import SubstationsPage from '@/pages/substations/SubstationsPage';
import TransformersPage from '@/pages/transformers/TransformersPage';
import TransformerForm from '@/pages/transformers/TransformerForm';
import TransformerDetail from '@/pages/transformers/TransformerDetail';
import AlertsPage from '@/pages/alerts/AlertsPage';
import MaintenancePage from '@/pages/maintenance/MaintenancePage';
import UsersPage from '@/pages/users/UsersPage';
import AuditPage from '@/pages/audit/AuditPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/substations" element={<SubstationsPage />} />
            <Route path="/transformers" element={<TransformersPage />} />
            <Route path="/transformers/new" element={<TransformerForm />} />
            <Route path="/transformers/:id" element={<TransformerDetail />} />
            <Route path="/transformers/:id/edit" element={<TransformerForm />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
