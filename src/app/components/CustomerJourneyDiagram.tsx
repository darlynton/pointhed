import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Smartphone, 
  QrCode, 
  Users, 
  Store, 
  ShoppingBag, 
  Gift, 
  MessageSquare,
  ChevronRight,
  User,
  Wallet,
  Menu as MenuIcon
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  color: string;
  points: number;
}

const mockVendors: Vendor[] = [
  { id: 'v1', name: "Mama Chi's Kitchen", color: 'bg-orange-500', points: 250 },
  { id: 'v2', name: "Beauty Hub Lagos", color: 'bg-pink-500', points: 180 },
  { id: 'v3', name: "Fresh Groceries", color: 'bg-green-500', points: 420 },
];

export default function CustomerJourneyDiagram() {
  const [activeScenario, setActiveScenario] = useState<'enrollment' | 'context' | 'management'>('enrollment');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2>Multi-Vendor Customer Journey</h2>
        <p className="text-muted-foreground">
          How customers interact with multiple loyalty programs through a single WhatsApp interface
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeScenario === 'enrollment' ? 'default' : 'outline'}
          onClick={() => setActiveScenario('enrollment')}
          size="sm"
        >
          1. Enrollment
        </Button>
        <Button
          variant={activeScenario === 'context' ? 'default' : 'outline'}
          onClick={() => setActiveScenario('context')}
          size="sm"
        >
          2. Context Switching
        </Button>
        <Button
          variant={activeScenario === 'management' ? 'default' : 'outline'}
          onClick={() => setActiveScenario('management')}
          size="sm"
        >
          3. Multi-Vendor Management
        </Button>
      </div>

      {/* Journey Visualization */}
      <div className="space-y-4">
        {activeScenario === 'enrollment' && <EnrollmentScenario />}
        {activeScenario === 'context' && <ContextSwitchingScenario />}
        {activeScenario === 'management' && <ManagementScenario />}
      </div>

      {/* Technical Notes */}
      <Card className="p-4 bg-muted/50">
        <h3 className="mb-3 flex items-center gap-2">
          <Smartphone className="size-5" />
          Technical Implementation Notes
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span><strong>Session Context:</strong> Last vendor interaction stored in customer.last_active_vendor_id</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span><strong>QR Code Deep Links:</strong> wa.me/234XXX?text=VENDOR001 sets immediate context</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span><strong>Database Isolation:</strong> All queries filtered by vendor_id based on active context</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span><strong>Multi-Enrollment:</strong> customer_enrollments table maps one phone to many vendors</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function EnrollmentScenario() {
  return (
    <div className="space-y-4">
      <h3>Scenario 1: Customer Enrolling with Multiple Vendors</h3>
      
      <div className="grid gap-4">
        {/* Step 1 */}
        <JourneyStep
          step="1"
          title="First Vendor Enrollment"
          icon={<QrCode className="size-5" />}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                <Store className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">John scans QR at Mama Chi's Kitchen</p>
                <p className="text-sm text-muted-foreground">Opens: wa.me/234XXX?text=MAMAC001</p>
              </div>
            </div>
            
            <WhatsAppMessage
              from="bot"
              vendor="Mama Chi's Kitchen"
              vendorColor="bg-orange-500"
            >
              <p className="font-semibold">Welcome to Mama Chi's Kitchen Rewards! 🎉</p>
              <p className="text-sm mt-1">Earn points with every purchase!</p>
              <p className="text-sm mt-2">Confirm your phone: +234 801 111 1111</p>
              <p className="text-sm">1️⃣ Confirm | 2️⃣ Different number</p>
            </WhatsAppMessage>

            <WhatsAppMessage from="customer">
              <p>1</p>
            </WhatsAppMessage>

            <WhatsAppMessage
              from="bot"
              vendor="Mama Chi's Kitchen"
              vendorColor="bg-orange-500"
            >
              <p className="font-semibold">✅ Enrolled in Mama Chi's Kitchen!</p>
              <p className="text-sm mt-1">🎁 Welcome Bonus: +50 points</p>
              <p className="text-sm">Current Balance: <strong>50 points</strong></p>
            </WhatsAppMessage>

            <DatabaseAction
              action="INSERT"
              table="customer_enrollments"
              data={{
                phone: '+234 801 111 1111',
                vendor_id: 'mamachis-kitchen',
                points: 50,
                status: 'active'
              }}
            />
          </div>
        </JourneyStep>

        {/* Step 2 */}
        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        <JourneyStep
          step="2"
          title="Second Vendor Enrollment (Same Customer)"
          icon={<QrCode className="size-5" />}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-pink-500 flex items-center justify-center text-white">
                <Store className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">John scans QR at Beauty Hub Lagos</p>
                <p className="text-sm text-muted-foreground">Opens: wa.me/234XXX?text=BEAUTY001</p>
              </div>
            </div>
            
            <WhatsAppMessage
              from="bot"
              vendor="Beauty Hub Lagos"
              vendorColor="bg-pink-500"
            >
              <p className="font-semibold">Welcome to Beauty Hub Lagos! 💄</p>
              <p className="text-sm mt-1">I see you're already using our loyalty platform!</p>
              <p className="text-sm mt-2">Join Beauty Hub Lagos rewards?</p>
              <p className="text-sm">1️⃣ Yes, enroll me | 2️⃣ No thanks</p>
            </WhatsAppMessage>

            <WhatsAppMessage from="customer">
              <p>1</p>
            </WhatsAppMessage>

            <WhatsAppMessage
              from="bot"
              vendor="Beauty Hub Lagos"
              vendorColor="bg-pink-500"
            >
              <p className="font-semibold">✅ Enrolled in Beauty Hub Lagos!</p>
              <p className="text-sm mt-1">🎁 Welcome Bonus: +50 points</p>
              <p className="text-sm">Current Balance: <strong>50 points</strong></p>
            </WhatsAppMessage>

            <DatabaseAction
              action="INSERT"
              table="customer_enrollments"
              data={{
                phone: '+234 801 111 1111',
                vendor_id: 'beauty-hub-lagos',
                points: 50,
                status: 'active'
              }}
            />
          </div>
        </JourneyStep>

        {/* Step 3 */}
        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        <JourneyStep
          step="3"
          title="Third Vendor Enrollment"
          icon={<QrCode className="size-5" />}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-green-500 flex items-center justify-center text-white">
                <Store className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">John scans QR at Fresh Groceries</p>
                <p className="text-sm text-muted-foreground">Third enrollment - same pattern</p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg border border-dashed">
              <p className="text-sm font-medium mb-2">Customer Now Has 3 Active Programs:</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-orange-500" />
                  <span>Mama Chi's Kitchen - 50 pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-pink-500" />
                  <span>Beauty Hub Lagos - 50 pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-green-500" />
                  <span>Fresh Groceries - 50 pts</span>
                </div>
              </div>
            </div>
          </div>
        </JourneyStep>
      </div>
    </div>
  );
}

