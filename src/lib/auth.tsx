import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const idleLogoutTriggered = useRef(false);
  const navigate = useNavigate();

  // Check if user has enabled "remember me"
  const isRememberMe = localStorage.getItem('remember_me') === 'true';
  
  // Adjust idle timeout based on remember me preference
  const IDLE_TIMEOUT_MS = isRememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // 7 days or 60 minutes
  const IDLE_CHECK_INTERVAL_MS = 60 * 1000; // check every minute

  useEffect(() => {
    checkAuth();
    setLastActivity(Date.now());
  }, []);

  // Track user activity to enforce idle timeout
  useEffect(() => {
    const markActivity = () => setLastActivity(Date.now());
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, markActivity));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
    };
  }, []);

  // Idle timeout enforcement - only if remember me is not enabled
  useEffect(() => {
    // Skip idle timeout if remember me is enabled
    const skipIdleTimeout = localStorage.getItem('session_persistent') === 'true';
    
    if (skipIdleTimeout) {
      return; // Don't enforce idle timeout for "remember me" users
    }
    
    const interval = setInterval(() => {
      const inactiveFor = Date.now() - lastActivity;
      if (!idleLogoutTriggered.current && inactiveFor >= IDLE_TIMEOUT_MS) {
        idleLogoutTriggered.current = true;
        logout();
      }
    }, IDLE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lastActivity]);

  const checkAuth = async () => {
    try {
      // Wait briefly for Supabase to restore session from storage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if Supabase session exists first (takes precedence over legacy token)
      const { data: supabaseSession } = await supabase.auth.getSession();
      if (supabaseSession?.session) {
        // Supabase session active — clear legacy token and use Supabase
        apiClient.setToken(null);
      } else {
        // No Supabase session — try legacy token
        const token = apiClient.getToken();
        if (!token) {
          setLoading(false);
          return;
        }
      }

      const userData = await apiClient.getCurrentUser();
      setUser(userData.user);
    } catch (error: any) {
      console.error('Auth check failed:', error);
      
      // If it's an auth error, handle gracefully
      if (error?.isAuthError) {
        setUser(null);
        apiClient.setToken(null);
        localStorage.removeItem('user');
        
        // Only redirect if not already on login/signup pages
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/auth/callback') {
          navigate('/login');
        }
      } else {
        apiClient.setToken(null);
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase and clear legacy token
      await supabase.auth.signOut();
      await apiClient.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      idleLogoutTriggered.current = false;
      navigate('/login');
    }
  };

  return { user, loading, logout, isAuthenticated: !!user };
}

export function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Check onboarding completion (unless explicitly disabled or on onboarding page)
  useEffect(() => {
    if (!loading && isAuthenticated && user && requireOnboarding) {
      const onboardingComplete = user?.tenant?.onboardingCompleted;
      const isOnboardingPage = location.pathname === '/onboarding';
      const isOverviewPage = location.pathname === '/dashboard/overview' || location.pathname.startsWith('/dashboard/overview');
      
      // If onboarding not complete and not already on onboarding page, redirect
      if (!onboardingComplete && !isOnboardingPage) {
        console.log('Onboarding incomplete, redirecting to /onboarding');
        navigate('/onboarding', { replace: true });
      }
      // If onboarding complete and on onboarding page, redirect to overview
      else if (onboardingComplete && isOnboardingPage) {
        console.log('Onboarding already complete, redirecting to /dashboard/overview');
        navigate('/dashboard/overview', { replace: true });
      }
    }
  }, [loading, isAuthenticated, user?.tenant?.onboardingCompleted, requireOnboarding, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
