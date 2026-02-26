import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { formatNGN, formatDate, getCurrencySymbol } from '../../../lib/mockData';
import { apiClient } from '../../../lib/api';
import { 
  AlertTriangle, CheckCircle, XCircle, User, Calendar, DollarSign, 
  FileText, Flag, TrendingUp, Clock, ShoppingBag, ExternalLink, Plus, Download, Search, UserPlus 
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get currency scale (minor units per major unit)
// All supported currencies (NGN, GBP, USD, EUR) have 100 minor units
const getCurrencyScale = (currency?: string): number => {
  return 100;
};

export function PurchasesTab() {
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'pending' | 'rejected'>('all');
  const [claims, setClaims] = useState<any[]>([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [logAmount, setLogAmount] = useState('');
  const [logChannel, setLogChannel] = useState('physical_store');
  const [logNotes, setLogNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [loggingPurchase, setLoggingPurchase] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerCountryCode, setNewCustomerCountryCode] = useState('+234');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('');
  const [newCustomerLastName, setNewCustomerLastName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const currentClaimsRequestRef = useRef<string>('');
  const currentPurchasesRequestRef = useRef<string>('');
  const [pendingPage, setPendingPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsPages, setClaimsPages] = useState(1);
  const [pendingClaimsTotal, setPendingClaimsTotal] = useState(0);
  const [rejectedClaimsTotal, setRejectedClaimsTotal] = useState(0);
  const claimsLimit = 10;
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [purchasesPages, setPurchasesPages] = useState(1);
  const purchasesLimit = 10;
  const [rejectedClaims, setRejectedClaims] = useState<any[]>([]);
  const [rejectedClaimsForAll, setRejectedClaimsForAll] = useState(0);
  const [tenantSettings, setTenantSettings] = useState<any | null>(null);

  useEffect(() => {
    // Fetch tenant settings when log dialog opens to get actual earn rate configuration
    if (logDialogOpen) {
      (async () => {
        try {
          const settings = await apiClient.getSettings();
          setTenantSettings(settings);
        } catch (e) {
          console.warn('Failed to load tenant settings for points preview', e);
          setTenantSettings(null);
        }
      })();
    }
  }, [logDialogOpen]);

  const fetchClaims = async (status: 'pending' | 'rejected', page: number) => {
    const requestId = `${status}-${page}-${Date.now()}`;
    currentClaimsRequestRef.current = requestId;

    try {
      setLoading(true);
      // Clear existing claims immediately when switching tabs
      setClaims([]);
      const response = await apiClient.getClaims({ status, page, limit: claimsLimit });
      if (currentClaimsRequestRef.current === requestId) {
        setClaims(response.data || []);
        setClaimsTotal(response.pagination?.total || 0);
        setClaimsPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      if (currentClaimsRequestRef.current === requestId) {
        toast.error('Failed to load transaction claims');
        setClaims([]);
      }
    } finally {
      if (currentClaimsRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const fetchPurchases = async () => {
    const requestId = `confirmed-${purchasesPage}-${Date.now()}`;
    currentPurchasesRequestRef.current = requestId;

    try {
      setLoading(true);
      setPurchases([]);
      setRejectedClaims([]);
      
      const promises = [apiClient.getPurchases({ page: purchasesPage, limit: purchasesLimit })];
      
      // If on All tab, also fetch rejected claims
      if (activeTab === 'all') {
        promises.push(apiClient.getClaims({ status: 'rejected', page: purchasesPage, limit: purchasesLimit }));
      }
      
      const responses = await Promise.all(promises);
      const purchasesResponse = responses[0];
      const rejectedResponse = responses[1];
      
      if (currentPurchasesRequestRef.current === requestId) {
        setPurchases(purchasesResponse.data || []);
        setPurchasesTotal(purchasesResponse.pagination?.total || 0);
        setPurchasesPages(purchasesResponse.pagination?.pages || 1);
        
        if (activeTab === 'all' && rejectedResponse) {
          setRejectedClaims(rejectedResponse.data || []);
          setRejectedClaimsForAll(rejectedResponse.pagination?.total || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      if (currentPurchasesRequestRef.current === requestId) {
        toast.error('Failed to load transactions');
        setPurchases([]);
        setRejectedClaims([]);
      }
    } finally {
      if (currentPurchasesRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const fetchClaimTotals = async () => {
    try {
      const [pendingRes, rejectedRes] = await Promise.all([
        apiClient.getClaims({ status: 'pending', page: 1, limit: 1 }),
        apiClient.getClaims({ status: 'rejected', page: 1, limit: 1 })
      ]);
      setPendingClaimsTotal(pendingRes.pagination?.total ?? pendingRes.data?.length ?? 0);
      setRejectedClaimsTotal(rejectedRes.pagination?.total ?? rejectedRes.data?.length ?? 0);
    } catch (error) {
      console.error('Failed to fetch claim totals:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'confirmed') {
      fetchPurchases();
      return;
    }

    if (activeTab === 'pending' || activeTab === 'rejected') {
      const page = activeTab === 'pending' ? pendingPage : rejectedPage;
      fetchClaims(activeTab as 'pending' | 'rejected', page);
    }
  }, [activeTab, pendingPage, rejectedPage, purchasesPage]);

  useEffect(() => {
    fetchClaimTotals();
    const interval = setInterval(fetchClaimTotals, 30000);
    return () => clearInterval(interval);
  }, []);

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomerResults([]);
      return;
    }

    setSearchingCustomers(true);
    try {
      const response = await apiClient.searchCustomers(query);
      setCustomerResults(response.data || []);
    } catch (error) {
      console.error('Failed to search customers:', error);
      toast.error('Failed to search customers');
    } finally {
      setSearchingCustomers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleReview = async () => {
    if (!selectedClaim) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.reviewClaim(
        selectedClaim.id,
        reviewAction,
        reviewAction === 'reject' ? rejectionReason : undefined
      );

      toast.success(
        reviewAction === 'approve' 
          ? 'Transaction claim approved! Customer has been notified.' 
          : 'Transaction claim rejected. Customer has been notified.'
      );

      setReviewDialogOpen(false);
      setSelectedClaim(null);
      setRejectionReason('');
      
      // Refresh both claims and purchases
      if (activeTab === 'pending' || activeTab === 'rejected') {
        const page = activeTab === 'pending' ? pendingPage : rejectedPage;
        fetchClaims(activeTab as 'pending' | 'rejected', page);
      }
      if (reviewAction === 'approve') {
        fetchPurchases();
      }
      fetchClaimTotals();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${reviewAction} transaction claim`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogPurchase = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    const amount = parseFloat(logAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoggingPurchase(true);
      // Convert major units (what user enters) to minor units expected by the API
      // All supported currencies use 100 minor units per major unit
      const homeCurrency = localStorage.getItem('home_currency') || 'NGN';
      const currencyMinor = getCurrencyScale(homeCurrency);
      const amountMinor = Math.round(amount * currencyMinor);

      // Build description from channel and notes
      const description = logNotes 
        ? `Channel: ${logChannel} | ${logNotes}`
        : `Channel: ${logChannel}`;

      // Let the server compute points from the canonical minor-unit amount to avoid mismatches
      await apiClient.createPurchase({
        customerId: selectedCustomer.id,
        amountNgn: amountMinor,
        description,
        purchaseDate
      });

      toast.success('Transaction logged successfully!');
      
      // Reset form
      setLogDialogOpen(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setCustomerResults([]);
      setLogAmount('');
      setLogChannel('physical_store');
      setLogNotes('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      
      // Refresh purchases
      fetchPurchases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to log transaction');
    } finally {
      setLoggingPurchase(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerPhone || !newCustomerFirstName) {
      toast.error('Phone number and first name are required');
      return;
    }

    try {
      setCreatingCustomer(true);
      const fullPhoneNumber = `${newCustomerCountryCode}${newCustomerPhone}`;
      const response = await apiClient.createCustomer({
        phoneNumber: fullPhoneNumber,
        firstName: newCustomerFirstName,
        lastName: newCustomerLastName || undefined,
        email: newCustomerEmail || undefined
      });
      
      toast.success('Customer added successfully');
      setSelectedCustomer(response);
      setShowAddCustomer(false);
      setNewCustomerCountryCode('+234');
      setNewCustomerPhone('');
      setNewCustomerFirstName('');
      setNewCustomerLastName('');
      setNewCustomerEmail('');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openReviewDialog = (claim: any, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setReviewAction(action);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'high_amount': return 'text-red-600 bg-red-50';
      case 'new_customer': return 'text-amber-600 bg-amber-50';
      case 'no_receipt': return 'text-orange-600 bg-orange-50';
      case 'high_rejection_rate': return 'text-red-600 bg-red-50';
      case 'repeated_amount': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFlagLabel = (flag: string) => {
    switch (flag) {
      case 'high_amount': return 'High Amount';
      case 'new_customer': return 'New Customer';
      case 'no_receipt': return 'No Receipt';
      case 'high_rejection_rate': return 'High Rejection Rate';
      case 'repeated_amount': return 'Repeated Amount';
      default: return flag;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'physical_store': return 'Physical Store';
      case 'online': return 'Online';
      case 'social_media': return 'Social Media';
      case 'other': return 'Other';
      default: return channel;
    }
  };

  const exportRowsToCsv = (rows: string[][], filename: string) => {
    const content = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pendingCount = pendingClaimsTotal;
  const rejectedCount = rejectedClaimsTotal;
  const confirmedCount = purchasesTotal;
  const allTransactionsCount = confirmedCount + rejectedClaimsForAll;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPurchases = useMemo(() => {
    // Merge purchases and rejected claims for All tab
    let allTransactions = [...purchases];
    
    if (activeTab === 'all') {
      // Add rejected claims with a status flag
      const rejectedWithStatus = rejectedClaims.map(claim => ({
        ...claim,
        isRejected: true,
        customer: claim.customer,
        amountNgn: claim.amountNgn,
        pointsAwarded: Math.floor(claim.amountNgn / 100),
        createdAt: claim.createdAt,
        source: 'claim',
        notes: claim.rejectionReason || ''
      }));
      allTransactions = [...purchases, ...rejectedWithStatus];
      
      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    if (!normalizedQuery) return allTransactions;
    
    return allTransactions.filter((transaction) => {
      const name = `${transaction.customer.firstName || ''} ${transaction.customer.lastName || ''} ${transaction.customer.whatsappName || ''}`.toLowerCase();
      const phone = String(transaction.customer.phoneNumber || '').toLowerCase();
      return name.includes(normalizedQuery) || phone.includes(normalizedQuery);
    });
  }, [purchases, rejectedClaims, activeTab, normalizedQuery]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const isSameDay = (dateValue: string | Date) => {
      const d = new Date(dateValue);
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    };

    const todaysPurchases = purchases.filter((purchase) => isSameDay(purchase.createdAt));
    const todaysSales = todaysPurchases.length;
    const todaysRevenue = todaysPurchases.reduce((sum, purchase) => sum + (purchase.amountNgn || 0), 0);
    const todaysPoints = todaysPurchases.reduce((sum, purchase) => sum + (purchase.pointsAwarded || 0), 0);

    return { todaysSales, todaysRevenue, todaysPoints };
  }, [purchases]);

  // Calculate points to award based on amount (fixed earn rates)
  const pointsCalculation = useMemo(() => {
    const amount = parseFloat(logAmount) || 0;
    if (amount <= 0 || !selectedCustomer) {
      return null;
    }
    
    // Calculate points using fixed earn rates from spec
    // NGN: ₦1000 = 1 point, GBP/USD/EUR: £1/$1/€1 = 1 point
    const homeCurrency = localStorage.getItem('home_currency') || 'NGN';
    const currencyMinor = getCurrencyScale(homeCurrency);
    
    // Fixed earn units based on currency (not configurable)
    const earnUnit = (homeCurrency === 'NGN') ? 1000 : 1;
    
    // Convert to minor units then calculate points: floor(amountMinor / (currencyMinor * earnUnit))
    const amountMinor = amount * currencyMinor;
    const pointsToAward = Math.floor(amountMinor / (currencyMinor * earnUnit));
    const currentPoints = selectedCustomer.pointsBalance?.currentBalance || 0;
    const totalPoints = currentPoints + pointsToAward;
    
    return { pointsToAward, currentPoints, totalPoints };
  }, [logAmount, selectedCustomer, tenantSettings]);

  const renderPurchasesTable = () => {
    if (loading) {
      return (
        <div className="text-center py-12 text-gray-500">Loading transactions...</div>
      );
    }

    if (purchases.length === 0) {
      return (
        <div className="text-center py-12">
          <ShoppingBag className="size-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No transactions found</p>
          <p className="text-sm text-gray-400 mt-1">
            Transactions from logged sales and approved claims will appear here
          </p>
        </div>
      );
    }

    const showStatusColumn = activeTab === 'all';

    const handleExport = () => {
      const headers = ['Customer', 'Phone', 'Amount', 'Points', 'Date'];
      if (showStatusColumn) headers.push('Status');
      headers.push('Source', 'Notes');

      const rows = [
        headers,
        ...filteredPurchases.map((purchase) => {
          const row = [
            `${purchase.customer.firstName || purchase.customer.whatsappName || ''} ${purchase.customer.lastName || ''}`.trim(),
            purchase.customer.phoneNumber || '',
            purchase.amountNgn || 0,
            purchase.pointsAwarded || 0,
            purchase.createdAt || ''
          ];
          if (showStatusColumn) row.push('Confirmed');
          row.push(purchase.source || '', purchase.notes || '');
          return row;
        })
      ];
      exportRowsToCsv(rows, 'transactions.csv');
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search customer or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleExport} className="flex-shrink-0 h-10 w-10 sm:w-auto sm:px-4 p-0 sm:p-2">
            <Download className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
        {/* Mobile Card View */}
        <div className="space-y-4 md:hidden">
          {filteredPurchases.map((purchase) => (
            <div key={purchase.id} className="border rounded-lg p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="size-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {purchase.customer.firstName || purchase.customer.whatsappName} {purchase.customer.lastName || ''}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{purchase.customer.phoneNumber}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">{formatNGN(purchase.amountNgn)}</p>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">
                    +{purchase.pointsAwarded} pts
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t">
                <span>{new Date(purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="flex items-center gap-2">
                  {showStatusColumn && (
                    purchase.isRejected ? (
                      <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-xs">Rejected</Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs">Confirmed</Badge>
                    )
                  )}
                  <Badge variant="outline" className={`text-xs ${
                    purchase.source === 'claim' 
                      ? 'border-blue-200 text-blue-700 bg-blue-50' 
                      : 'border-gray-200 text-gray-600 bg-gray-50'
                  }`}>
                    {purchase.source === 'claim' ? 'Customer' : 'Vendor'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="border rounded-lg overflow-hidden hidden md:block">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Date</TableHead>
              {showStatusColumn && <TableHead>Status</TableHead>}
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {purchase.customer.firstName || purchase.customer.whatsappName} {purchase.customer.lastName || ''}
                      </p>
                      <p className="text-xs text-gray-500">{purchase.customer.phoneNumber}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-semibold">{formatNGN(purchase.amountNgn)}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                    +{purchase.pointsAwarded}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{new Date(purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </TableCell>
                {showStatusColumn && (
                  <TableCell>
                    {purchase.isRejected ? (
                      <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Rejected</Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Confirmed</Badge>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${
                    purchase.source === 'claim' 
                      ? 'border-blue-200 text-blue-700 bg-blue-50' 
                      : 'border-gray-200 text-gray-600 bg-gray-50'
                  }`}>
                    {purchase.source === 'claim' ? 'Customer Transaction' : 'Vendor Logged'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {purchase.notes ? (
                    <p className="text-xs text-gray-600 max-w-[200px] truncate" title={purchase.notes}>{purchase.notes}</p>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="text-center text-sm text-gray-500">No matching transactions</div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            <span className="hidden sm:inline">{purchasesTotal} total • </span>Page {purchasesPage}/{purchasesPages}
          </p>
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPurchasesPage(Math.max(1, purchasesPage - 1))}
              disabled={purchasesPage <= 1}
              className="h-8 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPurchasesPage(Math.min(purchasesPages, purchasesPage + 1))}
              disabled={purchasesPage >= purchasesPages}
              className="h-8 px-2 sm:px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderClaimsList = (status: 'pending' | 'rejected') => {
    if (loading) {
      return (
        <div className="text-center py-12 text-gray-500">Loading transaction claims...</div>
      );
    }

    if (claims.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="size-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No {status} transaction claims found</p>
        </div>
      );
    }

    const filteredClaims = !normalizedQuery
      ? claims
      : claims.filter((claim) => {
          const name = `${claim.customer.firstName || ''} ${claim.customer.lastName || ''} ${claim.customer.whatsappName || ''}`.toLowerCase();
          const phone = String(claim.customer.phoneNumber || '').toLowerCase();
          return name.includes(normalizedQuery) || phone.includes(normalizedQuery);
        });

    const handleExport = () => {
      const rows = [
        ['Customer', 'Phone', 'Amount', 'Points', 'Transaction Date', 'Status', 'Channel'],
        ...filteredClaims.map((claim) => [
          `${claim.customer.firstName || claim.customer.whatsappName || ''} ${claim.customer.lastName || ''}`.trim(),
          claim.customer.phoneNumber || '',
          claim.amountNgn || 0,
          Math.floor((claim.amountNgn || 0) / 100),
          claim.purchaseDate || '',
          claim.status || '',
          claim.channel || ''
        ])
      ];
      exportRowsToCsv(rows, `${status}-claims.csv`);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search customer or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleExport} className="flex-shrink-0 h-10 w-10 sm:w-auto sm:px-4 p-0 sm:p-2">
            <Download className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
        {/* Mobile Card View */}
        <div className="space-y-4 md:hidden">
          {filteredClaims.map((claim) => (
            <div 
              key={claim.id} 
              className={`border rounded-lg p-3 bg-white space-y-3 ${claim.fraudFlags?.length > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}
            >
              {/* Header: Customer + Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="size-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {claim.customer.firstName || claim.customer.whatsappName} {claim.customer.lastName || ''}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{claim.customer.phoneNumber}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">{formatNGN(claim.amountNgn)}</p>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">
                    +{Math.floor(claim.amountNgn / 100)} pts
                  </Badge>
                </div>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Transaction Date</p>
                  <p className="font-medium">{new Date(claim.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-gray-500">Channel</p>
                  <p className="font-medium">{getChannelLabel(claim.channel)}</p>
                </div>
              </div>

              {/* Flags */}
              {claim.fraudFlags && claim.fraudFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {claim.fraudFlags.map((flag: string) => (
                    <Badge key={flag} className={`text-xs ${getFlagColor(flag)}`}>
                      <Flag className="size-3 mr-1" />
                      {getFlagLabel(flag)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Receipt + Rejection Reason */}
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <div>
                  {claim.receiptUrl ? (
                    <button 
                      onClick={() => {
                        setSelectedReceiptUrl(claim.receiptUrl);
                        setReceiptModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      View receipt <ExternalLink className="size-3" />
                    </button>
                  ) : (
                    <span className="text-gray-400">No receipt</span>
                  )}
                  {claim.status === 'rejected' && claim.rejectionReason && (
                    <p className="text-red-600 mt-1 truncate max-w-[150px]" title={claim.rejectionReason}>
                      {claim.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {claim.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openReviewDialog(claim, 'approve')}
                        className="h-7 px-2 text-xs"
                      >
                        <CheckCircle className="size-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openReviewDialog(claim, 'reject')}
                        className="h-7 px-2 text-xs"
                      >
                        <XCircle className="size-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {claim.status === 'rejected' && (
                    <Badge variant="destructive" className="text-xs">Rejected</Badge>
                  )}
                  {claim.status === 'approved' && (
                    <Badge variant="default" className="text-xs">Approved</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="border rounded-lg overflow-hidden hidden md:block">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transaction Date</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClaims.map((claim) => (
              <TableRow 
                key={claim.id}
                className={claim.fraudFlags?.length > 0 ? 'bg-amber-50/30' : ''}
              >
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {claim.customer.firstName || claim.customer.whatsappName} {claim.customer.lastName || ''}
                      </p>
                      <p className="text-xs text-gray-500">{claim.customer.phoneNumber}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={claim.customer.loyaltyStatus === 'active' ? 'default' : 'secondary'} className="text-xs h-4 px-1">
                          {claim.customer.loyaltyStatus}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {claim.customer.totalPurchases} transactions
                        </span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-semibold">{formatNGN(claim.amountNgn)}</p>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                    +{Math.floor(claim.amountNgn / 100)} points
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {claim.customer.pointsBalance?.currentBalance || 0} current
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{new Date(claim.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted {new Date(claim.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {claim.status === 'pending' && claim.expiresAt && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" />
                      Expires {formatDate(claim.expiresAt)}
                    </p>
                  )}
                  {claim.status === 'rejected' && claim.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={claim.rejectionReason}>
                      {claim.rejectionReason}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{getChannelLabel(claim.channel)}</p>
                  <p className="text-xs text-gray-500">
                    {claim.receiptUrl ? (
                      <button 
                        onClick={() => {
                          setSelectedReceiptUrl(claim.receiptUrl);
                          setReceiptModalOpen(true);
                        }}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        View receipt <ExternalLink className="size-3" />
                      </button>
                    ) : (
                      '✗ No receipt'
                    )}
                  </p>
                  {claim.description && (
                    <p className="text-xs text-gray-500 mt-0.5 max-w-[150px] truncate" title={claim.description}>
                      "{claim.description}"
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {claim.fraudFlags && claim.fraudFlags.length > 0 ? (
                    <div className="space-y-1">
                      {claim.fraudFlags.map((flag: string) => (
                        <Badge key={flag} className={`text-xs ${getFlagColor(flag)} block w-fit`}>
                          {getFlagLabel(flag)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {claim.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openReviewDialog(claim, 'approve')}
                          className="h-8"
                        >
                          <CheckCircle className="size-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openReviewDialog(claim, 'reject')}
                          className="h-8"
                        >
                          <XCircle className="size-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {claim.status === 'rejected' && (
                      <Badge variant="destructive" className="text-xs">Rejected</Badge>
                    )}
                    {claim.status === 'approved' && (
                      <Badge variant="default" className="text-xs">Approved</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {filteredClaims.length === 0 && (
          <div className="text-center text-sm text-gray-500">No matching claims</div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            <span className="hidden sm:inline">{claimsTotal} total • </span>Page {status === 'pending' ? pendingPage : rejectedPage}/{claimsPages}
          </p>
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                status === 'pending'
                  ? setPendingPage(Math.max(1, pendingPage - 1))
                  : setRejectedPage(Math.max(1, rejectedPage - 1))
              }
              disabled={status === 'pending' ? pendingPage <= 1 : rejectedPage <= 1}
              className="h-8 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                status === 'pending'
                  ? setPendingPage(Math.min(claimsPages, pendingPage + 1))
                  : setRejectedPage(Math.min(claimsPages, rejectedPage + 1))
              }
              disabled={status === 'pending' ? pendingPage >= claimsPages : rejectedPage >= claimsPages}
              className="h-8 px-2 sm:px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Transactions</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage confirmed transactions and review customer claims</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && activeTab !== 'pending' && (
            <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
              {pendingCount} Pending
            </Badge>
          )}
          <Button onClick={() => setLogDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="size-4 mr-2" />
            Log Transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-3 sm:pb-3 sm:p-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <Calendar className="size-3 sm:size-4 text-blue-600" />
              Today's Sales
            </CardDescription>
            <CardTitle className="text-lg sm:text-2xl">{todayStats.todaysSales}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:pb-3 sm:p-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <DollarSign className="size-3 sm:size-4 text-green-600" />
              Today's Revenue
            </CardDescription>
            <CardTitle className="text-lg sm:text-2xl">{formatNGN(todayStats.todaysRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:pb-3 sm:p-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <TrendingUp className="size-3 sm:size-4 text-purple-600" />
              Points Awarded
            </CardDescription>
            <CardTitle className="text-lg sm:text-2xl">{todayStats.todaysPoints}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:pb-3 sm:p-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm text-xs sm:text-sm">
              <Clock className="size-3 sm:size-4 text-orange-600" />
              Pending Claims
            </CardDescription>
            <CardTitle className="text-lg sm:text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto pb-px">
        <div className="flex gap-4 sm:gap-6 px-0 sm:px-6 min-w-max">
          {[
            { id: 'all', label: 'All', count: allTransactionsCount },
            { id: 'confirmed', label: 'Confirmed', count: confirmedCount },
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'rejected', label: 'Rejected', count: rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="hidden sm:inline">{tab.label === 'All' ? 'All Transactions' : tab.label}</span>
              <span className="sm:hidden">{tab.label}</span>
              <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Card>
        <div className="p-3 sm:p-6">
          {(activeTab === 'all' || activeTab === 'confirmed') && renderPurchasesTable()}
          {activeTab === 'pending' && renderClaimsList('pending')}
          {activeTab === 'rejected' && renderClaimsList('rejected')}
        </div>
      </Card>

      {/* Log Transaction Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={(open) => {
        setLogDialogOpen(open);
        if (!open) {
          setSelectedCustomer(null);
          setCustomerSearch('');
          setCustomerResults([]);
          setLogAmount('');
          setLogChannel('physical_store');
          setLogNotes('');
          setShowAddCustomer(false);
          setNewCustomerCountryCode('+234');
          setNewCustomerPhone('');
          setNewCustomerFirstName('');
          setNewCustomerLastName('');
          setNewCustomerEmail('');
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5" />
              Log transaction
            </DialogTitle>
            {!showAddCustomer && (
              <DialogDescription>
                Search for customer by name or phone number
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Add Customer Form */}
            {showAddCustomer ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number *</label>
                  <div className="flex gap-2">
                    <Select value={newCustomerCountryCode} onValueChange={setNewCustomerCountryCode}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+234">🇳🇬 +234 NG</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44 UK</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1 US</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91 IN</SelectItem>
                        <SelectItem value="+86">🇨🇳 +86 CN</SelectItem>
                        <SelectItem value="+81">🇯🇵 +81 JP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="801 234 5678"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Enter number without country code</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">First Name *</label>
                    <Input
                      placeholder="John"
                      value={newCustomerFirstName}
                      onChange={(e) => setNewCustomerFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Last Name</label>
                    <Input
                      placeholder="Doe"
                      value={newCustomerLastName}
                      onChange={(e) => setNewCustomerLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddCustomer(false);
                      setNewCustomerCountryCode('+234');
                      setNewCustomerPhone('');
                      setNewCustomerFirstName('');
                      setNewCustomerLastName('');
                      setNewCustomerEmail('');
                    }}
                    disabled={creatingCustomer}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-black hover:bg-gray-800 text-white"
                    onClick={handleAddCustomer}
                    disabled={creatingCustomer || !newCustomerPhone || !newCustomerFirstName}
                  >
                    {creatingCustomer ? 'Adding...' : 'Add Customer'}
                  </Button>
                </div>
              </div>
            ) : !selectedCustomer ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Find Customer</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      placeholder="Enter name or phone number..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Customer Results */}
                {searchingCustomers && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm">Searching...</p>
                  </div>
                )}

                {!searchingCustomers && customerSearch && customerResults.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No customers found</p>
                  </div>
                )}

                {!searchingCustomers && customerResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className="w-full p-3 hover:bg-gray-50 text-left flex items-center gap-3 transition-colors"
                      >
                        <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="size-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {customer.firstName || customer.whatsappName} {customer.lastName || ''}
                          </p>
                          <p className="text-xs text-gray-500">{customer.phoneNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge className="border-amber-200 text-amber-700 bg-amber-50">
                            {customer.pointsBalance?.currentBalance || 0} pts
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {customer._count?.purchases || 0} purchases
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchingCustomers && !customerSearch && (
                  <div className="text-center py-8">
                    <Search className="size-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Start typing to search customers</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setLogDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="default" className="flex-1" onClick={() => setShowAddCustomer(true)}>
                    <UserPlus className="size-4 mr-2" />
                    Add New Customer
                  </Button>
                </div>
              </div>
            ) : (
              /* Transaction Form */
              <div className="space-y-4">
                {/* Selected Customer */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {selectedCustomer.firstName || selectedCustomer.whatsappName} {selectedCustomer.lastName || ''}
                        </p>
                        <p className="text-xs text-gray-600">{selectedCustomer.phoneNumber}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                      className="h-8"
                    >
                      Change
                    </Button>
                  </div>
                </div>

                {/* Transaction Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Transaction Amount {(() => {
                      const homeCurrency = localStorage.getItem('home_currency') || 'NGN';
                      return `(${getCurrencySymbol(homeCurrency)})`;
                    })()} *
                  </label>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    min="0"
                    step="100"
                  />
                </div>

                {/* Points Calculation Banner */}
                {pointsCalculation && pointsCalculation.pointsToAward > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="size-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Points to award:</span>
                      <Badge className="bg-green-600 text-white border-green-600">
                        +{pointsCalculation.pointsToAward} points
                      </Badge>
                    </div>
                    <p className="text-xs text-green-700 pl-6">
                      Customer will have {pointsCalculation.totalPoints} points total
                    </p>
                  </div>
                )}

                {/* Channel */}
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">Channel *</label>
                  <Select value={logChannel} onValueChange={setLogChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical_store">Physical Store</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="mobile_app">Mobile App</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">Transaction Date *</label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500">Cannot select future dates</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                  <Input
                    placeholder="e.g., Clothing transaction"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                  />
                </div>

                {/* Points Calculation Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Points Calculation (Fixed Rate)</p>
                  <p>
                    {(() => {
                      const homeCurrency = localStorage.getItem('home_currency') || 'NGN';
                      // Fixed earn rate: NGN = ₦1000 per point, others = 1 per point
                      const earnUnit = (homeCurrency === 'NGN') ? 1000 : 1;
                      return `${getCurrencySymbol(homeCurrency)}${earnUnit.toLocaleString()} = 1 point`;
                    })()}
                  </p>
                </div>

                {/* Actions */}
                <Button
                  className="w-full"
                  onClick={handleLogPurchase}
                  disabled={loggingPurchase || !logAmount}
                >
                  {loggingPurchase ? 'Logging Transaction...' : 'Log Transaction'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Transaction Claim' : 'Reject Transaction Claim'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Customer will receive points and a WhatsApp notification.'
                : 'Customer will be notified via WhatsApp with your reason.'}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 pt-4">
              {/* Claim summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {selectedClaim.customer.firstName || selectedClaim.customer.whatsappName} {selectedClaim.customer.lastName || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-semibold">{formatNGN(selectedClaim.amountNgn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Points to Award:</span>
                  <span className="font-semibold text-green-600">
                    {Math.floor(selectedClaim.amountNgn / 100)} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New Balance:</span>
                  <span className="font-semibold">
                    {(selectedClaim.customer.pointsBalance?.currentBalance || 0) + Math.floor(selectedClaim.amountNgn / 100)} points
                  </span>
                </div>
              </div>

              {/* Warning for flagged claims */}
              {reviewAction === 'approve' && selectedClaim.fraudFlags?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Fraud Flags Detected</p>
                    <p className="text-amber-700 mt-1">
                      {selectedClaim.fraudFlags.map((f: string) => getFlagLabel(f)).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Rejection reason input */}
              {reviewAction === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Rejection *</label>
                  <Textarea
                    placeholder="e.g., Receipt doesn't match amount, Duplicate claim, etc."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  variant={reviewAction === 'approve' ? 'default' : 'destructive'}
                  onClick={handleReview}
                  disabled={submitting || (reviewAction === 'reject' && !rejectionReason.trim())}
                >
                  {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve & Notify' : 'Reject & Notify'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Image Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
            <DialogDescription>
              Transaction receipt
            </DialogDescription>
          </DialogHeader>
          {selectedReceiptUrl && (
            <div className="flex flex-col items-center gap-4">
              <img 
                src={selectedReceiptUrl} 
                alt="Receipt" 
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'Failed to load receipt image';
                  e.currentTarget.className = 'text-red-500 p-4';
                }}
              />
              <Button
                variant="outline"
                onClick={() => window.open(selectedReceiptUrl, '_blank')}
              >
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
