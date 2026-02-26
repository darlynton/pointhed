import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCheck, Globe, LayoutDashboard, MessageCircle, ShoppingBag, Smartphone, TrendingUp, Zap } from 'lucide-react';

export default function LandingPage() {

  // Intersection observer for scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div>
              <img src="/uploads/logo.png" alt="Pointhed" className="h-5 w-auto" />
            </div>
            <div className="flex items-center gap-6">
              <Link 
                to="/login" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
              >
                Sign in
              </Link>
              <Link 
                to="/signup"
                className="text-sm font-medium px-5 py-2.5 bg-[#264EFF] text-white rounded-full hover:bg-[#1a3ed9] transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 lg:pt-56 pb-32 lg:pb-48 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            {/* Left: Copy — takes up ~55% on desktop */}
            <div className="relative z-10 lg:w-[55%] text-center lg:text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#98F885]/20 rounded-full mb-8">
                <span className="w-2 h-2 bg-[#98F885] rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">WhatsApp-native loyalty</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="font-sora font-semibold text-[clamp(2rem,8vw,4.5rem)] leading-[1.05] tracking-tight text-gray-900 mb-6">
                Your customers already forgot{' '}
                <span className="relative inline-block">
                   you exist
                  <svg 
                    className="absolute -bottom-2 left-0 w-full" 
                    viewBox="0 0 300 12" 
                    fill="none"
                    aria-hidden="true"
                  >
                    <path 
                      d="M2 8.5C50 3.5 100 2 150 4C200 6 250 3.5 298 8.5" 
                      stroke="#FF8BFF" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      className="animate-draw"
                    />
                  </svg>
                </span>
              </h1>
              
              {/* Subhead */}
              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed mb-12">
                Pointhed brings them back through the app they actually open. 
                No downloads. No plastic cards. Just WhatsApp.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#264EFF] text-white font-medium rounded-full hover:bg-[#1a3ed9] transition-all hover:gap-3 group"
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a 
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right: WhatsApp Phone Mockup — absolutely positioned on desktop */}
            <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-[-8rem] z-0">
              <img
                src="/uploads/whatsapp-mockup-single.png"
                alt="WhatsApp loyalty chat mockup"
                className="w-[680px] drop-shadow-2xl rounded-3xl"
              />
              <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-[#98F885]/20 rounded-full blur-3xl" />
              <div className="absolute -z-10 bottom-10 -left-10 w-64 h-64 bg-[#264EFF]/10 rounded-full blur-3xl" />
            </div>

            {/* Mobile: show image below copy */}
            <div className="lg:hidden mt-10 flex justify-center">
              <img
                src="/uploads/whatsapp-mockup-single.png"
                alt="WhatsApp loyalty chat mockup"
                className="w-[340px] drop-shadow-2xl rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section
        id="problem-section"
        data-animate
        className={`bg-gray-900 transition-opacity duration-700 ${
          isVisible('problem-section') ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-end">
            {/* Left: spacer so text shifts right — image is absolute to container */}
            <div className="hidden lg:block lg:w-[40%] flex-shrink-0" />

            {/* Right: copy — controls section height */}
            <div className="w-full lg:w-[60%] px-8 lg:px-16 py-16 lg:py-28 text-white">
              <span className="font-sora text-sm uppercase tracking-widest text-gray-400 mb-6 block">The problem</span>
              <h2 className="font-sora text-2xl lg:text-4xl font-semibold leading-tight mb-6">
                <span className="block lg:whitespace-nowrap">Loyalty cards live in wallets.</span>
                <span className="block lg:whitespace-nowrap text-gray-500">Wallets live in drawers.</span>
              </h2>
              <div className="w-12 h-1 bg-[#264EFF] rounded-full mb-6" />
              <p className="text-lg text-gray-400 leading-relaxed">
                Apps get deleted. Cards get lost. Emails get ignored.
                Your customers aren't disloyal — they're just distracted.
                The average person checks WhatsApp 23 times a day.
                That's where you need to be.
              </p>
            </div>
          </div>

          {/* Image: absolute to container, bottom-anchored, overflows upward */}
          <img
            src="/uploads/problem.png"
            alt="The problem with traditional loyalty"
            className="hidden lg:block absolute bottom-0 left-0 w-[470px] pointer-events-none z-10"
          />

          {/* Coin: floating on the right edge */}
          <img
            src="/uploads/coin.png"
            alt=""
            className="hidden lg:block absolute top-12 right-0 translate-x-1/3 w-58 pointer-events-none drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
          />

          {/* Coin bottom-left: clipping wrapper keeps it from bleeding into next section */}
          <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src="/uploads/coin.png"
              alt=""
              className="absolute bottom-0 left-62 w-58 pointer-events-none drop-shadow-2xl z-0 animate-[float-bottom_4s_ease-in-out_2s_infinite]"
            />
          </div>
        </div>
      </section>

      {/* How It Works - with WhatsApp UI hint */}
      <section 
        id="how-it-works"
        data-animate
        className={`py-20 lg:py-32 px-6 lg:px-12 transition-all duration-700 ${
          isVisible('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 lg:mb-24">
            <span className="font-sora text-sm uppercase tracking-widest text-[#264EFF]">How it works</span>
            <h2 className="font-sora text-3xl lg:text-5xl font-medium mt-4 tracking-tight">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-stretch">
            {/* Step 1 */}
            <div className="group h-full">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#264EFF]/20 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#264EFF]/10 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-6 h-6 text-[#264EFF]" />
                </div>
                <h3 className="font-sora text-xl font-medium mb-3">Customer makes a purchase</h3>
                <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                  In-store, online, or through social media — Instagram, Facebook, wherever your customers already shop.
                </p>
                {/* Purchase notification card */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#264EFF]/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-4 h-4 text-[#264EFF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">Bought $150.00</p>
                    <p className="text-xs text-gray-500 mt-1">at Jolly's Flower Shop · just now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group h-full">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#98F885]/40 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#98F885]/25 flex items-center justify-center mb-6">
                  <LayoutDashboard className="w-6 h-6 text-[#3a9e26]" />
                </div>
                <h3 className="font-sora text-xl font-medium mb-3">You log the transaction</h3>
                <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                  Enter the sale amount in your dashboard. Points are calculated and credited to the customer instantly.
                </p>
                {/* Minimal dashboard hint */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Purchase</span>
                    <span className="font-medium">$250.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Points earned</span>
                    <span className="font-medium text-[#62C54E]">+250</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group h-full">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#FF8BFF]/30 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#FF8BFF]/20 flex items-center justify-center mb-6">
                  <MessageCircle className="w-6 h-6 text-[#c945c9]" />
                </div>
                <h3 className="font-sora text-xl font-medium mb-3">They get rewarded via WhatsApp</h3>
                <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                  Points land in their WhatsApp. Rewards unlock automatically. They redeem right in the chat — no app, no card, no friction.
                </p>
                {/* WhatsApp message bubble — full width */}
                <div className="bg-[#DCF8C6] rounded-2xl rounded-br-none px-4 py-3 w-full">
                  <p className="text-sm text-gray-900 leading-snug">🎉 You've unlocked a free coffee! Show this to redeem.</p>
                  <div className="flex items-center justify-end gap-1 mt-0">
                    <span className="text-[10px] text-gray-500">9:42 AM</span>
                    <CheckCheck className="w-4 h-4 text-[#53bdeb]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Feature Section */}
      <section
        id="wow-section"
        data-animate
        className={`py-20 lg:py-32 px-6 lg:px-12 transition-all duration-700 ${
          isVisible('wow-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-stretch">

            {/* Left: Main blue card */}
            <div className="bg-[#264EFF] rounded-3xl p-7 lg:p-14 flex flex-col justify-between min-h-[400px]">
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-8">
                  <Zap className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white">Automatic</span>
                </div>

                <h2 className="font-sora font-bold text-3xl lg:text-5xl text-white leading-tight mb-6">
                  Points are awarded<br />instantly, every time
                </h2>

                <p className="text-white/80 text-lg leading-relaxed mb-8">
                  Customer makes a purchase. Transaction gets logged by business or customer. Points appear in their WhatsApp. Done.
                </p>
              </div>

              <div className="space-y-3">
                {['Works on any WhatsApp number', 'No app download required', 'Rewards redeem inside the chat'].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#98F885] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-gray-900" />
                    </div>
                    <span className="text-white font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Two stacked cards */}
            <div className="flex flex-col gap-6">
              {/* Green card */}
              <div className="bg-[#98F885] rounded-3xl p-8 flex flex-col gap-4 flex-1">
                <div className="w-10 h-10 bg-white/40 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-sora font-bold text-xl text-gray-900 mb-2">On WhatsApp</h3>
                  <p className="text-gray-800 leading-relaxed">2 billion users. Already on their phone. Zero download friction.</p>
                </div>
              </div>

              {/* Pink card */}
              <div className="bg-[#FF8BFF] rounded-3xl p-8 flex flex-col gap-4 flex-1">
                <div className="w-10 h-10 bg-white/40 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-sora font-bold text-xl text-gray-900 mb-2">Real results</h3>
                  <p className="text-gray-800 leading-relaxed">Businesses see 3x higher return visits within 30 days.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Benefits - Asymmetric Layout */}
      <section 
        id="benefits-section"
        data-animate
        className={`py-20 lg:py-32 px-6 lg:px-12 bg-white transition-all duration-700 ${
          isVisible('benefits-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-24">
            {/* Left column - stacked benefits */}
            <div className="space-y-12">
              <div>
                <span className="font-sora text-sm uppercase tracking-widest text-gray-400">For businesses</span>
                <h2 className="font-sora text-3xl lg:text-4xl font-medium mt-4 tracking-tight">
                  Built for real operations
                </h2>
              </div>
              
              <div className="space-y-8">
                {[
                  { title: 'No app to maintain', desc: 'No updates. No App Store approvals. No IT overhead.' },
                  { title: 'Works with any POS', desc: 'Log purchases from anywhere. Web, mobile, even WhatsApp itself.' },
                  { title: 'Multi-location ready', desc: 'One program across all your stores. Unified customer view.' },
                  { title: 'Real-time analytics', desc: "See who's coming back, who's churning, and why." },
                ].map((benefit, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#98F885]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-[#264EFF]" />
                    </div>
                    <div>
                      <h3 className="font-sora font-medium mb-1">{benefit.title}</h3>
                      <p className="text-gray-600 text-sm">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column - offset card */}
            <div className="flex items-start justify-center px-8 pt-8 pb-8 lg:px-0 lg:pt-0 lg:pb-0">
              <div className="relative">
              {/* Decorative blobs */}
              <div className="absolute -top-8 -left-8 w-48 h-48 bg-[#98F885]/30 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-8 -right-8 w-56 h-56 bg-[#264EFF]/15 rounded-full blur-3xl -z-10" />
              <div className="absolute top-1/2 -right-12 w-32 h-32 bg-[#FF8BFF]/20 rounded-full blur-2xl -z-10" />

              {/* Floating badge — top left */}
              <div className="absolute -top-5 -left-6 z-10 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2.5 border border-gray-100">
                <span className="text-xl">🎉</span>
                <div>
                <p className="text-xs font-semibold text-gray-800 leading-tight">Reward unlocked!</p>
                <p className="text-[10px] text-gray-400">Free coffee waiting</p>
                </div>
              </div>

              {/* Floating stat — bottom right */}
              <div className="absolute -bottom-5 -right-6 z-10 bg-white rounded-2xl shadow-lg px-4 py-3 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Open rate</p>
                <p className="font-sora text-2xl font-semibold text-gray-900">95%</p>
              </div>

              {/* Dotted grid decoration */}
              <div
                className="absolute -bottom-6 -left-6 w-24 h-24 -z-10 opacity-30"
                style={{
                backgroundImage: 'radial-gradient(circle, #264EFF 1px, transparent 1px)',
                backgroundSize: '8px 8px',
                }}
              />

              <img
                src="/uploads/whatsapp-mockup-menu.png"
                alt="WhatsApp loyalty menu mockup"
                className="w-full max-w-[420px] drop-shadow-2xl rounded-3xl relative z-0 animate-[float-mockup_6s_ease-in-out_infinite]"
              />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Credibility */}
      <section 
        id="proof-section"
        data-animate
        className={`py-20 lg:py-24 px-6 lg:px-12 border-y border-gray-100 transition-all duration-700 ${
          isVisible('proof-section') ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <p className="font-sora text-sm uppercase tracking-widest text-gray-400 mb-12">
              Designed for businesses that take customers seriously
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8">
              {['Retail', 'F&B', 'Salons', 'Clinics', 'Gyms', 'Services'].map((industry) => (
                <span 
                  key={industry} 
                  className="font-sora text-xl lg:text-2xl font-medium text-gray-300 hover:text-gray-900 transition-colors cursor-default"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta"
        data-animate
        className={`py-24 lg:py-40 px-6 lg:px-12 bg-[#264EFF] text-white transition-all duration-700 ${
          isVisible('cta') ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-sora text-3xl lg:text-5xl font-medium tracking-tight mb-6">
            Ready to stop losing customers?
          </h2>
          <p className="text-xl text-white/80 mb-12">
            Start your free trial today. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#264EFF] font-medium rounded-full hover:bg-gray-100 transition-colors"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <img src="/uploads/logo-white.png" alt="Pointhed" className="h-5 w-auto" />
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Pointhed. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Global Styles */}
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 300; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: draw 1s ease-out forwards;
          animation-delay: 0.5s;
        }
        .font-sora {
          font-family: 'Sora', system-ui, sans-serif;
        }
      `}</style>
    </div>
  );
}
