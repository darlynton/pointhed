import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { formatNGN } from '../../../lib/mockData';
import { apiClient } from '../../../lib/api';
import { Users, ShoppingBag, Coins, TrendingUp, MessageSquare, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type WeeklyPoint = { name: string; purchases: number; revenue: number };
type TopCustomer = {
  customer_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  total_spent_ngn: number;
  total_purchases: number;
};

type DashboardResponse = {
  overview: {
    period: string;
    customers: { total: number; new: number; active: number; growth_rate: number };
    purchases: { total: number; total_revenue_ngn: number; average_order_value_ngn: number };
    points: { total_earned: number; total_redeemed: number; redemption_rate: number };
    engagement: { messages_received: number; messages_sent: number };
  };
  charts: { weeklyPurchases: WeeklyPoint[] };
  pointsDistribution: { earned: number; redeemed: number; active: number };
  topCustomers: TopCustomer[];
  topRewards: { reward_id: string; reward_name: string; redemptions: number }[];
};

const fallbackCharts: WeeklyPoint[] = [
  { name: 'Mon', purchases: 0, revenue: 0 },
  { name: 'Tue', purchases: 0, revenue: 0 },
  { name: 'Wed', purchases: 0, revenue: 0 },
  { name: 'Thu', purchases: 0, revenue: 0 },
  { name: 'Fri', purchases: 0, revenue: 0 },
  { name: 'Sat', purchases: 0, revenue: 0 },
  { name: 'Sun', purchases: 0, revenue: 0 },
];

export function OverviewTab() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getDashboardAnalytics();
        if (!cancelled) setData(response);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const overview = data?.overview;
    return [
      {
        title: 'Total Customers',
        value: (overview?.customers.total ?? 0).toLocaleString(),
        change: `+${overview?.customers.new ?? 0} this month`,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Total Revenue',
        value: formatNGN(overview?.purchases.total_revenue_ngn || 0),
        change: `${overview?.purchases.total ?? 0} transactions`,
        icon: ShoppingBag,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Points Issued',
        value: (overview?.points.total_earned ?? 0).toLocaleString(),
        change: `${(overview?.points.redemption_rate ?? 0).toFixed(1)}% redeemed`,
        icon: Coins,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Growth Rate',
        value: `${(overview?.customers.growth_rate ?? 0).toFixed(1)}%`,
        change: 'vs last month',
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ];
  }, [data]);

  const chartData = data?.charts?.weeklyPurchases?.length ? data.charts.weeklyPurchases : fallbackCharts;

  const pointsData = [
    { name: 'Earned', value: data?.pointsDistribution?.earned ?? 0, color: '#3b82f6' },
    { name: 'Redeemed', value: data?.pointsDistribution?.redeemed ?? 0, color: '#10b981' },
    { name: 'Active', value: data?.pointsDistribution?.active ?? 0, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1">Dashboard Overview</h2>
        <p className="text-sm sm:text-base text-gray-600">Welcome back! Here's what's happening with your loyalty program.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="order-2 sm:order-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-semibold mb-0.5 sm:mb-1 truncate">{loading ? '...' : stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{loading ? 'Loading...' : stat.change}</p>
                  </div>
                  <div className={`order-1 sm:order-2 p-2 sm:p-3 rounded-lg ${stat.bgColor} w-fit`}>
                    <Icon className={`size-4 sm:size-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base sm:text-lg">Weekly Revenue</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revenue and transaction trends for the past week</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ResponsiveContainer width="100%" height={200} className="sm:!h-[300px]">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tickFormatter={(value) => formatNGN(value)} tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value: number) => formatNGN(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions Chart */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base sm:text-lg">Transaction Activity</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Number of transactions per day</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ResponsiveContainer width="100%" height={200} className="sm:!h-[300px]">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="purchases" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Points Distribution */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base sm:text-lg">Points Distribution</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ResponsiveContainer width="100%" height={180} className="sm:!h-[200px]">
              <PieChart>
                <Pie
                  data={pointsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pointsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Rewards */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base sm:text-lg">Top Rewards</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Most redeemed rewards</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {(data?.topRewards || []).map((reward, index) => (
                <div key={reward.reward_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center justify-center size-6 sm:size-8 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{reward.reward_name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{reward.redemptions} redemptions</p>
                    </div>
                  </div>
                  <Award className="size-4 sm:size-5 text-amber-500 shrink-0" />
                </div>
              ))}
              {!loading && (data?.topRewards || []).length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500">No reward redemptions yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                <ShoppingBag className="size-4 sm:size-5" />
                <span className="text-xs sm:text-sm font-medium">Log Purchase</span>
              </button>
              <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                <Users className="size-4 sm:size-5" />
                <span className="text-xs sm:text-sm font-medium">Add Customer</span>
              </button>
              <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                <MessageSquare className="size-4 sm:size-5" />
                <span className="text-xs sm:text-sm font-medium">Broadcast</span>
              </button>
              <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                <Award className="size-4 sm:size-5" />
                <span className="text-xs sm:text-sm font-medium">Create Reward</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Customers */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
          <CardTitle className="text-base sm:text-lg">Active Customers</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{(data?.overview?.customers.active ?? 0).toLocaleString()} customers active in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {(data?.topCustomers || []).map((customer) => (
              <div key={customer.customer_id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="size-8 sm:size-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-base shrink-0">
                    {(customer.first_name || 'U')[0]}
                    {(customer.last_name || 'N')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{customer.first_name} {customer.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{customer.phone_number}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{formatNGN(customer.total_spent_ngn || 0)}</p>
                  <p className="text-xs text-gray-500">{customer.total_purchases} purchases</p>
                </div>
              </div>
            ))}
            {!loading && (data?.topCustomers || []).length === 0 && (
              <p className="text-xs sm:text-sm text-gray-500">No customers yet. Start logging purchases to see activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
