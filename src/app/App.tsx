import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute, useAuth } from '../lib/auth';
import { Toaster } from './components/ui/sonner';
import { apiClient } from '../lib/api';
import { UnsavedChangesProvider } from './lib/unsavedChanges';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const TestCurrencyPage = lazy(() => import('./pages/TestCurrencyPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const WaitlistLanding = lazy(() => import('./components/waitlist/WaitlistLanding').then((m) => ({ default: m.WaitlistLanding })));
const DashboardLayout = lazy(() => import('./components/DashboardLayout').then((m) => ({ default: m.DashboardLayout })));
const OverviewTab = lazy(() => import('./components/vendor/OverviewTab').then((m) => ({ default: m.OverviewTab })));
const CustomersTab = lazy(() => import('./components/vendor/CustomersTab').then((m) => ({ default: m.CustomersTab })));
const PurchasesTab = lazy(() => import('./components/vendor/PurchasesTab').then((m) => ({ default: m.PurchasesTab })));
const RewardsTab = lazy(() => import('./components/vendor/RewardsTab').then((m) => ({ default: m.RewardsTab })));
const BroadcastsTab = lazy(() => import('./components/vendor/BroadcastsTab').then((m) => ({ default: m.BroadcastsTab })));
const SettingsTab = lazy(() => import('./components/vendor/SettingsTab').then((m) => ({ default: m.SettingsTab })));
const TeamsTab = lazy(() => import('./components/vendor/TeamsTab').then((m) => ({ default: m.TeamsTab })));
const AnalyticsTab = lazy(() => import('./components/vendor/AnalyticsTab').then((m) => ({ default: m.AnalyticsTab })));

function RouteFallback() {
  return <div className="min-h-screen grid place-items-center text-gray-500">Loading…</div>;
}

function DashboardApp() {
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);
  const [pendingRedemptionsCount, setPendingRedemptionsCount] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL (strip /dashboard prefix)
  const pathParts = location.pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  const activeTab = pathParts[0] || 'overview';

  // Fetch testMode from settings
  useEffect(() => {
    const fetchTestMode = async () => {
      try {
        const settings = await apiClient.getSettings();
        setTestMode(settings.advanced?.testMode ?? false);
      } catch (error) {
        console.error('Failed to fetch test mode:', error);
      }
    };

    fetchTestMode();
    // Refetch every 60 seconds to catch changes made in settings
    const interval = setInterval(fetchTestMode, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch pending counts for in-app notifications
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const claimsRes = await apiClient.getClaims({ status: 'pending', page: 1, limit: 1 });
        setPendingClaimsCount(claimsRes.pagination?.total ?? claimsRes.data?.length ?? 0);
      } catch (error) {
        console.error('Failed to fetch pending claims count:', error);
      }

      try {
        const redemptionsRes = await apiClient.request('/redemptions?status=pending&limit=1&page=1');
        setPendingRedemptionsCount(redemptionsRes.pagination?.total ?? redemptionsRes.data?.length ?? 0);
      } catch (error) {
        console.error('Failed to fetch pending redemptions count:', error);
      }
    };

    // Fetch on mount and every 30 seconds
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  const notifications = [
    { id: 'pending-claims', label: 'Pending claims', count: pendingClaimsCount, tab: 'purchases' },
    { id: 'pending-redemptions', label: 'Pending redemptions', count: pendingRedemptionsCount, tab: 'rewards' }
  ];

  return (
    <DashboardLayout 
      activeTab={activeTab} 
      onTabChange={(tab) => navigate(`/dashboard/${tab}`)} 
      onLogout={logout}
      user={user}
      badgeCounts={{ purchases: pendingClaimsCount }}
      notifications={notifications}
      testMode={testMode}
    >
      <Routes>
        <Route index element={<Navigate to="/dashboard/overview" replace />} />
        <Route path="overview" element={<OverviewTab />} />
        <Route path="customers" element={<CustomersTab />} />
        <Route path="rewards" element={<RewardsTab />} />
        <Route path="purchases" element={<PurchasesTab />} />
        <Route path="broadcasts" element={<BroadcastsTab />} />
        <Route path="analytics" element={<AnalyticsTab />} />
        <Route path="settings" element={<SettingsTab />} />
        <Route path="team" element={<TeamsTab />} />
      </Routes>
      <Toaster />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <UnsavedChangesProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><OnboardingPage /></ProtectedRoute>} />
            <Route path="/waitlist" element={<WaitlistLanding />} />
            <Route path="/test/currency" element={<ProtectedRoute><TestCurrencyPage /></ProtectedRoute>} />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <DashboardApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </UnsavedChangesProvider>
  );
}