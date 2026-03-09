// ─── Help Center Content ─────────────────────────────────────────────
// Static typed article data for the public help center.
// Each category contains articles with markdown-like HTML body content.

export interface Article {
  slug: string;
  title: string;
  summary: string;
  /** HTML string rendered inside the article page */
  body: string;
  updatedAt: string;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  articles: Article[];
  /** When true, category is hidden from the public help center listing */
  hidden?: boolean;
}

export const helpCategories: Category[] = [
  // ── 1. Getting Started ──────────────────────────────────────────────
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Set up your account, complete onboarding, and launch your first loyalty program.',
    icon: 'Rocket',
    articles: [
      {
        slug: 'create-your-account',
        title: 'Creating Your Pointhed Account',
        summary: 'Sign up in under a minute and get access to your dashboard.',
        updatedAt: '2026-02-15',
        body: `
<p>Getting started with Pointhed takes less than a minute.</p>

<h3>Step 1 — Sign Up</h3>
<p>Visit <strong>pointhed.com/signup</strong> and enter your email address and a secure password. You can also sign up with Google for a one-click experience.</p>

<h3>Step 2 — Verify Your Email</h3>
<p>Check your inbox for a verification link. Click it to activate your account. If you don't see the email, check your spam folder or request a new link from the login page.</p>

<h3>Step 3 — Complete Onboarding</h3>
<p>After signing in for the first time, you'll be guided through a short onboarding flow where you set up your business name, currency, and WhatsApp integration. This only takes a few minutes.</p>

<h3>What's Next?</h3>
<p>Once onboarding is complete you'll land on your dashboard. From there you can create your first reward, configure earn rates, and start enrolling customers.</p>
`,
      },
      {
        slug: 'onboarding-walkthrough',
        title: 'Onboarding Walkthrough',
        summary: 'A step-by-step guide through the Pointhed onboarding flow.',
        updatedAt: '2026-02-15',
        body: `
<p>The onboarding wizard appears the first time you sign in. It has four quick steps:</p>

<h3>1. Business Profile</h3>
<p>Enter your business name, select your industry (Retail, F&amp;B, Salon, Clinic, Gym, or Services), and upload an optional logo. This information appears in WhatsApp messages sent to your customers.</p>

<h3>2. Currency &amp; Earn Rate</h3>
<p>Choose your base currency (GBP, NGN, USD, EUR, or JPY). Then set your <strong>earn rate</strong> — this is the number of points a customer earns per unit of currency spent. For example, 1 point per £1 spent.</p>

<h3>3. WhatsApp Connection</h3>
<p>Connect your WhatsApp Business number so customers can interact with your loyalty program directly through WhatsApp. You'll enter your WhatsApp Business API credentials — don't worry, we guide you through every field.</p>

<h3>4. Confirmation</h3>
<p>Review your settings and hit <strong>Launch</strong>. You'll be taken straight to your dashboard, ready to add rewards and start enrolling customers.</p>

<p><em>Tip: You can change any of these settings later from the Settings page.</em></p>
`,
      },
      {
        slug: 'connect-whatsapp',
        title: 'Connecting WhatsApp to Pointhed',
        summary: 'Link your WhatsApp Business account to enable customer messaging.',
        updatedAt: '2026-02-20',
        body: `
<p>Pointhed uses the <strong>WhatsApp Business API</strong> to let your customers check points, browse rewards, and redeem — all within WhatsApp.</p>

<h3>What You'll Need</h3>
<ul>
  <li>A <strong>Meta Business Account</strong> with WhatsApp Business API access</li>
  <li>A <strong>WhatsApp Phone Number ID</strong></li>
  <li>A <strong>Permanent API Token</strong> (generated in the Meta Developer Portal)</li>
</ul>

<h3>Connecting</h3>
<ol>
  <li>Go to <strong>Dashboard → Settings → WhatsApp</strong>.</li>
  <li>Paste your Phone Number ID, API Token, and Business Account ID into the fields provided.</li>
  <li>Click <strong>Save &amp; Verify</strong>. Pointhed will send a test message to confirm the connection.</li>
</ol>

<h3>Setting Up the Webhook</h3>
<p>For incoming messages (customers messaging your number), you need to point Meta's webhook to your Pointhed backend URL. Copy the webhook URL shown on the Settings page and paste it in the Meta Developer Portal under <em>WhatsApp → Configuration → Webhook URL</em>.</p>

<p>The Verify Token is also shown on the Settings page — use that when Meta asks for it.</p>
`,
      },
      {
        slug: 'your-first-reward',
        title: 'Creating Your First Reward',
        summary: 'Add a reward to your catalog so customers have something to earn towards.',
        updatedAt: '2026-02-18',
        body: `
<p>Rewards are the heart of your loyalty program. Here's how to create your first one:</p>

<h3>Step 1 — Open the Rewards Tab</h3>
<p>From your dashboard, click <strong>Rewards</strong> in the sidebar.</p>

<h3>Step 2 — Click "Add Reward"</h3>
<p>Hit the <strong>Add Reward</strong> button in the top-right corner.</p>

<h3>Step 3 — Fill in the Details</h3>
<ul>
  <li><strong>Name</strong> — e.g. "Free Coffee", "10% Discount", "Bonus Treatment"</li>
  <li><strong>Description</strong> — a short description shown to customers</li>
  <li><strong>Points Required</strong> — how many points a customer needs to redeem this reward</li>
  <li><strong>Image</strong> (optional) — upload an eye-catching photo</li>
</ul>

<h3>Step 4 — Save</h3>
<p>Click <strong>Save</strong>. The reward is now live and visible to customers when they check available rewards via WhatsApp.</p>

<p><em>Tip: Start with a low-threshold reward (e.g. 50 points) so customers get their first redemption quickly. This builds engagement.</em></p>
`,
      },
    ],
  },

  // ── 2. Managing Customers ───────────────────────────────────────────
  {
    slug: 'managing-customers',
    title: 'Managing Customers',
    description: 'View customer profiles, track points history, and understand your audience.',
    icon: 'Users',
    articles: [
      {
        slug: 'customer-overview',
        title: 'Customer Overview',
        summary: 'Understanding the Customers tab and what data is available.',
        updatedAt: '2026-02-20',
        body: `
<p>The <strong>Customers</strong> tab gives you a complete view of everyone enrolled in your loyalty program.</p>

<h3>Customer List</h3>
<p>You'll see a searchable, sortable table showing each customer's name, phone number, current points balance, total spend, and the date they joined. Use the search bar to find a specific customer by name or phone number.</p>

<h3>Customer Detail</h3>
<p>Click on any customer to open their detail view. Here you can see:</p>
<ul>
  <li><strong>Points balance</strong> — current, earned, and redeemed</li>
  <li><strong>Transaction history</strong> — every purchase logged against their account</li>
  <li><strong>Redemption history</strong> — all rewards they've claimed</li>
  <li><strong>Activity timeline</strong> — a chronological feed of all interactions</li>
</ul>

<h3>Test Customers</h3>
<p>When <strong>Test Mode</strong> is enabled (in Settings → Advanced), new enrollments are marked as test customers. Test data does not affect your live analytics.</p>
`,
      },
      {
        slug: 'how-customers-join',
        title: 'How Customers Join Your Program',
        summary: 'The different ways customers can enroll in your loyalty program.',
        updatedAt: '2026-02-22',
        body: `
<p>Customers can join your loyalty program in several ways:</p>

<h3>1. WhatsApp Message</h3>
<p>When a customer messages your WhatsApp Business number for the first time, Pointhed automatically enrolls them and sends a welcome message. This is the most common and frictionless method.</p>

<h3>2. QR Code</h3>
<p>Generate a QR code from your dashboard (Settings → QR Code) that customers can scan with their phone. It opens a pre-filled WhatsApp message to your number, triggering automatic enrollment.</p>

<h3>3. Staff-Assisted</h3>
<p>Your staff can manually log a purchase for a new phone number. If the number isn't already enrolled, the customer is created automatically and receives a WhatsApp welcome message.</p>

<h3>What Happens on Enrollment</h3>
<p>When a customer joins, Pointhed:</p>
<ol>
  <li>Creates their profile with a 0-point balance</li>
  <li>Sends a branded welcome message via WhatsApp</li>
  <li>Makes them visible in your Customers tab</li>
</ol>
`,
      },
      {
        slug: 'customer-points-history',
        title: 'Understanding Points History',
        summary: 'How points are earned, spent, and tracked over time.',
        updatedAt: '2026-02-25',
        body: `
<p>Every customer's points balance is a running total of points earned minus points redeemed.</p>

<h3>Earning Points</h3>
<p>Points are earned when a staff member logs a purchase. The earn rate you set (e.g. 1 point per £1) determines how many points are awarded for each transaction.</p>

<h3>Spending Points</h3>
<p>Points are spent when a customer redeems a reward. The points cost is deducted from their balance instantly. If a redemption requires approval (your choice in Settings), points are held until you approve.</p>

<h3>Points History Table</h3>
<p>In the customer detail view, the <strong>Transactions</strong> tab shows every earn and spend event with:</p>
<ul>
  <li>Date and time</li>
  <li>Type (earn or redeem)</li>
  <li>Points amount (+/−)</li>
  <li>Running balance</li>
  <li>Associated purchase or reward name</li>
</ul>

<p><em>Tip: Use the Analytics tab to see aggregate points trends across your whole customer base.</em></p>
`,
      },
    ],
  },

  // ── 3. Rewards ──────────────────────────────────────────────────────
  {
    slug: 'rewards',
    title: 'Rewards',
    description: 'Create, manage, and optimize your rewards catalog.',
    icon: 'Gift',
    articles: [
      {
        slug: 'creating-rewards',
        title: 'Creating & Editing Rewards',
        summary: 'How to add new rewards and update existing ones.',
        updatedAt: '2026-02-18',
        body: `
<p>Your rewards catalog is what motivates customers to keep coming back.</p>

<h3>Adding a Reward</h3>
<ol>
  <li>Go to <strong>Dashboard → Rewards</strong></li>
  <li>Click <strong>Add Reward</strong></li>
  <li>Fill in the reward name, description, and points cost</li>
  <li>Upload an image (recommended: 400×400px or larger, JPG/PNG)</li>
  <li>Click <strong>Save</strong></li>
</ol>

<h3>Editing a Reward</h3>
<p>Click the edit icon next to any reward to update its name, description, points cost, or image. Changes take effect immediately — customers will see the updated reward in WhatsApp.</p>

<h3>Deactivating vs. Deleting</h3>
<p>If you want to temporarily remove a reward without losing its history, <strong>deactivate</strong> it. Deactivated rewards are hidden from customers but preserved in your analytics. To permanently remove a reward, use the delete option.</p>

<h3>Best Practices</h3>
<ul>
  <li>Offer a mix of low-cost and aspirational rewards</li>
  <li>Use clear, appealing images</li>
  <li>Keep descriptions short and benefit-focused</li>
  <li>Refresh your catalog regularly to keep customers engaged</li>
</ul>
`,
      },
      {
        slug: 'reward-redemption',
        title: 'How Reward Redemption Works',
        summary: 'The customer experience of redeeming a reward, from request to fulfillment.',
        updatedAt: '2026-03-01',
        body: `
<p>Pointhed supports two redemption flows: <strong>instant</strong> and <strong>approval-required</strong>.</p>

<h3>Instant Redemption</h3>
<p>The customer selects a reward in WhatsApp and, if they have enough points, a unique <strong>redemption code</strong> is generated immediately. They show this code to your staff who verifies it in the dashboard.</p>

<h3>Approval-Required Redemption</h3>
<p>If you've enabled manual approval (Settings → Rewards), redemption requests appear as "Pending" in your Rewards tab. A staff member reviews and approves (or declines) each request. Once approved, the customer receives their redemption code via WhatsApp.</p>

<h3>Verifying a Redemption Code</h3>
<p>When a customer presents their code in-store:</p>
<ol>
  <li>Open <strong>Dashboard → Rewards → Pending / Active</strong></li>
  <li>Enter the code in the verification field (or scan the QR code)</li>
  <li>Click <strong>Verify</strong> to mark it as fulfilled</li>
</ol>

<h3>Expiry</h3>
<p>Redemption codes expire after 24 hours by default. You can adjust this in Settings if needed.</p>
`,
      },
      {
        slug: 'reward-images',
        title: 'Reward Images & Media',
        summary: 'Tips for uploading attractive reward images.',
        updatedAt: '2026-02-20',
        body: `
<p>A good image can significantly increase reward appeal. Here's how to get it right:</p>

<h3>Image Requirements</h3>
<ul>
  <li><strong>Format:</strong> JPG or PNG</li>
  <li><strong>Size:</strong> At least 400×400px (square crops best)</li>
  <li><strong>Max file size:</strong> 5 MB</li>
</ul>

<h3>Tips for Great Reward Images</h3>
<ul>
  <li>Use real photos of the product or service</li>
  <li>Ensure good lighting and focus</li>
  <li>Avoid text overlays — the reward name and description handle the messaging</li>
  <li>Keep backgrounds clean and uncluttered</li>
</ul>

<h3>Updating an Image</h3>
<p>Edit any reward and click the image area to upload a replacement. The old image is removed and the new one takes effect immediately.</p>
`,
      },
    ],
  },

  // ── 4. Purchases & Logging ──────────────────────────────────────────
  {
    slug: 'purchases',
    title: 'Purchases & Logging',
    description: 'Log transactions, issue points, and manage purchase claims.',
    icon: 'ShoppingBag',
    articles: [
      {
        slug: 'logging-a-purchase',
        title: 'Logging a Purchase',
        summary: 'How staff log customer purchases to award loyalty points.',
        updatedAt: '2026-02-22',
        body: `
<p>Every time a customer makes a purchase, your staff logs the transaction so the customer earns points.</p>

<h3>From the Dashboard</h3>
<ol>
  <li>Go to <strong>Dashboard → Purchases</strong></li>
  <li>Click <strong>Log Purchase</strong></li>
  <li>Enter the customer's phone number (or search by name)</li>
  <li>Enter the purchase amount in your business currency</li>
  <li>Click <strong>Submit</strong></li>
</ol>
<p>Points are calculated automatically using your earn rate and added to the customer's balance.</p>

<h3>Via WhatsApp (Staff PIN)</h3>
<p>Staff can also log purchases directly in WhatsApp using a <strong>Staff PIN</strong>. The flow is:</p>
<ol>
  <li>Staff messages your WhatsApp number with the PIN command</li>
  <li>Enters their staff PIN for authentication</li>
  <li>Enters the customer's phone number and purchase amount</li>
  <li>The system confirms the transaction and notifies the customer</li>
</ol>

<p><em>Staff PINs are managed in Dashboard → Team. Each staff member gets a unique PIN.</em></p>
`,
      },
      {
        slug: 'purchase-claims',
        title: 'Understanding Purchase Claims',
        summary: 'What happens when a customer claims they made a purchase.',
        updatedAt: '2026-02-25',
        body: `
<p>If a customer believes they made a purchase that wasn't logged, they can submit a <strong>claim</strong> via WhatsApp.</p>

<h3>How Claims Work</h3>
<ol>
  <li>The customer selects "Report missing points" in the WhatsApp flow</li>
  <li>They enter the approximate date, amount, and any details</li>
  <li>The claim appears in your <strong>Purchases → Pending Claims</strong> tab</li>
</ol>

<h3>Reviewing Claims</h3>
<p>For each pending claim, you can:</p>
<ul>
  <li><strong>Approve</strong> — the purchase is logged and points are awarded</li>
  <li><strong>Decline</strong> — the claim is rejected (the customer is notified)</li>
</ul>

<h3>Notifications</h3>
<p>You'll see a badge on the Purchases tab when pending claims exist. The customer receives a WhatsApp message when their claim is approved or declined.</p>
`,
      },
      {
        slug: 'multi-currency',
        title: 'Multi-Currency Support',
        summary: 'How Pointhed handles different currencies and exchange rates.',
        updatedAt: '2026-03-01',
        body: `
<p>Pointhed supports multiple currencies with automatic exchange rate normalization.</p>

<h3>How It Works</h3>
<p>Your business has a <strong>base currency</strong> (set during onboarding). All points calculations use this as the reference. If a purchase is logged in a different currency, Pointhed converts it to your base currency using daily exchange rates before calculating points.</p>

<h3>Supported Currencies</h3>
<ul>
  <li>GBP (British Pound)</li>
  <li>NGN (Nigerian Naira)</li>
  <li>USD (US Dollar)</li>
  <li>EUR (Euro)</li>
  <li>JPY (Japanese Yen)</li>
</ul>

<h3>Exchange Rates</h3>
<p>Rates are updated daily at midnight UTC. You can view current rates in Settings → Currency. The rates are used for points calculation only — no actual money is converted.</p>
`,
      },
    ],
  },

  // ── 5. Broadcasts ──────────────────────────────────────────────────
  {
    slug: 'broadcasts',
    title: 'Broadcasts',
    description: 'Send targeted WhatsApp messages to your customer base.',
    icon: 'Megaphone',
    hidden: true,
    articles: [
      {
        slug: 'sending-a-broadcast',
        title: 'Sending a Broadcast',
        summary: 'How to create and send a WhatsApp broadcast to your customers.',
        updatedAt: '2026-02-28',
        body: `
<p>Broadcasts let you send targeted WhatsApp messages to some or all of your customers.</p>

<h3>Creating a Broadcast</h3>
<ol>
  <li>Go to <strong>Dashboard → Broadcasts</strong></li>
  <li>Click <strong>New Broadcast</strong></li>
  <li>Write your message — keep it concise and valuable</li>
  <li>Choose your audience (all customers, or filter by criteria)</li>
  <li>Review and click <strong>Send</strong></li>
</ol>

<h3>Message Best Practices</h3>
<ul>
  <li>Keep messages short (under 160 characters is ideal)</li>
  <li>Include a clear call-to-action</li>
  <li>Personalize where possible (customer name is inserted automatically)</li>
  <li>Don't send too frequently — 1-2 per week maximum</li>
</ul>

<h3>Delivery Status</h3>
<p>After sending, you can track delivery status in the broadcast detail view. Each message shows whether it was sent, delivered, or read.</p>
`,
      },
      {
        slug: 'broadcast-targeting',
        title: 'Targeting & Segmentation',
        summary: 'Send messages to specific customer segments for better engagement.',
        updatedAt: '2026-03-01',
        body: `
<p>Not every message needs to go to every customer. Pointhed's targeting lets you send the right message to the right people.</p>

<h3>Available Segments</h3>
<ul>
  <li><strong>All Customers</strong> — everyone enrolled in your program</li>
  <li><strong>Active Customers</strong> — those who've made a purchase in the last 30 days</li>
  <li><strong>Inactive Customers</strong> — no purchase in the last 30+ days (great for win-back campaigns)</li>
  <li><strong>High-Value</strong> — top spenders by total purchase amount</li>
  <li><strong>Close to Reward</strong> — customers within 20% of redeeming their next reward</li>
</ul>

<h3>Tips</h3>
<p>Segmented broadcasts typically see 2-3× higher engagement than mass sends. Target "Close to Reward" customers with a nudge like "You're only 15 points away from a free coffee!" for maximum impact.</p>
`,
      },
      {
        slug: 'broadcast-compliance',
        title: 'Broadcast Compliance & Opt-Out',
        summary: 'Stay compliant with WhatsApp policies and respect customer preferences.',
        updatedAt: '2026-03-01',
        body: `
<p>WhatsApp has strict rules about business messaging. Here's what you need to know:</p>

<h3>Opt-In Requirements</h3>
<p>Customers must have opted in to receive marketing messages. In Pointhed, opt-in happens when a customer enrolls in your loyalty program (they initiate the WhatsApp conversation).</p>

<h3>Opt-Out Handling</h3>
<p>If a customer sends "STOP" or "Unsubscribe", Pointhed automatically marks them as opted out. They will not receive future broadcasts, though they can still check their points and redeem rewards.</p>

<h3>Message Templates</h3>
<p>WhatsApp requires pre-approved templates for outbound messages. Pointhed manages templates automatically, but if you need custom templates, contact support.</p>

<h3>Rate Limits</h3>
<p>WhatsApp limits how many messages you can send based on your quality rating. Start with smaller sends and scale up as your rating improves.</p>
`,
      },
    ],
  },

  // ── 6. Settings ─────────────────────────────────────────────────────
  {
    slug: 'settings',
    title: 'Settings',
    description: 'Configure earn rates, currencies, business profile, and integrations.',
    icon: 'Settings',
    articles: [
      {
        slug: 'earn-rates',
        title: 'Configuring Earn Rates',
        summary: 'Set how many points customers earn per unit of currency spent.',
        updatedAt: '2026-02-20',
        body: `
<p>The earn rate determines how many loyalty points a customer receives for each unit of currency they spend.</p>

<h3>Setting Your Earn Rate</h3>
<ol>
  <li>Go to <strong>Dashboard → Settings</strong></li>
  <li>Find the <strong>Earn Rate</strong> section</li>
  <li>Enter your desired rate (e.g. "1" means 1 point per £1 / ₦1 / $1)</li>
  <li>Click <strong>Save</strong></li>
</ol>

<h3>Examples</h3>
<table>
  <tr><td><strong>Earn Rate</strong></td><td><strong>Purchase</strong></td><td><strong>Points Earned</strong></td></tr>
  <tr><td>1 per £1</td><td>£25.00</td><td>25 points</td></tr>
  <tr><td>2 per £1</td><td>£25.00</td><td>50 points</td></tr>
  <tr><td>1 per ₦100</td><td>₦5,000</td><td>50 points</td></tr>
</table>

<h3>Tips</h3>
<ul>
  <li>A higher earn rate makes customers feel like they're accumulating fast</li>
  <li>Balance the earn rate with your reward costs to maintain profitability</li>
  <li>You can change the rate anytime — it affects future purchases only</li>
</ul>
`,
      },
      {
        slug: 'business-profile',
        title: 'Business Profile Settings',
        summary: 'Update your business name, logo, and contact details.',
        updatedAt: '2026-02-18',
        body: `
<p>Your business profile appears in WhatsApp messages and customer-facing interactions.</p>

<h3>What You Can Customize</h3>
<ul>
  <li><strong>Business Name</strong> — displayed in all customer communications</li>
  <li><strong>Logo</strong> — shown in WhatsApp templates and the dashboard</li>
  <li><strong>Industry</strong> — helps Pointhed tailor recommendations</li>
  <li><strong>Contact Email</strong> — used for account-related notifications</li>
</ul>

<h3>Updating Your Profile</h3>
<p>Go to <strong>Dashboard → Settings → Business Profile</strong>. Make your changes and click <strong>Save</strong>. Updates to your business name reflect in future WhatsApp messages (existing messages aren't affected).</p>
`,
      },
      {
        slug: 'test-mode',
        title: 'Test Mode',
        summary: 'Try out features without affecting live data.',
        updatedAt: '2026-02-25',
        body: `
<p>Test Mode lets you experiment with Pointhed features without affecting your real customer data or analytics.</p>

<h3>Enabling Test Mode</h3>
<ol>
  <li>Go to <strong>Dashboard → Settings → Advanced</strong></li>
  <li>Toggle <strong>Test Mode</strong> on</li>
</ol>

<h3>What Happens in Test Mode</h3>
<ul>
  <li>New customers enrolled are marked as <strong>test customers</strong></li>
  <li>Purchases logged are tagged as <strong>test transactions</strong></li>
  <li>Test data is excluded from analytics and reports</li>
  <li>A yellow "Test Mode" banner appears across the dashboard</li>
</ul>

<h3>Exiting Test Mode</h3>
<p>Toggle Test Mode off in the same settings page. All future transactions will be treated as live. Test data remains in the system but stays tagged and filtered from reports.</p>

<p><em>Tip: Use Test Mode when training new staff or demonstrating the system to stakeholders.</em></p>
`,
      },
    ],
  },

  // ── 7. Team & Permissions ──────────────────────────────────────────
  {
    slug: 'team',
    title: 'Team & Permissions',
    description: 'Invite staff members, assign roles, and manage access.',
    icon: 'Shield',
    articles: [
      {
        slug: 'inviting-team-members',
        title: 'Inviting Team Members',
        summary: 'Add staff to your Pointhed account so they can log purchases and manage rewards.',
        updatedAt: '2026-02-22',
        body: `
<p>You can invite multiple team members to help manage your loyalty program.</p>

<h3>How to Invite</h3>
<ol>
  <li>Go to <strong>Dashboard → Team</strong></li>
  <li>Click <strong>Invite Member</strong></li>
  <li>Enter their email address and select a role</li>
  <li>Click <strong>Send Invite</strong></li>
</ol>
<p>The invitee receives an email with a link to create their account and join your workspace.</p>

<h3>Managing Invites</h3>
<p>Pending invitations are shown in the Team tab. You can resend or cancel them at any time.</p>
`,
      },
      {
        slug: 'roles-and-permissions',
        title: 'Roles & Permissions',
        summary: 'Understand the difference between Owner, Admin, and Staff roles.',
        updatedAt: '2026-02-25',
        body: `
<p>Pointhed has three roles with different permission levels:</p>

<h3>Owner</h3>
<ul>
  <li>Full access to everything</li>
  <li>Can manage billing and subscription</li>
  <li>Can delete the workspace</li>
  <li>Can invite Admins and Staff</li>
  <li>Only one Owner per workspace</li>
</ul>

<h3>Admin</h3>
<ul>
  <li>Full access to dashboard features</li>
  <li>Can manage team members (invite/remove Staff)</li>
  <li>Can manage rewards, settings, and broadcasts</li>
  <li>Cannot manage billing or delete the workspace</li>
</ul>

<h3>Staff</h3>
<ul>
  <li>Can log purchases and verify redemptions</li>
  <li>Can view customers and transactions</li>
  <li>Cannot change settings, manage rewards, or send broadcasts</li>
  <li>Gets a unique <strong>Staff PIN</strong> for WhatsApp-based purchase logging</li>
</ul>
`,
      },
      {
        slug: 'staff-pins',
        title: 'Staff PINs for WhatsApp',
        summary: 'How staff use PINs to log purchases via WhatsApp.',
        updatedAt: '2026-03-01',
        body: `
<p>Staff PINs allow your team to log purchases directly through WhatsApp without needing to open the dashboard.</p>

<h3>How It Works</h3>
<ol>
  <li>Each staff member is assigned a unique 4-digit PIN when they're added to your team</li>
  <li>To log a purchase, they message your business WhatsApp number</li>
  <li>They authenticate with their PIN</li>
  <li>They enter the customer's phone number and purchase amount</li>
  <li>The system confirms the transaction and awards points</li>
</ol>

<h3>Managing PINs</h3>
<p>PINs are visible in <strong>Dashboard → Team</strong>. Admins and Owners can regenerate a PIN if compromised.</p>

<p><em>Tip: Staff PINs are especially useful for businesses with counter staff who need a quick, phone-based way to log sales.</em></p>
`,
      },
    ],
  },

  // ── 8. Billing & Plans ─────────────────────────────────────────────
  {
    slug: 'billing',
    title: 'Billing & Plans',
    description: 'Understand plan tiers, limits, and how to manage your subscription.',
    icon: 'CreditCard',
    articles: [
      {
        slug: 'plan-overview',
        title: 'Plan Overview',
        summary: 'Compare Pointhed plans and understand what\'s included.',
        updatedAt: '2026-03-01',
        body: `
<p>Pointhed offers flexible plans designed to grow with your business.</p>

<h3>Free Plan</h3>
<ul>
  <li>Up to 50 customers</li>
  <li>Basic rewards catalog (up to 5 rewards)</li>
  <li>WhatsApp integration</li>
  <li>1 staff member</li>
  <li>Community support</li>
</ul>

<h3>Growth Plan</h3>
<ul>
  <li>Up to 500 customers</li>
  <li>Unlimited rewards</li>
  <li>Broadcast messaging</li>
  <li>Up to 5 staff members</li>
  <li>Analytics dashboard</li>
  <li>Email support</li>
</ul>

<h3>Business Plan</h3>
<ul>
  <li>Unlimited customers</li>
  <li>Unlimited rewards and staff</li>
  <li>Advanced analytics and segmentation</li>
  <li>Priority support</li>
  <li>Custom branding options</li>
</ul>

<p>Visit your dashboard's billing page for current pricing and to manage your subscription.</p>
`,
      },
      {
        slug: 'upgrading',
        title: 'Upgrading Your Plan',
        summary: 'How to upgrade and what happens when you do.',
        updatedAt: '2026-03-01',
        body: `
<p>Upgrading is instant and seamless — no data is lost.</p>

<h3>How to Upgrade</h3>
<ol>
  <li>Go to <strong>Dashboard → Settings → Billing</strong></li>
  <li>Click <strong>Upgrade</strong> on your desired plan</li>
  <li>Enter payment details</li>
  <li>Your new plan is active immediately</li>
</ol>

<h3>What Happens on Upgrade</h3>
<ul>
  <li>New limits take effect instantly</li>
  <li>All existing data is preserved</li>
  <li>You're charged a prorated amount for the remainder of the current billing cycle</li>
</ul>

<h3>Downgrading</h3>
<p>You can downgrade at any time. The downgrade takes effect at the end of your current billing period. If your usage exceeds the lower plan's limits, you'll be asked to reduce usage before the downgrade completes.</p>
`,
      },
    ],
  },

  // ── 9. Troubleshooting ─────────────────────────────────────────────
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues, error messages, and how to resolve them.',
    icon: 'CircleHelp',
    articles: [
      {
        slug: 'points-not-appearing',
        title: 'Points Not Appearing After Purchase',
        summary: 'Troubleshoot missing points after a logged transaction.',
        updatedAt: '2026-03-01',
        body: `
<p>If a customer's points didn't update after a purchase, check the following:</p>

<h3>1. Was the Purchase Logged?</h3>
<p>Go to <strong>Purchases</strong> tab and search for the transaction. If it's not there, the purchase wasn't logged — ask the staff member to re-enter it.</p>

<h3>2. Check the Customer's Phone Number</h3>
<p>Points are linked to phone numbers. If the purchase was logged under a different number than the customer's enrolled number, the points went to a different (or new) profile.</p>

<h3>3. Test Mode</h3>
<p>If Test Mode was enabled when the purchase was logged, the transaction is tagged as a test and won't appear in the live customer view. Toggle the "Show test data" filter to find it.</p>

<h3>4. Earn Rate</h3>
<p>If the earn rate was set to 0 at the time of the purchase, no points would have been awarded. Check Settings → Earn Rate.</p>
`,
      },
      {
        slug: 'redemption-code-issues',
        title: 'Redemption Code Not Working',
        summary: 'Fix issues with redemption codes that fail to verify.',
        updatedAt: '2026-03-01',
        body: `
<p>If a customer's redemption code isn't verifying, here are common causes:</p>

<h3>1. Code Expired</h3>
<p>Redemption codes expire after 24 hours by default. If the customer waited too long, the code is invalid. They'll need to request a new redemption.</p>

<h3>2. Already Used</h3>
<p>Each code can only be verified once. If it shows as "already redeemed", the code was already processed — check the redemption history for details.</p>

<h3>3. Typo</h3>
<p>Codes are case-sensitive. Ask the customer to share the code directly from their WhatsApp message (they can copy-paste it). Alternatively, scan the QR code version if available.</p>

<h3>4. Wrong Tenant</h3>
<p>If you have multiple business locations with separate Pointhed accounts, make sure you're verifying the code in the correct dashboard.</p>

<h3>Need to Override?</h3>
<p>Owners and Admins can manually mark a redemption as fulfilled from the Rewards tab, even if the code has issues.</p>
`,
      },
      {
        slug: 'account-access',
        title: 'Can\'t Sign In or Access Dashboard',
        summary: 'Resolve login issues, password resets, and account lockouts.',
        updatedAt: '2026-03-01',
        body: `
<p>Having trouble accessing your account? Try these steps:</p>

<h3>Forgot Password</h3>
<p>Click <strong>"Forgot password?"</strong> on the login page. Enter your email and you'll receive a reset link. The link expires after 1 hour.</p>

<h3>Email Not Recognized</h3>
<p>Make sure you're using the same email you signed up with. If you signed up with Google, use the <strong>"Sign in with Google"</strong> button instead of email/password.</p>

<h3>Verification Email Not Arriving</h3>
<ul>
  <li>Check your spam/junk folder</li>
  <li>Add <strong>no-reply@pointhed.com</strong> to your contacts</li>
  <li>Request a new verification from the login page</li>
</ul>

<h3>Account Locked</h3>
<p>After multiple failed login attempts, accounts are temporarily locked for security. Wait 15 minutes and try again, or reset your password.</p>

<h3>Still Can't Get In?</h3>
<p>Email <a href="mailto:support@pointhed.com">support@pointhed.com</a> from the email associated with your account and we'll help you regain access.</p>
`,
      },
    ],
  },
];