function ContextSwitchingScenario() {
  return (
    <div className="space-y-4">
      <h3>Scenario 2: Context Switching Between Vendors</h3>
      
      <div className="grid gap-4">
        {/* No Context */}
        <JourneyStep
          step="1"
          title="Customer Initiates Without Context"
          icon={<MessageSquare className="size-5" />}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Customer messages without scanning QR (no vendor context)
            </p>

            <WhatsAppMessage from="customer">
              <p>Hi</p>
            </WhatsAppMessage>

            <WhatsAppMessage from="bot">
              <p className="font-semibold">Welcome back John! 👋</p>
              <p className="text-sm mt-2">You have loyalty programs with:</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>1️⃣ Mama Chi's Kitchen (250 pts)</p>
                <p>2️⃣ Beauty Hub Lagos (180 pts)</p>
                <p>3️⃣ Fresh Groceries (420 pts)</p>
              </div>
              <p className="text-sm mt-3">Reply with number or scan vendor QR</p>
            </WhatsAppMessage>

            <DatabaseQuery
              query="SELECT vendor enrollments"
              result="3 vendors found for +234 801 111 1111"
            />
          </div>
        </JourneyStep>

        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        {/* Context Selected */}
        <JourneyStep
          step="2"
          title="Customer Selects Vendor Context"
          icon={<Store className="size-5" />}
        >
          <div className="space-y-3">
            <WhatsAppMessage from="customer">
              <p>1</p>
            </WhatsAppMessage>

            <WhatsAppMessage
              from="bot"
              vendor="Mama Chi's Kitchen"
              vendorColor="bg-orange-500"
            >
              <p className="font-semibold">Mama Chi's Kitchen 🍲</p>
              <p className="text-sm mt-2">Your Balance: <strong>250 points</strong></p>
              <p className="text-sm mt-3">Main Menu:</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>1️⃣ View Rewards</p>
                <p>2️⃣ Purchase History</p>
                <p>3️⃣ Redeem Points</p>
                <p>4️⃣ Switch Vendor</p>
              </div>
            </WhatsAppMessage>

            <DatabaseAction
              action="UPDATE"
              table="customers"
              data={{
                last_active_vendor_id: 'mamachis-kitchen',
                conversation_context: { vendor_id: 'mamachis-kitchen' }
              }}
            />
          </div>
        </JourneyStep>

        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        {/* QR Code Override */}
        <JourneyStep
          step="3"
          title="QR Code Immediately Switches Context"
          icon={<QrCode className="size-5" />}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              While in Mama Chi's context, John scans Beauty Hub QR
            </p>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <QrCode className="size-5 text-pink-500" />
              <div>
                <p className="font-medium">Scans Beauty Hub QR</p>
                <p className="text-sm text-muted-foreground">wa.me/234XXX?text=BEAUTY001</p>
              </div>
            </div>

            <WhatsAppMessage
              from="bot"
              vendor="Beauty Hub Lagos"
              vendorColor="bg-pink-500"
            >
              <p className="font-semibold">Beauty Hub Lagos 💄</p>
              <p className="text-sm mt-2">Your Balance: <strong>180 points</strong></p>
              <p className="text-sm mt-3">What would you like to do?</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>1️⃣ View Rewards</p>
                <p>2️⃣ Purchase History</p>
                <p>3️⃣ Redeem Points</p>
              </div>
            </WhatsAppMessage>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">✓ Context Automatically Switched</p>
              <p className="text-xs text-green-700 mt-1">QR code parameter overrides session context</p>
            </div>
          </div>
        </JourneyStep>
      </div>
    </div>
  );
}

