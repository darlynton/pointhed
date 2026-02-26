/// <reference types="vite/client" />
import { supabase } from './supabase';

// Prefer IPv6 loopback when available (some dev environments bind to ::1).
// Fallback logic will still try localhost and 127.0.0.1.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api/v1';

interface RequestOptions extends RequestInit {
  body?: any;
  skipAuth?: boolean;
  skipRefresh?: boolean; // Prevent infinite refresh loops
}

class ApiClient {
  private baseURL: string;
  private token: string | null;
  private refreshToken: string | null;
  private refreshPromise: Promise<boolean> | null = null;
  private tokenExpiresAt: number | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.tokenExpiresAt = this.parseTokenExpiry(this.token);
  }

  private parseTokenExpiry(token: string | null): number | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    this.tokenExpiresAt = this.parseTokenExpiry(token);
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem('refresh_token', token);
    } else {
      localStorage.removeItem('refresh_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  getRefreshToken(): string | null {
    return this.refreshToken || localStorage.getItem('refresh_token');
  }

  // Check if token is expired or about to expire (within 2 minutes)
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiresAt) return false;
    const bufferMs = 2 * 60 * 1000; // 2 minutes buffer
    return Date.now() > (this.tokenExpiresAt - bufferMs);
  }

  // Attempt to refresh the token
  private async attemptRefresh(): Promise<boolean> {
    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          // Refresh failed - clear tokens
          this.setToken(null);
          this.setRefreshToken(null);
          return false;
        }

        const data = await response.json();
        if (data.access_token) {
          this.setToken(data.access_token);
        }
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }
        console.log('✅ Token refreshed successfully');
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.setToken(null);
        this.setRefreshToken(null);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    // Check if token is expiring soon and try to refresh before making request
    if (!options.skipAuth && !options.skipRefresh && this.isTokenExpiringSoon() && this.getRefreshToken()) {
      console.log('Token expiring soon, attempting refresh before request...');
      await this.attemptRefresh();
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Attach Supabase access token if present; fallback to legacy auth_token
    const { data } = await supabase.auth.getSession();
    const supaToken = data.session?.access_token || null;
    const legacyToken = localStorage.getItem('auth_token');
    const bearer = supaToken || legacyToken;
    console.log('API Request:', endpoint, 'Supabase token:', !!supaToken, 'Legacy token:', !!legacyToken);
    if (bearer && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = data.error || `HTTP error! status: ${response.status}`;
        
        // Handle token expiration - try refresh first before redirecting
        if (response.status === 401 || errorMessage.toLowerCase().includes('token expired') || errorMessage.toLowerCase().includes('unauthorized')) {
          // Only attempt refresh if we haven't already tried and we have a refresh token
          if (!options.skipRefresh && this.getRefreshToken()) {
            console.log('Got 401, attempting token refresh...');
            const refreshed = await this.attemptRefresh();
            if (refreshed) {
              // Retry the original request with new token
              console.log('Token refreshed, retrying request...');
              return this.request(endpoint, { ...options, skipRefresh: true });
            }
          }
          
          console.warn('Authentication expired or invalid (refresh failed or unavailable)');
          this.setToken(null);
          this.setRefreshToken(null);
          
          // Clear Supabase session
          await supabase.auth.signOut();
          
          // Store intended destination before redirecting
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup') {
            sessionStorage.setItem('redirect_after_login', currentPath);
          }
          
          // Use soft navigation instead of hard redirect
          // This will be caught by the auth context and handled gracefully
          const authError = new Error('Authentication expired');
          (authError as any).isAuthError = true;
          throw authError;
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Log detailed context for easier debugging in the browser
      console.error('API request failed:', { url, endpoint, config, error: error?.message || error });
      // If this looks like a network/fetch error, try several loopback fallbacks.
      const message = (error && error.message) || '';
      if (/failed to fetch|networkerror|network error/i.test(message) || error instanceof TypeError) {
        // Prefer explicit IPv4 loopback first to avoid bracketed IPv6 parsing issues
        const fallbackHosts = ['127.0.0.1', 'localhost'];
        try {
          const original = new URL(url);
          for (const host of fallbackHosts) {
            if (original.hostname === host || (original.hostname === '::1' && host === '[::1]')) continue;
            try {
              const attemptUrl = new URL(url);
              let attempt: string;
              if (host === '[::1]') {
                // Build bracketed IPv6 URL manually
                attempt = `${attemptUrl.protocol}//[::1]:${attemptUrl.port}${attemptUrl.pathname}${attemptUrl.search}`;
              } else {
                attemptUrl.hostname = host;
                attempt = attemptUrl.toString();
              }
              console.warn('Attempting fallback to alt host:', attempt);
              const resp = await fetch(attempt, config);
              const respData = await resp.json().catch(() => ({}));
              if (!resp.ok) throw new Error(respData.error || `HTTP error! status: ${resp.status}`);
              // Update baseURL so subsequent requests use the reachable host
              try {
                const base = new URL(this.baseURL);
                if (host === '[::1]') {
                  this.baseURL = `${base.protocol}//[::1]:${base.port}${base.pathname}`.replace(/\/$/, '');
                } else {
                  base.hostname = host;
                  this.baseURL = base.toString().replace(/\/$/, '');
                }
                console.info('Fallback successful, updated baseURL to', this.baseURL);
              } catch (e) {
                // ignore baseURL update errors
              }
              return respData;
            } catch (innerErr) {
              console.warn('Fallback attempt failed for host', host, innerErr?.message || innerErr);
              // continue to next host
            }
          }
        } catch (urlErr) {
          console.error('Error constructing fallback URLs:', urlErr);
        }
      }

      throw error;
    }
  }

  // Auth endpoints
  async get(endpoint: string, params?: Record<string, any>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${endpoint}${queryString}`, { method: 'GET' });
  }

  async post(endpoint: string, body?: any): Promise<any> {
    return this.request(endpoint, { method: 'POST', body });
  }

  async put(endpoint: string, body?: any): Promise<any> {
    return this.request(endpoint, { method: 'PUT', body });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<any> {
    // Supabase-driven login happens in UI; keep legacy fallback
    const data = await this.request('/auth/vendor/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
    if (data.access_token) this.setToken(data.access_token);
    if (data.refresh_token) this.setRefreshToken(data.refresh_token);
    return data;
  }

  async signup(signupData: {
    businessName: string;
    contactEmail: string;
    contactPhone: string;
    fullName: string;
    password: string;
    businessType?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }): Promise<any> {
    const data = await this.request('/signup/vendor/register', {
      method: 'POST',
      body: signupData,
      skipAuth: true,
    });
    
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    if (data.refresh_token) {
      this.setRefreshToken(data.refresh_token);
    }
    
    return data;
  }

  // Supabase provisioning (protected by Supabase token)
  async provisionVendor(data: {
    businessName: string;
    contactPhone: string;
    fullName: string;
    country?: string;
    homeCurrency?: string;
    timezone?: string;
  }): Promise<any> {
    return this.request('/signup/vendor/provision', {
      method: 'POST',
      body: data
    });
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    try {
      await this.request('/auth/logout', { 
        method: 'POST',
        body: refreshToken ? { refresh_token: refreshToken } : undefined
      });
    } catch (e) {
      // Continue with local cleanup even if server logout fails
    }
    this.setToken(null);
    this.setRefreshToken(null);
  }

  async getCurrentUser(): Promise<any> {
    const data = await this.request('/auth/me');
    // Try to fetch tenant settings so UI can pick up home currency immediately
    try {
      const settings = await this.getSettings();
      if (settings?.business?.homeCurrency) {
        try { localStorage.setItem('home_currency', settings.business.homeCurrency); } catch (e) {}
      }
    } catch (e) {
      // ignore settings fetch errors here
    }
    return data;
  }

  // Customer endpoints
  async getCustomers(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/customers?${queryString}`);
  }

  async getCustomer(id: string): Promise<any> {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: any): Promise<any> {
    return this.request('/customers', {
      method: 'POST',
      body: data,
    });
  }

  async bulkImportCustomers(customers: Array<{
    phoneNumber: string;
    firstName: string;
    lastName?: string;
    email?: string;
    whatsappName?: string;
    optedIn?: boolean;
  }>): Promise<{
    success: boolean;
    message: string;
    results: {
      imported: number;
      skipped: number;
      total: number;
      errors: Array<{ row: number; error: string }>;
    };
  }> {
    return this.request('/customers/bulk-import', {
      method: 'POST',
      body: { customers },
    });
  }

  async updateCustomer(id: string, data: any): Promise<any> {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  // Points endpoints
  async getPointsBalance(customerId: string): Promise<any> {
    return this.request(`/points/customer/${customerId}/balance`);
  }

  async getPointsTransactions(customerId: string, params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/points/customer/${customerId}/transactions?${queryString}`);
  }

  async awardPoints(customerId: string, points: number, description: string): Promise<any> {
    return this.request('/points/award', {
      method: 'POST',
      body: { customerId, points, description },
    });
  }

  async deductPoints(customerId: string, points: number, description: string): Promise<any> {
    return this.request('/points/deduct', {
      method: 'POST',
      body: { customerId, points, description },
    });
  }

  // Rewards endpoints
  async getRewards(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.request(queryString ? `/rewards?${queryString}` : '/rewards');
  }

  async redeemReward(rewardId: string, customerId: string, idempotencyKey?: string): Promise<any> {
    const headers: Record<string,string> = {};
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
    return this.request(`/rewards/${rewardId}/redeem`, {
      method: 'POST',
      body: { customerId },
      headers
    });
  }

  // Purchases endpoints
  async getPurchases(params: Record<string, any> = {}): Promise<any> {
    // Add timestamp to prevent browser caching issues
    const allParams = { ...params, _t: Date.now() };
    const queryString = new URLSearchParams(
      Object.entries(allParams).map(([key, value]) => [key, String(value)])
    ).toString();
    return this.request(queryString ? `/purchases?${queryString}` : '/purchases', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }

  async createPurchase(data: any): Promise<any> {
    return this.request('/purchases', {
      method: 'POST',
      body: data,
    });
  }

  async adjustPoints(customerId: string, data: any): Promise<any> {
    return this.request(`/customers/${customerId}/adjust-points`, {
      method: 'POST',
      body: data,
    });
  }

  async blockCustomer(customerId: string, data: any): Promise<any> {
    return this.request(`/customers/${customerId}/block`, {
      method: 'POST',
      body: data,
    });
  }

  async sendMessageToCustomer(customerId: string, data: any): Promise<any> {
    return this.request(`/customers/${customerId}/send-message`, {
      method: 'POST',
      body: data,
    });
  }

  // Purchase Claims endpoints
  async getClaims(params?: any): Promise<any> {
    // Add timestamp to prevent browser caching issues
    const allParams = { ...params, _t: Date.now() };
    const queryString = `?${new URLSearchParams(allParams).toString()}`;
    return this.request(`/claims${queryString}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }

  async reviewClaim(claimId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<any> {
    return this.request(`/claims/${claimId}/review`, {
      method: 'POST',
      body: { action, rejectionReason },
    });
  }

  // Analytics endpoints
  async getDashboardAnalytics(): Promise<any> {
    return this.request('/analytics/dashboard');
  }

  // Settings endpoints
  async getSettings(): Promise<any> {
    return this.request('/settings');
  }

  async updateSettings(data: any): Promise<any> {
    return this.request('/settings', {
      method: 'PUT',
      body: data,
    });
  }

  // Team / Staff endpoints
  async createStaff(data: { email: string; fullName: string; phoneNumber?: string }): Promise<any> {
    return this.request('/vendor-users', {
      method: 'POST',
      body: data,
    });
  }

  async getTeam(): Promise<any> {
    return this.request('/vendor-users');
  }

  async updateStaffStatus(id: string, isActive: boolean): Promise<any> {
    return this.request(`/vendor-users/${id}/status`, {
      method: 'PUT',
      body: { isActive },
    });
  }

  // Customer endpoints
  async searchCustomers(query: string): Promise<any> {
    return this.request(`/customers/search?search=${encodeURIComponent(query)}&limit=10`);
  }

  async logPurchase(data: { customerId: string; amountNgn: number; channel: string; notes?: string }): Promise<any> {
    // Combine channel and notes into description
    const description = data.notes 
      ? `Channel: ${data.channel} | ${data.notes}`
      : `Channel: ${data.channel}`;
    
    return this.request('/purchases', {
      method: 'POST',
      body: {
        customerId: data.customerId,
        amountNgn: data.amountNgn,
        description,
      },
    });
  }

  // Waitlist
  async joinWaitlist(data: { email: string; businessName?: string; source?: string }): Promise<any> {
    return this.request('/waitlist', {
      method: 'POST',
      body: data,
      skipAuth: true,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