// ─── Utility helpers ──────────────────────────────────────────────────

export function getCategoryBySlug(slug: string): Category | undefined {
  return helpCategories.find((c) => c.slug === slug);
}

export function getArticle(categorySlug: string, articleSlug: string): { category: Category; article: Article } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const article = category.articles.find((a) => a.slug === articleSlug);
  if (!article) return undefined;
  return { category, article };
}

export function searchArticles(query: string): { category: Category; article: Article }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { category: Category; article: Article; score: number }[] = [];

  for (const category of helpCategories) {
    for (const article of category.articles) {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const summaryLower = article.summary.toLowerCase();
      const bodyLower = article.body.toLowerCase();

      if (titleLower.includes(q)) score += 10;
      if (summaryLower.includes(q)) score += 5;
      if (bodyLower.includes(q)) score += 1;

      // Also match individual words for partial queries
      const words = q.split(/\s+/);
      for (const word of words) {
        if (word.length < 2) continue;
        if (titleLower.includes(word)) score += 3;
        if (summaryLower.includes(word)) score += 2;
        if (bodyLower.includes(word)) score += 0.5;
      }

      if (score > 0) {
        results.push({ category, article, score });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .map(({ category, article }) => ({ category, article }));
}

/** Categories visible in the public help center (excludes hidden ones) */
export const publicHelpCategories = helpCategories.filter((c) => !c.hidden);

/** Flat count of all articles across visible categories */
export function getTotalArticleCount(): number {
  return publicHelpCategories.reduce((sum, c) => sum + c.articles.length, 0);
}
