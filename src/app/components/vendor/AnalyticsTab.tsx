import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { formatNGN, getCurrencySymbol } from '../../../lib/mockData';
import { apiClient } from '../../../lib/api';
import { 
  Users, ShoppingBag, Coins, TrendingUp, TrendingDown, Download, 
  Calendar, BarChart3, PieChart as PieChartIcon, Activity, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Gift, MessageSquare
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  Legend
} from 'recharts';
import { toast } from 'sonner';

type DateRange = '7d' | '30d' | '90d' | '12m' | 'all';

type AnalyticsData = {
  overview: {
    customers: { total: number; new: number; active: number; growth_rate: number };
    purchases: { total: number; total_revenue_ngn: number; average_order_value_ngn: number };
    points: { total_earned: number; total_redeemed: number; redemption_rate: number };
    engagement: { messages_received: number; messages_sent: number };
  };
  charts: { weeklyPurchases: { name: string; purchases: number; revenue: number }[] };
  pointsDistribution: { earned: number; redeemed: number; active: number };
  topCustomers: { customer_id: string; phone_number: string; first_name: string; last_name: string; total_spent_ngn: number; total_purchases: number }[];
  topRewards: { reward_id: string; reward_name: string; redemptions: number }[];
};

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDashboardAnalytics();
      setData(response);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const handleExport = async (type: 'customers' | 'transactions' | 'points') => {
    try {
      setExporting(true);
      
      // Build CSV data based on type
      let csvContent = '';
      let filename = '';
      
      if (type === 'customers' && data?.topCustomers) {
        csvContent = 'Phone,First Name,Last Name,Total Spent,Total Purchases\n';
        data.topCustomers.forEach(c => {
          csvContent += `${c.phone_number},${c.first_name},${c.last_name},${c.total_spent_ngn},${c.total_purchases}\n`;
        });
        filename = `customers-report-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'transactions') {
        csvContent = 'Day,Purchases,Revenue\n';
        data?.charts.weeklyPurchases.forEach(d => {
          csvContent += `${d.name},${d.purchases},${d.revenue}\n`;
        });
        filename = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'points') {
        csvContent = 'Metric,Value\n';
        csvContent += `Total Earned,${data?.overview.points.total_earned || 0}\n`;
        csvContent += `Total Redeemed,${data?.overview.points.total_redeemed || 0}\n`;
        csvContent += `Active Balance,${data?.pointsDistribution.active || 0}\n`;
        csvContent += `Redemption Rate,${data?.overview.points.redemption_rate || 0}%\n`;
        filename = `points-report-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded`);
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const stats = useMemo(() => {
    const overview = data?.overview;
    return [
      {
        title: 'Total Customers',
        value: (overview?.customers.total ?? 0).toLocaleString(),
        change: overview?.customers.growth_rate ?? 0,
        changeLabel: 'growth',
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Total Revenue',
        value: formatNGN(overview?.purchases.total_revenue_ngn || 0),
        change: overview?.purchases.total ?? 0,
        changeLabel: 'transactions',
        icon: ShoppingBag,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Points Issued',
        value: (overview?.points.total_earned ?? 0).toLocaleString(),
        change: overview?.points.redemption_rate ?? 0,
        changeLabel: 'redeemed',
        icon: Coins,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Avg Order Value',
        value: formatNGN(overview?.purchases.average_order_value_ngn || 0),
        change: 0,
        changeLabel: '',
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ];
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.pointsDistribution) return [];
    return [
      { name: 'Redeemed', value: data.pointsDistribution.redeemed },
      { name: 'Active', value: data.pointsDistribution.active }
    ];
  }, [data]);

  const rewardsData = useMemo(() => {
    return data?.topRewards?.map((r, i) => ({
      name: r.reward_name.length > 15 ? r.reward_name.substring(0, 15) + '...' : r.reward_name,
      redemptions: r.redemptions,
      fill: COLORS[i % COLORS.length]
    })) || [];
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Track your loyalty program performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-32">
              <Calendar className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 truncate">{stat.title}</p>
                  <p className="text-lg font-bold truncate">{stat.value}</p>
                  {stat.changeLabel && (
                    <p className="text-xs text-gray-500">
                      {typeof stat.change === 'number' && stat.change > 0 && '+'}
                      {stat.change}{stat.changeLabel === 'growth' ? '%' : ''} {stat.changeLabel}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for different report sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Revenue & Transactions</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleExport('transactions')}
                    disabled={exporting}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.charts.weeklyPurchases || []}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatNGN(value) : value,
                          name === 'revenue' ? 'Revenue' : 'Transactions'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#6366f1" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                      <Line type="monotone" dataKey="purchases" stroke="#22c55e" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Points Distribution */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Points Distribution</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleExport('points')}
                    disabled={exporting}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-64 flex items-center justify-center">
                  {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500">
                      <PieChartIcon className="size-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No points data yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Top Customers</CardTitle>
                  <CardDescription className="text-sm">Highest spending customers</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('customers')}
                  disabled={exporting}
                >
                  <Download className="size-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {data?.topCustomers && data.topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {data.topCustomers.map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{customer.phone_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatNGN(customer.total_spent_ngn)}</p>
                        <p className="text-xs text-gray-500">{customer.total_purchases} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="size-12 mx-auto mb-2 opacity-30" />
                  <p>No customer data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Growth Chart */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Customer Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {data?.overview.customers.total?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {data?.overview.customers.new?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">New (30d)</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {data?.overview.customers.active?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Top Redeemed Rewards</CardTitle>
              <CardDescription className="text-sm">Most popular rewards among customers</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {rewardsData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rewardsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="redemptions" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="size-12 mx-auto mb-2 opacity-30" />
                  <p>No reward redemptions yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Points Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <Coins className="size-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Points Issued</p>
                    <p className="text-xl font-bold">{(data?.overview.points.total_earned || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Gift className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Points Redeemed</p>
                    <p className="text-xl font-bold">{(data?.overview.points.total_redeemed || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Redemption Rate</p>
                    <p className="text-xl font-bold">{(data?.overview.points.redemption_rate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <MessageSquare className="size-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Messages Received</p>
                    <p className="text-3xl font-bold">{(data?.overview.engagement.messages_received || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Last 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <MessageSquare className="size-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Messages Sent</p>
                    <p className="text-3xl font-bold">{(data?.overview.engagement.messages_sent || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Last 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Engagement Tips</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Activity className="size-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Customer Engagement</p>
                    <p className="text-sm text-blue-700">
                      {data?.overview.customers.active && data?.overview.customers.total
                        ? `${((data.overview.customers.active / data.overview.customers.total) * 100).toFixed(0)}% of your customers are active. `
                        : ''}
                      Send targeted messages to re-engage inactive customers.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <Gift className="size-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Reward Redemption</p>
                    <p className="text-sm text-amber-700">
                      {data?.overview.points.redemption_rate 
                        ? `${data.overview.points.redemption_rate.toFixed(0)}% redemption rate. `
                        : ''}
                      Consider adding more reward options to increase engagement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
