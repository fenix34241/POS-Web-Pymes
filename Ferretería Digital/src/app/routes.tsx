import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Returns } from './pages/Returns';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: () => (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: 'pos',
        Component: POS,
      },
      {
        path: 'inventory',
        Component: Inventory,
      },
      {
        path: 'purchases',
        Component: Purchases,
      },
      {
        path: 'reports',
        Component: Reports,
      },
      {
        path: 'returns',
        Component: Returns,
      },
      {
        path: 'users',
        Component: Users,
      },
    ],
  },
]);