import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Menu, X, LayoutDashboard, Users, Gift, ShoppingBag, MessageSquare, Settings, BarChart3, UserPlus, LogOut, Bell, Zap } from 'lucide-react';
import { useUnsavedChanges } from '../lib/unsavedChanges';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userType?: 'admin' | 'vendor';
  onLogout?: () => void;
  user?: any;
  badgeCounts?: Record<string, number>;
  notifications?: Array<{ id: string; label: string; count: number; tab: string }>;
  testMode?: boolean;
}

export function DashboardLayout({ children, activeTab, onTabChange, userType = 'vendor', onLogout, user, badgeCounts = {}, notifications = [], testMode = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const { dirty, setDirty } = useUnsavedChanges();

  // Default sidebar open on desktop (lg: 1024px+), closed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    // Set initial state
    handleResize();
    // Listen for resize to close sidebar when switching to mobile
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const notificationTotal = useMemo(
    () => notifications.reduce((sum, item) => sum + (item.count || 0), 0),
    [notifications]
  );

  const requestTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    if (dirty) {
      setPendingTab(tabId);
      setConfirmOpen(true);
      return;
    }
    onTabChange(tabId);
  };

  const vendorMenuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'rewards', icon: Gift, label: 'Rewards' },
    { id: 'purchases', icon: ShoppingBag, label: 'Transactions' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    // { id: 'broadcasts', icon: MessageSquare, label: 'Broadcasts' }, // TODO: Enable when ready
    ...(user?.role === 'owner' ? [{ id: 'team', icon: Users, label: 'Team' }] : []),
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const adminMenuItems = [
    { id: 'admin-overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'tenants', icon: Users, label: 'Vendors' },
    { id: 'onboarding', icon: UserPlus, label: 'Onboard Vendor' },
    // { id: 'analytics', icon: BarChart3, label: 'Analytics' }, // TODO: Enable when ready
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const menuItems = userType === 'admin' ? adminMenuItems : vendorMenuItems;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 will-change-transform">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base truncate">Loyalty LaaS</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {userType === 'admin' ? 'Platform Admin' : 'Vendor Dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium truncate max-w-[150px]">
                {user?.tenant?.businessName || user?.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">
                {user?.tenant?.vendorCode || user?.email || ''}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
                  <Bell className="size-4" />
                  {notificationTotal > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] h-4 min-w-4 px-1">
                      {notificationTotal}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.filter((item) => item.count > 0).length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No new notifications</div>
                ) : (
                  notifications
                    .filter((item) => item.count > 0)
                    .map((item) => (
                      <DropdownMenuItem key={item.id} onSelect={() => requestTabChange(item.tab)}>
                        <span className="flex-1">{item.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {item.count}
                        </Badge>
                      </DropdownMenuItem>
                    ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={onLogout} title="Logout">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Test Mode Banner */}
      {testMode && (
        <div className={`fixed top-[49px] sm:top-[57px] left-0 right-0 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 z-30 transition-all duration-200 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <Zap className="size-4" />
          <span>Test Mode Active — WhatsApp messages are not being sent</span>
          <Zap className="size-4" />
        </div>
      )}

      {/* Sidebar - Fixed position */}
      <aside className={`
        fixed top-[49px] sm:top-[57px] h-[calc(100vh-49px)] sm:h-[calc(100vh-57px)]
        bg-white border-r border-gray-200 overflow-y-auto
        transform transition-all duration-200 ease-in-out z-40
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'}
      `}>
        <div className={`w-64 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          <nav className="p-3 sm:p-4 pt-4 sm:pt-5 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const badgeCount = badgeCounts[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    requestTabChange(item.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badgeCount > 0 && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-xs h-5 min-w-5">
                      {badgeCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content - with left margin when sidebar is open on desktop only */}
      <main className={`p-3 sm:p-4 lg:p-6 min-w-0 transition-all duration-200 ${sidebarOpen ? 'lg:ml-64' : ''} ${testMode ? 'mt-10' : ''}`}>
        {children}
      </main>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Discard them and switch menus?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingTab) {
                  setDirty(false);
                  onTabChange(pendingTab);
                }
                setPendingTab(null);
                setConfirmOpen(false);
              }}
            >
              Discard changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}