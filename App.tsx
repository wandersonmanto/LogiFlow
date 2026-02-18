import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NewOrder } from './pages/NewOrder';
import { OrderList } from './pages/OrderList';
import { OperationalQueue } from './pages/OperationalQueue';
import { Login } from './pages/Login';
import { AssemblyList } from './pages/AssemblyList';
import { AssemblyDetail } from './pages/AssemblyDetail';
import { AssemblyManifest } from './pages/AssemblyManifest';
import { Reports } from './pages/Reports';
import { RouteManagement } from './pages/RouteManagement';
import { FleetManagement } from './pages/FleetManagement';
import { Drafts } from './pages/Drafts';
import { ProductImport } from './pages/ProductImport';
import { ProductList } from './pages/ProductList';
import { NewProducts } from './pages/NewProducts';

// Protected Route Component
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Placeholder components for routes not yet fully implemented
const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">construction</span>
        <h2 className="text-2xl font-bold text-slate-400">Módulo: {title}</h2>
        <p className="text-slate-400">Em desenvolvimento</p>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
                <RequireAuth>
                    <Layout>
                        <Dashboard />
                    </Layout>
                </RequireAuth>
            } />
            
            <Route path="/orders" element={
                <RequireAuth>
                    <Layout>
                        <OrderList />
                    </Layout>
                </RequireAuth>
            } />
            
            <Route path="/operational" element={
                <RequireAuth>
                    <Layout>
                        <OperationalQueue />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/routes" element={
                <RequireAuth>
                    <Layout>
                        <RouteManagement />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/new-order" element={
                <RequireAuth>
                    <Layout>
                        <NewOrder />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/drafts" element={
                <RequireAuth>
                    <Layout>
                        <Drafts />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/assembly" element={
                <RequireAuth>
                    <Layout>
                        <AssemblyList />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/assembly/manifest" element={
                <RequireAuth>
                    <Layout>
                        <AssemblyManifest />
                    </Layout>
                </RequireAuth>
            } />
            
            <Route path="/assembly/:id" element={
                <RequireAuth>
                    <Layout>
                        <AssemblyDetail />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/reports" element={
                <RequireAuth>
                    <Layout>
                        <Reports />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/fleet" element={
                <RequireAuth>
                    <Layout>
                        <FleetManagement />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/products/import" element={
                <RequireAuth>
                    <Layout>
                        <ProductImport />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/products/list" element={
                <RequireAuth>
                    <Layout>
                        <ProductList />
                    </Layout>
                </RequireAuth>
            } />

            <Route path="/products/new" element={
                <RequireAuth>
                    <Layout>
                        <NewProducts />
                    </Layout>
                </RequireAuth>
            } />
        </Routes>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    </AuthProvider>
  );
};

export default App;