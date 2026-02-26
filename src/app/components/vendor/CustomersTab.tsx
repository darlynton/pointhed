import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { formatNGN, formatMajor, formatDate, getCurrencySymbol } from '../../../lib/mockData';
import { apiClient } from '../../../lib/api';
import { Search, UserPlus, Eye, Ban, Phone, TrendingUp, History, ShoppingCart, MoreVertical, User, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

export function CustomersTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersPages, setCustomersPages] = useState(1);
  const customersLimit = 10;
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [adjustPointsDialogOpen, setAdjustPointsDialogOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [pointsActivity, setPointsActivity] = useState<any[]>([]);
  const [pointsActivityLoading, setPointsActivityLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchasePointsPreview, setPurchasePointsPreview] = useState(0);
  const [tenantSettings, setTenantSettings] = useState<any | null>(null);
  const [amountValidationMessage, setAmountValidationMessage] = useState<string | null>(null);
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseChannel, setPurchaseChannel] = useState('physical_store');
  const [pointsAdjustment, setPointsAdjustment] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [logFirstPurchase, setLogFirstPurchase] = useState(false);
  const [addPurchaseAmount, setAddPurchaseAmount] = useState('');
  const [addPurchaseChannel, setAddPurchaseChannel] = useState('physical_store');
  const [addPurchaseDescription, setAddPurchaseDescription] = useState('');
  const [addPurchasePointsPreview, setAddPurchasePointsPreview] = useState(0);
  const [addAmountValidationMessage, setAddAmountValidationMessage] = useState<string | null>(null);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  
  // Bulk import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add customer form fields
  const [countryCode, setCountryCode] = useState('+234');
  const [newCustomer, setNewCustomer] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    email: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomers({ search: searchTerm, page, limit: customersLimit });
      setCustomers(response.data || []);
      setCustomersTotal(response.pagination?.total || 0);
      setCustomersPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Load immediately on first render, debounce subsequent searches
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchCustomers();
      return;
    }
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  useEffect(() => {
    // When transaction dialog opens, fetch tenant settings for localization and points rules
    if (purchaseDialogOpen) {
      (async () => {
        try {
          const settings = await apiClient.getSettings();
          setTenantSettings(settings?.loyalty ? settings : null);
        } catch (e) {
          console.warn('Failed to load tenant settings for transaction dialog', e);
          setTenantSettings(null);
        }
      })();
    } else {
      // clear preview when dialog closed
      setPurchasePointsPreview(0);
      setAmountValidationMessage(null);
    }
  }, [purchaseDialogOpen]);

  useEffect(() => {
    if (addDialogOpen) {
      (async () => {
        try {
          const settings = await apiClient.getSettings();
          setTenantSettings(settings?.loyalty ? settings : null);
        } catch (e) {
          console.warn('Failed to load tenant settings for add customer dialog', e);
          setTenantSettings(null);
        }
      })();
    } else {
      setLogFirstPurchase(false);
      setAddPurchaseAmount('');
      setAddPurchaseChannel('physical_store');
      setAddPurchaseDescription('');
      setAddPurchasePointsPreview(0);
      setAddAmountValidationMessage(null);
      setAddCustomerError(null);
    }
  }, [addDialogOpen]);

  const handleAddCustomer = async () => {
    setAddCustomerError(null);
    if (!newCustomer.phoneNumber || !newCustomer.firstName) {
      setAddCustomerError('Phone number and first name are required');
      return;
    }

    // Combine country code with phone number
    const fullPhoneNumber = `${countryCode}${newCustomer.phoneNumber}`;

    // Basic phone number validation (digits only after country code)
    const phoneDigits = newCustomer.phoneNumber.replace(/[\s-]/g, '');
    if (!/^\d{7,15}$/.test(phoneDigits)) {
      setAddCustomerError('Please enter a valid phone number (7-15 digits)');
      return;
    }

    // Email validation if provided
    if (newCustomer.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCustomer.email)) {
        setAddCustomerError('Please enter a valid email address');
        return;
      }
    }

    // If logging first purchase, validate amount before creating customer
    if (logFirstPurchase) {
      const amount = parseFloat(addPurchaseAmount);
      if (!amount || amount <= 0) {
        setAddCustomerError('Transaction amount is required');
        return;
      }

      const minPurchase = tenantSettings?.loyalty?.minimumPurchase ?? 0;
      if (minPurchase > 0 && amount < minPurchase) {
        setAddCustomerError(`Transaction amount must be at least ${formatMajor(minPurchase)}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const createdCustomer = await apiClient.createCustomer({
        ...newCustomer,
        phoneNumber: fullPhoneNumber,
        ...(logFirstPurchase ? { optedIn: true } : {})
      });

      if (logFirstPurchase) {
        const amount = parseFloat(addPurchaseAmount);
        const homeCurrency = tenantSettings?.business?.homeCurrency || localStorage.getItem('home_currency') || 'NGN';
        const currencyMinor = getCurrencyScale(homeCurrency);
        const amountMinor = Math.round(amount * currencyMinor);
        const description = addPurchaseDescription
          ? `Channel: ${addPurchaseChannel} | ${addPurchaseDescription}`
          : `Channel: ${addPurchaseChannel}`;
        const purchaseDate = createdCustomer?.createdAt || new Date().toISOString();

        await apiClient.createPurchase({
          customerId: createdCustomer.id,
          amountNgn: amountMinor,
          description,
          purchaseDate
        });
      }

      toast.success('Customer added successfully!');
      setAddDialogOpen(false);
      setNewCustomer({ phoneNumber: '', firstName: '', lastName: '', email: '' });
      setCountryCode('+234');
      setLogFirstPurchase(false);
      setAddPurchaseAmount('');
      setAddPurchaseChannel('physical_store');
      setAddPurchaseDescription('');
      setAddPurchasePointsPreview(0);
      setAddAmountValidationMessage(null);
      setAddCustomerError(null);
      fetchCustomers();
    } catch (error: any) {
      // Handle specific error cases
      if (error.message.includes('phone number already exists')) {
        setAddCustomerError('This phone number is already registered in your loyalty program');
      } else if (error.message.includes('email already exists')) {
        setAddCustomerError('This email is already registered in your loyalty program');
      } else {
        setAddCustomerError(error.message || 'Failed to add customer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogPurchase = async () => {
    if (!selectedCustomer || !purchaseAmount) {
      toast.error('Transaction amount is required');
      return;
    }

    const amount = parseFloat(purchaseAmount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Enforce minimum transaction if available from settings
    const minPurchase = tenantSettings?.loyalty?.minimumPurchase ?? 0;
    if (minPurchase > 0 && amount < minPurchase) {
      toast.error(`Transaction amount must be at least ${formatMajor(minPurchase)}`);
      return;
    }

    try {
      setSubmitting(true);
      // Convert major units (what user enters) to minor units expected by the API (e.g., pounds -> pence)
      // Use tenant settings to determine minor scale when available, fallback to 100
      const currencyMinor = tenantSettings?.homeCurrency ? 100 : 100;
      const amountMinor = Math.round(amount * currencyMinor);

      // Build description from channel and notes
      const description = purchaseDescription 
        ? `Channel: ${purchaseChannel} | ${purchaseDescription}`
        : `Channel: ${purchaseChannel}`;

      // Let the server compute points from the canonical minor-unit amount to avoid mismatches
      const response = await apiClient.createPurchase({
        customerId: selectedCustomer.id,
        amountNgn: amountMinor,
        description,
        purchaseDate
      });

      // Show warning if customer is blocked
      if (response.data?.warning) {
        toast.warning(response.data.warning);
      } else {
        // Show a simple success confirmation (no amount or points in toast)
        toast.success('Transaction added successfully');
      }
      
      setPurchaseDialogOpen(false);
      setPurchaseAmount('');
      setPurchaseDescription('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseChannel('physical_store');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to log transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedCustomer || !pointsAdjustment) {
      toast.error('Points value is required');
      return;
    }

    const points = parseInt(pointsAdjustment);
    if (points <= 0) {
      toast.error('Points must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.adjustPoints(selectedCustomer.id, {
        points,
        adjustmentType,
        description: adjustmentReason || `Points ${adjustmentType === 'add' ? 'added' : 'deducted'} by admin`
      });

      toast.success(`Points ${adjustmentType === 'add' ? 'added' : 'deducted'} successfully!`);
      setAdjustPointsDialogOpen(false);
      setPointsAdjustment('');
      setAdjustmentReason('');
      setAdjustmentType('add');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust points');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const customerId = selectedCustomer?.id;
    if (!customerId) {
      setCustomerDetails(null);
      setPointsActivity([]);
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setPointsActivityLoading(true);
        const [details, transactions] = await Promise.all([
          apiClient.getCustomer(customerId),
          apiClient.getPointsTransactions(customerId, { limit: 20 })
        ]);
        if (cancelled) return;
        setCustomerDetails(details?.data || details || null);
        setPointsActivity(transactions?.data || []);
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || 'Failed to load customer details');
        }
      } finally {
        if (!cancelled) setPointsActivityLoading(false);
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedCustomer?.id]);

  const handleBlockCustomer = async (block: boolean) => {
    if (!selectedCustomer) return;

    if (block && !blockReason) {
      toast.error('Please provide a reason for blocking');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.blockCustomer(selectedCustomer.id, {
        block,
        reason: blockReason
      });

      toast.success(block ? 'Customer blocked successfully' : 'Customer unblocked successfully');
      setBlockDialogOpen(false);
      setBlockReason('');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update customer status');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatePoints = (amount: string) => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return 0;

    const homeCurrency = tenantSettings?.business?.homeCurrency || localStorage.getItem('home_currency') || 'NGN';
    // Fixed earn rate: NGN = ₦1000 per point, others = 1 per point
    const earnUnit = homeCurrency === 'NGN' ? 1000 : 1;

    return Math.floor(amountNum / earnUnit);
  };

  const getCurrencyScale = (currency?: string): number => {
    // All supported currencies (NGN, GBP, USD, EUR) have 100 minor units
    return 100;
  };

  // Update preview when purchaseAmount or tenantSettings change
  useEffect(() => {
    const pts = calculatePoints(purchaseAmount);
    setPurchasePointsPreview(pts);

    const minPurchase = tenantSettings?.loyalty?.minimumPurchase ?? 0;
    if (minPurchase > 0 && purchaseAmount) {
      const amt = parseFloat(purchaseAmount);
      if (!isNaN(amt) && amt < minPurchase) {
        setAmountValidationMessage(`Minimum transaction is ${formatMajor(minPurchase)}`);
      } else {
        setAmountValidationMessage(null);
      }
    }
  }, [purchaseAmount, tenantSettings]);

  // CSV parsing for bulk import
  const parseCSV = (text: string): { headers: string[]; rows: any[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Parse data rows
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length > 0 && values.some(v => v)) {
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        rows.push(row);
      }
    }
    
    return { headers, rows };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('File size must be under 1MB');
      return;
    }
    
    setImportFile(file);
    setImportErrors([]);
    setImportResult(null);
    
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      
      // Validate required columns
      const errors: string[] = [];
      const requiredCols = ['phonenumber', 'firstname'];
      const missingCols = requiredCols.filter(col => !headers.includes(col) && !headers.includes(col.replace('number', '_number')));
      
      // Also check alternate column names
      const hasPhone = headers.some(h => h.includes('phone'));
      const hasFirstName = headers.some(h => h.includes('first') || h === 'name');
      
      if (!hasPhone) errors.push('Missing "phoneNumber" column');
      if (!hasFirstName) errors.push('Missing "firstName" column');
      
      if (errors.length > 0) {
        setImportErrors(errors);
        setImportPreview([]);
        return;
      }
      
      // Normalize column names
      const normalizedRows = rows.map(row => ({
        phoneNumber: row.phonenumber || row.phone_number || row.phone || '',
        firstName: row.firstname || row.first_name || row.name || '',
        lastName: row.lastname || row.last_name || '',
        email: row.email || '',
        whatsappName: row.whatsappname || row.whatsapp_name || row.whatsapp || ''
      }));
      
      // Validate rows
      const validationErrors: string[] = [];
      normalizedRows.forEach((row, idx) => {
        if (!row.phoneNumber) validationErrors.push(`Row ${idx + 2}: Missing phone number`);
        if (!row.firstName) validationErrors.push(`Row ${idx + 2}: Missing first name`);
      });
      
      if (validationErrors.length > 5) {
        setImportErrors([...validationErrors.slice(0, 5), `...and ${validationErrors.length - 5} more errors`]);
      } else {
        setImportErrors(validationErrors);
      }
      
      setImportPreview(normalizedRows.slice(0, 10)); // Show first 10 for preview
      
    } catch (error) {
      toast.error('Failed to parse CSV file');
      setImportErrors(['Failed to read file']);
    }
  };

  const handleBulkImport = async () => {
    if (!importFile || importPreview.length === 0) return;
    
    try {
      setImporting(true);
      setImportProgress(10);
      
      // Re-parse the full file
      const text = await importFile.text();
      const { rows } = parseCSV(text);
      
      // Normalize all rows
      const customers = rows.map(row => ({
        phoneNumber: row.phonenumber || row.phone_number || row.phone || '',
        firstName: row.firstname || row.first_name || row.name || '',
        lastName: row.lastname || row.last_name || '',
        email: row.email || '',
        whatsappName: row.whatsappname || row.whatsapp_name || row.whatsapp || ''
      })).filter(c => c.phoneNumber && c.firstName);
      
      setImportProgress(30);
      
      const result = await apiClient.bulkImportCustomers(customers);
      
      setImportProgress(100);
      setImportResult(result.results);
      
      if (result.results.imported > 0) {
        toast.success(`Successfully imported ${result.results.imported} customers`);
        fetchCustomers();
      }
      
      if (result.results.skipped > 0) {
        toast.warning(`${result.results.skipped} customers skipped`);
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to import customers');
      setImportErrors([error.message || 'Import failed']);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'phoneNumber,firstName,lastName,email,whatsappName\n+2348012345678,John,Doe,john@example.com,John D\n+447911123456,Jane,Smith,jane@example.com,Jane S';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'customer-import-template.csv';
    link.click();
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const pts = calculatePoints(addPurchaseAmount);
    setAddPurchasePointsPreview(pts);

    const minPurchase = tenantSettings?.loyalty?.minimumPurchase ?? 0;
    if (minPurchase > 0 && addPurchaseAmount) {
      const amt = parseFloat(addPurchaseAmount);
      if (!isNaN(amt) && amt < minPurchase) {
        setAddAmountValidationMessage(`Minimum transaction is ${formatMajor(minPurchase)}`);
      } else {
        setAddAmountValidationMessage(null);
      }
    }
  }, [addPurchaseAmount, tenantSettings]);

  const filteredCustomers = customers;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Customer Management</h2>
          <p className="text-sm text-gray-600">View and manage your loyalty program members</p>
        </div>
        <div className="flex gap-2">
          {/* Bulk Import Button */}
          <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) resetImport(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="size-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Customers</DialogTitle>
                <DialogDescription>Upload a CSV file to import multiple customers at once</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {!importResult ? (
                  <>
                    {/* Template Download */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-5 text-blue-600" />
                        <span className="text-sm text-blue-800">Need a template?</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                        <Download className="size-4 mr-2" />
                        Download Template
                      </Button>
                    </div>

                    {/* File Upload */}
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="size-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm font-medium">
                        {importFile ? importFile.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">CSV file up to 1MB (max 500 customers)</p>
                    </div>

                    {/* Validation Errors */}
                    {importErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside text-sm">
                            {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Preview */}
                    {importPreview.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Preview ({importPreview.length} of {importFile ? 'many' : '0'} rows)</p>
                        <div className="max-h-48 overflow-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Phone</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Email</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-xs">{row.phoneNumber}</TableCell>
                                  <TableCell>{row.firstName}</TableCell>
                                  <TableCell>{row.lastName || '-'}</TableCell>
                                  <TableCell className="text-xs">{row.email || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    {importing && (
                      <div className="space-y-2">
                        <Progress value={importProgress} />
                        <p className="text-sm text-center text-gray-600">Importing customers...</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkImport} 
                        disabled={!importFile || importPreview.length === 0 || importErrors.length > 0 || importing}
                      >
                        {importing ? 'Importing...' : `Import ${importPreview.length}+ Customers`}
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Import Results */
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <CheckCircle2 className="size-12 mx-auto mb-3 text-green-500" />
                      <h3 className="text-lg font-semibold">Import Complete</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                        <p className="text-sm text-green-700">Imported</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                        <p className="text-sm text-amber-700">Skipped</p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Errors ({importResult.errors.length})</p>
                        <div className="max-h-32 overflow-auto p-3 bg-red-50 rounded-lg text-sm">
                          {importResult.errors.slice(0, 10).map((err, i) => (
                            <p key={i} className="text-red-700">Row {err.row}: {err.error}</p>
                          ))}
                          {importResult.errors.length > 10 && (
                            <p className="text-red-600 mt-1">...and {importResult.errors.length - 10} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { resetImport(); }}>
                        Import More
                      </Button>
                      <Button onClick={() => setImportDialogOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Customer Button */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="size-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Manually add a customer to your loyalty program</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number *</label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+234">🇳🇬 +234 Nigeria</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44 UK</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1 USA</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49 Germany</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33 France</SelectItem>
                      <SelectItem value="+34">🇪🇸 +34 Spain</SelectItem>
                      <SelectItem value="+39">🇮🇹 +39 Italy</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="801 234 5678" 
                    value={newCustomer.phoneNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter number without country code</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">First Name *</label>
                  <Input 
                    placeholder="John" 
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Last Name</label>
                  <Input 
                    placeholder="Doe" 
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email (Optional)</label>
                <Input 
                  type="email" 
                  placeholder="john@example.com" 
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="log-first-purchase"
                  checked={logFirstPurchase}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setLogFirstPurchase(enabled);
                    if (!enabled) {
                      setAddPurchaseAmount('');
                      setAddPurchaseChannel('physical_store');
                      setAddPurchaseDescription('');
                      setAddPurchasePointsPreview(0);
                      setAddAmountValidationMessage(null);
                    }
                  }}
                />
                <label htmlFor="log-first-purchase" className="text-sm font-medium">
                  Log first purchase now
                </label>
              </div>

              {logFirstPurchase && (
                <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Transaction Amount {(() => {
                        const homeCurrency = tenantSettings?.business?.homeCurrency || localStorage.getItem('home_currency') || 'NGN';
                        return `(${getCurrencySymbol(homeCurrency)})`;
                      })()} *
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={addPurchaseAmount}
                      onChange={(e) => setAddPurchaseAmount(e.target.value)}
                      min="0"
                      step="100"
                    />
                    {addAmountValidationMessage && (
                      <p className="text-xs text-rose-600 mt-1">{addAmountValidationMessage}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Channel *</label>
                    <Select value={addPurchaseChannel} onValueChange={setAddPurchaseChannel}>
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

                  {(() => {
                    const welcomeEnabled = tenantSettings?.loyalty?.welcomeBonusEnabled ?? true;
                    if (!welcomeEnabled) return null;
                    const welcomePoints = tenantSettings?.loyalty?.welcomeBonusPoints ?? 50;
                    const transactionPoints = addPurchasePointsPreview;
                    const totalPoints = welcomePoints + transactionPoints;
                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-purple-700 mb-2">Points Breakdown:</p>
                        <div className="flex items-center justify-between text-sm text-purple-700">
                          <span>Welcome bonus</span>
                          <span className="font-semibold">+{welcomePoints} points</span>
                        </div>
                        {transactionPoints > 0 && (
                          <div className="flex items-center justify-between text-sm text-purple-700 mt-2">
                            <span>Transaction points</span>
                            <span className="font-semibold">+{transactionPoints} points</span>
                          </div>
                        )}
                        <div className="border-t border-purple-200 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-700">Total starting points</span>
                          <Badge className="bg-purple-600 text-white border-purple-600">{totalPoints} points</Badge>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {addCustomerError && (
                <p className="text-sm text-rose-600">{addCustomerError}</p>
              )}
              <Button 
                className="w-full" 
                onClick={handleAddCustomer}
                disabled={
                  submitting
                  || !newCustomer.phoneNumber.trim()
                  || !newCustomer.firstName.trim()
                  || (logFirstPurchase && (
                    !addPurchaseAmount
                    || parseFloat(addPurchaseAmount) <= 0
                    || Boolean(addAmountValidationMessage)
                  ))
                }
              >
                {submitting ? 'Adding...' : 'Add Customer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">All Customers</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{customersTotal} customers</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No customers found</div>
          ) : (
          <>
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.firstName || customer.whatsappName || 'Unknown'} {customer.lastName || ''}</p>
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {customer.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-3 text-gray-400" />
                        <span>{customer.phoneNumber}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                      {customer.pointsBalance?.currentBalance || 0} pts
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.totalPurchases || 0}</TableCell>
                  <TableCell className="font-medium">{formatNGN(customer.totalSpentNgn || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={customer.loyaltyStatus === 'active' ? 'default' : 'secondary'}>
                      {customer.loyaltyStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg">Customer Details</DialogTitle>
                          <DialogDescription className="text-sm truncate">{(customerDetails || selectedCustomer)?.phoneNumber || customer.phoneNumber}</DialogDescription>
                        </DialogHeader>
                        {(customerDetails || selectedCustomer) && (
                          <div className="space-y-4 sm:space-y-6">
                            {/* Customer Info */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Full Name</p>
                                <p className="font-medium text-sm sm:text-base truncate">{(customerDetails || selectedCustomer).firstName || (customerDetails || selectedCustomer).whatsappName} {(customerDetails || selectedCustomer).lastName || ''}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Phone Number</p>
                                <p className="font-medium text-sm sm:text-base truncate">{(customerDetails || selectedCustomer).phoneNumber}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Current Points</p>
                                <p className="text-lg sm:text-xl font-semibold text-amber-600">{(customerDetails || selectedCustomer).pointsBalance?.currentBalance || 0} pts</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Member Since</p>
                                <p className="font-medium text-sm sm:text-base">{formatDate((customerDetails || selectedCustomer).createdAt)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Total Transactions</p>
                                <p className="font-medium text-sm sm:text-base">{(customerDetails || selectedCustomer).totalPurchases || 0}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs sm:text-sm text-gray-500">Total Spent</p>
                                <p className="font-medium text-sm sm:text-base truncate">{formatNGN((customerDetails || selectedCustomer).totalSpentNgn || 0)}</p>
                              </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                                <p className="text-[10px] sm:text-xs text-blue-600 mb-0.5 sm:mb-1">Avg. Order</p>
                                <p className="text-sm sm:text-lg font-semibold text-blue-700 truncate">
                                  {formatNGN((customerDetails || selectedCustomer).totalPurchases > 0 ? Math.floor((customerDetails || selectedCustomer).totalSpentNgn / (customerDetails || selectedCustomer).totalPurchases) : 0)}
                                </p>
                              </div>
                              <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                                <p className="text-[10px] sm:text-xs text-green-600 mb-0.5 sm:mb-1">Last Txn</p>
                                <p className="text-xs sm:text-sm font-semibold text-green-700">
                                  {(customerDetails || selectedCustomer).lastPurchaseAt ? formatDate((customerDetails || selectedCustomer).lastPurchaseAt) : 'Never'}
                                </p>
                              </div>
                              <div className="bg-amber-50 p-2 sm:p-3 rounded-lg">
                                <p className="text-[10px] sm:text-xs text-amber-600 mb-0.5 sm:mb-1">Status</p>
                                <Badge variant={(customerDetails || selectedCustomer).optedIn ? 'default' : 'secondary'} className="text-xs">
                                  {(customerDetails || selectedCustomer).optedIn ? 'Opted In' : 'Opted Out'}
                                </Badge>
                              </div>
                            </div>

                            {/* Points History */}
                            <div>
                              <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <History className="size-4" />
                                Recent Points Activity
                              </h3>
                              {pointsActivityLoading ? (
                                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">Loading points activity...</div>
                              ) : pointsActivity.length === 0 ? (
                                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">No points activity yet</div>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                  {pointsActivity.map((activity) => {
                                    const pointsValue = Number(activity.points || 0);
                                    const isDeduction = pointsValue < 0;
                                    const metadataAmount = activity?.metadata?.purchaseAmount ?? activity?.metadata?.purchase_amount;
                                    const rawDescription = String(activity.description || '').trim();
                                    const isRedeem = activity.transactionType === 'redeemed';
                                    const redeemName = rawDescription.replace(/^Redeemed\s+reward\s+/i, '').trim();
                                    const label = metadataAmount
                                      ? `Transaction log - ${formatNGN(metadataAmount)}`
                                      : rawDescription.toLowerCase() === 'welcome bonus'
                                        ? 'Welcome bonus'
                                        : isRedeem
                                          ? `Redeem: ${redeemName || 'Reward'}`
                                          : rawDescription || activity.transactionType || 'Points update';

                                    return (
                                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className={`size-8 rounded-full flex items-center justify-center ${isDeduction ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <span className="text-sm font-semibold">{isDeduction ? '−' : '+'}</span>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-700">{label}</p>
                                            <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                                          </div>
                                        </div>
                                        <span className={`text-sm font-semibold ${isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {isDeduction ? '' : '+'}{pointsValue} pts
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2 pt-3 sm:pt-4 border-t">
                              <Button 
                                className="col-span-2"
                                onClick={() => setPurchaseDialogOpen(true)}
                                size="sm"
                              >
                                <ShoppingCart className="size-4 mr-2" />
                                Log Transaction
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setAdjustPointsDialogOpen(true)}
                              >
                                <TrendingUp className="size-4 mr-2" />
                                <span className="hidden sm:inline">Adjust </span>Points
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setBlockDialogOpen(true)}
                              >
                                <Ban className="size-4 mr-2" />
                                Block
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          <ShoppingCart className="size-4 mr-2" />
                          Log Transaction
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setAdjustPointsDialogOpen(true);
                          }}
                        >
                          <TrendingUp className="size-4 mr-2" />
                          Adjust Points
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setBlockDialogOpen(true);
                          }}
                        >
                          <Ban className="size-4 mr-2" />
                          {customer.loyaltyStatus === 'blocked' ? 'Unblock' : 'Block'} Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {/* Mobile Card View - shown only on mobile */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white border rounded-lg p-3 space-y-3">
                {/* Header row with name and actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="size-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{customer.firstName || customer.whatsappName || 'Unknown'} {customer.lastName || ''}</p>
                      <p className="text-xs text-gray-500 truncate">{customer.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={customer.loyaltyStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {customer.loyaltyStatus}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedCustomer(customer);
                          setViewDetailsDialogOpen(true);
                        }}>
                          <Eye className="size-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          <ShoppingCart className="size-4 mr-2" />
                          Log Transaction
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setAdjustPointsDialogOpen(true);
                          }}
                        >
                          <TrendingUp className="size-4 mr-2" />
                          Adjust Points
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setBlockDialogOpen(true);
                          }}
                        >
                          <Ban className="size-4 mr-2" />
                          {customer.loyaltyStatus === 'blocked' ? 'Unblock' : 'Block'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-600">Points</p>
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-sm font-semibold">
                      {customer.pointsBalance?.currentBalance || 0}
                    </Badge>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-500">Transactions</p>
                    <p className="font-semibold text-sm text-gray-700">{customer.totalPurchases || 0}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-500">Spent</p>
                    <p className="font-semibold text-sm text-gray-700 truncate">{formatNGN(customer.totalSpentNgn || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
          )}
          {!loading && customersTotal > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <p className="text-xs text-gray-500 order-2 sm:order-1">
                {customersTotal} total • Page {page} of {customersPages}
              </p>
              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex-1 sm:flex-none"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(customersPages, page + 1))}
                  disabled={page >= customersPages}
                  className="flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription className="truncate">{(customerDetails || selectedCustomer)?.phoneNumber}</DialogDescription>
          </DialogHeader>
          {(customerDetails || selectedCustomer) && (
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-sm sm:text-base truncate">{(customerDetails || selectedCustomer).firstName || (customerDetails || selectedCustomer).whatsappName} {(customerDetails || selectedCustomer).lastName || ''}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-sm sm:text-base truncate">{(customerDetails || selectedCustomer).phoneNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Current Points</p>
                  <p className="text-lg sm:text-xl font-semibold text-amber-600">{(customerDetails || selectedCustomer).pointsBalance?.currentBalance || 0} pts</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Member Since</p>
                  <p className="font-medium text-sm sm:text-base">{formatDate((customerDetails || selectedCustomer).createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Total Transactions</p>
                  <p className="font-medium text-sm sm:text-base">{(customerDetails || selectedCustomer).totalPurchases || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500">Total Spent</p>
                  <p className="font-medium text-sm sm:text-base truncate">{formatNGN((customerDetails || selectedCustomer).totalSpentNgn || 0)}</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-blue-600 mb-0.5 sm:mb-1">Avg. Order</p>
                  <p className="text-sm sm:text-lg font-semibold text-blue-700 truncate">
                    {formatNGN((customerDetails || selectedCustomer).totalPurchases > 0 ? Math.floor((customerDetails || selectedCustomer).totalSpentNgn / (customerDetails || selectedCustomer).totalPurchases) : 0)}
                  </p>
                </div>
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-green-600 mb-0.5 sm:mb-1">Last Txn</p>
                  <p className="text-xs sm:text-sm font-semibold text-green-700">
                    {(customerDetails || selectedCustomer).lastPurchaseAt ? formatDate((customerDetails || selectedCustomer).lastPurchaseAt) : 'Never'}
                  </p>
                </div>
                <div className="bg-amber-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-amber-600 mb-0.5 sm:mb-1">Status</p>
                  <Badge variant={(customerDetails || selectedCustomer).optedIn ? 'default' : 'secondary'} className="text-xs">
                    {(customerDetails || selectedCustomer).optedIn ? 'Opted In' : 'Opted Out'}
                  </Badge>
                </div>
              </div>

              {/* Points History */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <History className="size-4" />
                  Recent Points Activity
                </h3>
                {pointsActivityLoading ? (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">Loading points activity...</div>
                ) : pointsActivity.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">No points activity yet</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pointsActivity.map((activity) => {
                      const pointsValue = Number(activity.points || 0);
                      const isDeduction = pointsValue < 0;
                      const metadataAmount = activity?.metadata?.purchaseAmount ?? activity?.metadata?.purchase_amount;
                      const rawDescription = String(activity.description || '').trim();
                      const isRedeem = activity.transactionType === 'redeemed';
                      const redeemName = rawDescription.replace(/^Redeemed\s+reward\s+/i, '').trim();
                      const label = metadataAmount
                        ? `Transaction log - ${formatNGN(metadataAmount)}`
                        : rawDescription.toLowerCase() === 'welcome bonus'
                          ? 'Welcome bonus'
                          : isRedeem
                            ? `Redeem: ${redeemName || 'Reward'}`
                            : rawDescription || activity.transactionType || 'Points update';

                      return (
                        <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={`size-6 rounded-full flex items-center justify-center ${isDeduction ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              <span className="text-xs font-semibold">{isDeduction ? '−' : '+'}</span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700">{label}</p>
                              <p className="text-[10px] text-gray-500">{formatDate(activity.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold ${isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isDeduction ? '' : '+'}{pointsValue} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                <Button 
                  className="col-span-2"
                  onClick={() => {
                    setViewDetailsDialogOpen(false);
                    setPurchaseDialogOpen(true);
                  }}
                  size="sm"
                >
                  <ShoppingCart className="size-4 mr-2" />
                  Log Transaction
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setViewDetailsDialogOpen(false);
                    setAdjustPointsDialogOpen(true);
                  }}
                >
                  <TrendingUp className="size-4 mr-2" />
                  Adjust Points
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setViewDetailsDialogOpen(false);
                    setBlockDialogOpen(true);
                  }}
                >
                  <Ban className="size-4 mr-2" />
                  {selectedCustomer?.loyaltyStatus === 'blocked' ? 'Unblock' : 'Block'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Transaction Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Transaction</DialogTitle>
            <DialogDescription>
              Record a transaction for {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer?.loyaltyStatus === 'blocked' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Ban className="size-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Customer is blocked</p>
                <p className="text-amber-700">Transaction will be recorded but no loyalty points will be awarded.</p>
              </div>
            </div>
          )}
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">
                Transaction Amount {(() => {
                  const homeCurrency = tenantSettings?.business?.homeCurrency || localStorage.getItem('home_currency') || 'NGN';
                  return `(${getCurrencySymbol(homeCurrency)})`;
                })()} *</label>
              <Input
                type="number"
                placeholder="5000"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                min="0"
                step="100"
              />
              {amountValidationMessage && (
                <p className="text-xs text-rose-600">{amountValidationMessage}</p>
              )}
            </div>

            {/* Points Calculation Preview */}
            {purchaseAmount && parseFloat(purchaseAmount) > 0 && purchasePointsPreview > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="size-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Points to award:</span>
                  <Badge className="bg-green-600 text-white border-green-600">
                    +{selectedCustomer?.loyaltyStatus === 'blocked' ? 0 : purchasePointsPreview} points
                  </Badge>
                </div>
                <p className="text-xs text-green-700 pl-6">
                  Customer will have {(selectedCustomer?.pointsBalance?.currentBalance || 0) + (selectedCustomer?.loyaltyStatus === 'blocked' ? 0 : purchasePointsPreview)} points total
                </p>
              </div>
            )}

            {/* Channel */}
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Channel *</label>
              <Select value={purchaseChannel} onValueChange={setPurchaseChannel}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
              <Input
                placeholder="e.g., Clothing transaction"
                value={purchaseDescription}
                onChange={(e) => setPurchaseDescription(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Points Calculation (Fixed Rate)</p>
              <p>
                {(() => {
                  const homeCurrency = tenantSettings?.business?.homeCurrency || localStorage.getItem('home_currency') || 'NGN';
                  // Fixed earn rate: NGN = ₦1000 per point, others = 1 per point
                  const earnUnit = homeCurrency === 'NGN' ? 1000 : 1;
                  return `${formatMajor(earnUnit, homeCurrency)} = 1 point`;
                })()}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleLogPurchase}
              disabled={submitting || !purchaseAmount}
            >
              {submitting ? 'Logging Transaction...' : 'Log Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsDialogOpen} onOpenChange={setAdjustPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>
              Manually add or subtract points for {selectedCustomer?.firstName || selectedCustomer?.whatsappName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Adjustment Type *</label>
              <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract') => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">➕ Add Points</SelectItem>
                  <SelectItem value="subtract">➖ Subtract Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Points Amount *</label>
              <Input
                type="number"
                placeholder="100"
                value={pointsAdjustment}
                onChange={(e) => setPointsAdjustment(e.target.value)}
                min="1"
              />
              {selectedCustomer && (
                <p className="text-sm text-gray-500">
                  Current balance: {selectedCustomer.pointsBalance?.currentBalance || 0} points
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Reason *</label>
              <Input
                placeholder="e.g., Compensation for service issue"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">⚠️ Important</p>
              <p className="mt-1">This action will {adjustmentType === 'add' ? 'add' : 'subtract'} points {adjustmentType === 'add' ? 'to' : 'from'} the customer's balance and create a transaction record.</p>
            </div>

            <Button
              className="w-full"
              onClick={handleAdjustPoints}
              disabled={submitting || !pointsAdjustment || !adjustmentReason}
            >
              {submitting ? 'Processing...' : `${adjustmentType === 'add' ? 'Add' : 'Subtract'} Points`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Customer Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.loyaltyStatus === 'blocked' ? 'Unblock Customer' : 'Block Customer'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.loyaltyStatus === 'blocked' 
                ? `Restore access for ${selectedCustomer?.firstName || selectedCustomer?.whatsappName}`
                : `Suspend ${selectedCustomer?.firstName || selectedCustomer?.whatsappName} from the loyalty program`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedCustomer?.loyaltyStatus !== 'blocked' && (
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block">Reason for Blocking *</label>
                <Input
                  placeholder="e.g., Fraudulent activity, Terms violation"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            )}

            <div className={`border rounded-lg p-3 text-sm ${
              selectedCustomer?.loyaltyStatus === 'blocked' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">
                {selectedCustomer?.loyaltyStatus === 'blocked' ? '✓ Unblock Customer' : '⚠️ Block Customer'}
              </p>
              <p className="mt-1">
                {selectedCustomer?.loyaltyStatus === 'blocked'
                  ? 'Customer will be able to earn and redeem points again.'
                  : 'Customer will not be able to earn or redeem points until unblocked.'
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBlockDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                variant={selectedCustomer?.loyaltyStatus === 'blocked' ? 'default' : 'destructive'}
                onClick={() => handleBlockCustomer(selectedCustomer?.loyaltyStatus !== 'blocked')}
                disabled={submitting || (selectedCustomer?.loyaltyStatus !== 'blocked' && !blockReason)}
              >
                {submitting ? 'Processing...' : selectedCustomer?.loyaltyStatus === 'blocked' ? 'Unblock' : 'Block Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