function ManagementScenario() {
  return (
    <div className="space-y-4">
      <h3>Scenario 3: Managing Multiple Programs</h3>
      
      <div className="grid gap-4">
        {/* View All Programs */}
        <JourneyStep
          step="1"
          title="View All Programs Summary"
          icon={<Users className="size-5" />}
        >
          <div className="space-y-3">
            <WhatsAppMessage from="customer">
              <p>Show all</p>
            </WhatsAppMessage>

            <WhatsAppMessage from="bot">
              <p className="font-semibold">Your Loyalty Programs 🎁</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="border-l-4 border-orange-500 pl-2">
                  <p className="font-medium">1️⃣ Mama Chi's Kitchen</p>
                  <p className="text-muted-foreground">Balance: 250 points</p>
                  <p className="text-muted-foreground text-xs">Last purchase: 2 days ago</p>
                </div>
                <div className="border-l-4 border-pink-500 pl-2">
                  <p className="font-medium">2️⃣ Beauty Hub Lagos</p>
                  <p className="text-muted-foreground">Balance: 180 points</p>
                  <p className="text-muted-foreground text-xs">Last purchase: 5 days ago</p>
                </div>
                <div className="border-l-4 border-green-500 pl-2">
                  <p className="font-medium">3️⃣ Fresh Groceries</p>
                  <p className="text-muted-foreground">Balance: 420 points ⭐</p>
                  <p className="text-muted-foreground text-xs">Last purchase: Yesterday</p>
                </div>
              </div>
              <p className="text-sm mt-3">Total: <strong>850 points</strong> across 3 vendors</p>
              <p className="text-xs text-muted-foreground mt-2">Reply with number to manage program</p>
            </WhatsAppMessage>

            <DatabaseQuery
              query="SELECT all enrollments with aggregated stats"
              result="3 active programs, 850 total points"
            />
          </div>
        </JourneyStep>

        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        {/* Cross-Vendor Commands */}
        <JourneyStep
          step="2"
          title="Smart Command Routing"
          icon={<MenuIcon className="size-5" />}
        >
          <div className="space-y-3">
            <p className="text-sm font-medium">System uses context to route commands:</p>
            
            <div className="space-y-2">
              <CommandExample
                command="points"
                context="In Beauty Hub context"
                response="Shows Beauty Hub points only"
                color="bg-pink-500"
              />
              
              <CommandExample
                command="rewards"
                context="In Mama Chi's context"
                response="Shows Mama Chi's rewards only"
                color="bg-orange-500"
              />
              
              <CommandExample
                command="history"
                context="No active context"
                response="Asks which vendor to view"
                color="bg-muted"
              />
            </div>
          </div>
        </JourneyStep>

        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        {/* Purchase Notification */}
        <JourneyStep
          step="3"
          title="Purchase Notifications (Automatic Context)"
          icon={<ShoppingBag className="size-5" />}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Staff logs purchase → System knows vendor context automatically
            </p>

            <WhatsAppMessage
              from="bot"
              vendor="Fresh Groceries"
              vendorColor="bg-green-500"
            >
              <p className="font-semibold">🛍️ Purchase Confirmed!</p>
              <p className="text-sm mt-2"><strong>Fresh Groceries</strong></p>
              <p className="text-sm">Amount: ₦8,500</p>
              <p className="text-sm">Points Earned: +85 points</p>
              <p className="text-sm mt-2">New Balance: <strong>505 points</strong></p>
              <p className="text-xs text-muted-foreground mt-3">Reply REWARDS to see what you can redeem</p>
            </WhatsAppMessage>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Context Identification</p>
              <div className="text-xs text-blue-700 mt-1 space-y-1">
                <p>✓ Purchase logged by Fresh Groceries staff</p>
                <p>✓ vendor_id automatically set in transaction</p>
                <p>✓ Notification branded with vendor name & colors</p>
              </div>
            </div>
          </div>
        </JourneyStep>

        <ChevronRight className="size-6 text-muted-foreground mx-auto" />

        {/* Redemption Across Vendors */}
        <JourneyStep
          step="4"
          title="Vendor-Specific Redemptions"
          icon={<Gift className="size-5" />}
        >
          <div className="space-y-3">
            <WhatsAppMessage from="customer">
              <p>Redeem</p>
            </WhatsAppMessage>

            <WhatsAppMessage from="bot">
              <p className="font-semibold">Which program to redeem from?</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>1️⃣ Mama Chi's Kitchen (250 pts)</p>
                <p>2️⃣ Beauty Hub Lagos (180 pts)</p>
                <p>3️⃣ Fresh Groceries (505 pts) ⭐</p>
              </div>
            </WhatsAppMessage>

            <WhatsAppMessage from="customer">
              <p>3</p>
            </WhatsAppMessage>

            <WhatsAppMessage
              from="bot"
              vendor="Fresh Groceries"
              vendorColor="bg-green-500"
            >
              <p className="font-semibold">Fresh Groceries Rewards 🎁</p>
              <p className="text-sm mt-2">Your Balance: 505 points</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="border rounded p-2">
                  <p className="font-medium">1️⃣ Free Delivery (100 pts) ✅</p>
                  <p className="text-xs text-muted-foreground">Free delivery on next order</p>
                </div>
                <div className="border rounded p-2">
                  <p className="font-medium">2️⃣ ₦500 Discount (250 pts) ✅</p>
                  <p className="text-xs text-muted-foreground">₦500 off purchases over ₦5,000</p>
                </div>
                <div className="border rounded p-2">
                  <p className="font-medium">3️⃣ Free Basket (500 pts) ✅</p>
                  <p className="text-xs text-muted-foreground">Reusable shopping basket</p>
                </div>
              </div>
              <p className="text-sm mt-3">Reply with number to redeem</p>
            </WhatsAppMessage>

            <DatabaseAction
              action="QUERY"
              table="rewards WHERE vendor_id = 'fresh-groceries'"
              data={{
                filtered_by: 'vendor_id',
                points_checked: 505,
                available_rewards: 3
              }}
            />
          </div>
        </JourneyStep>
      </div>
    </div>
  );
}

