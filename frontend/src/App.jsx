import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';

// Layouts
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Tables from './pages/Tables';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Register from './pages/Register';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';

// Protected Pages
import MyBookings from './pages/MyBookings';
import Payment from './pages/Payment';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageBookings from './pages/admin/ManageBookings';
import BookingDetail from './pages/admin/BookingDetail';
import ManageTables from './pages/admin/ManageTables';
import ManageUsers from './pages/admin/ManageUsers';

// Guards
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { initAuth } = useAuthStore();

  // Khôi phục authentication khi app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tables" element={<Tables />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="payment-success" element={<PaymentSuccess />} />
          <Route path="payment-failed" element={<PaymentFailed />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="booking/:tableId" element={<Booking />} />
            <Route path="my-bookings" element={<MyBookings />} />
            <Route path="payment/:bookingId" element={<Payment />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="tables" element={<ManageTables />} />
            <Route path="users" element={<ManageUsers />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;