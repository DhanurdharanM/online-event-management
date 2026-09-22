import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Support from './pages/Support';
import { PaymentSuccess, PaymentCancelled, MockPayment } from './pages/Payment';
import MyEvents from './pages/organizer/MyEvents';
import EventForm from './pages/organizer/EventForm';
import ManageEvent from './pages/organizer/ManageEvent';
import { AdminLayout, AdminOverview, AdminEvents, AdminUsers, AdminTransactions, AdminSupport, AdminReports } from './pages/admin/Admin';

const NotFound = () => (
  <div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="text-5xl">404</h1><p className="mt-2 text-harbor-500">That page does not exist.</p><Link to="/" className="btn-primary mt-6">Back home</Link></div>
);

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const org = ['organizer', 'admin'];
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollTop />
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment/cancelled" element={<PaymentCancelled />} />
          <Route path="/mock-payment/:orderId" element={<ProtectedRoute><MockPayment /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/organizer" element={<ProtectedRoute roles={org}><MyEvents /></ProtectedRoute>} />
          <Route path="/organizer/events/new" element={<ProtectedRoute roles={org}><EventForm /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/edit" element={<ProtectedRoute roles={org}><EventForm /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/manage" element={<ProtectedRoute roles={org}><ManageEvent /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