// Helper Components
function JourneyStep({ 
  step, 
  title, 
  icon, 
  children 
}: { 
  step: string; 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
          {step}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h4>{title}</h4>
          </div>
        </div>
      </div>
      {children}
    </Card>
  );
}

function WhatsAppMessage({ 
  from, 
  vendor, 
  vendorColor, 
  children 
}: { 
  from: 'customer' | 'bot'; 
  vendor?: string;
  vendorColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${from === 'customer' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg p-3 ${
        from === 'customer' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      }`}>
        {vendor && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/20">
            <div className={`size-3 rounded-full ${vendorColor}`} />
            <span className="text-xs font-medium">{vendor}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function DatabaseAction({ 
  action, 
  table, 
  data 
}: { 
  action: string; 
  table: string; 
  data: Record<string, any>;
}) {
  return (
    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg font-mono text-xs">
      <p className="font-semibold text-purple-900 mb-1">DB: {action} {table}</p>
      <pre className="text-purple-700 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function DatabaseQuery({ 
  query, 
  result 
}: { 
  query: string; 
  result: string;
}) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg font-mono text-xs">
      <p className="font-semibold text-blue-900">QUERY: {query}</p>
      <p className="text-blue-700 mt-1">→ {result}</p>
    </div>
  );
}

function CommandExample({
  command,
  context,
  response,
  color
}: {
  command: string;
  context: string;
  response: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2 bg-muted/50 rounded">
      <div className={`size-2 rounded-full mt-1.5 ${color}`} />
      <div className="flex-1 text-sm">
        <p><strong>"{command}"</strong> {context}</p>
        <p className="text-muted-foreground text-xs">→ {response}</p>
      </div>
    </div>
  );
}
