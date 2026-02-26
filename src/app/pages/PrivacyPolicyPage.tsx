import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="font-sora font-semibold text-xl tracking-tight">
              pointhed
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-36 pb-24 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-400 mb-2">Effective date: 12 January 2026</p>
          <h1 className="font-sora text-4xl lg:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-12">
            Pointhed ("we", "us", "our") respects your privacy and is committed to protecting your personal data.
            This policy explains what information we collect, how we use it, and your rights.
          </p>

          <div className="space-y-10">
            <Section title="1. Information We Collect">
              <p>We may collect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Contact details you provide (name, email, phone) when you join the waitlist or contact us.</li>
                <li>Communications and support messages.</li>
                <li>Usage and analytics data (IP address, device, pages visited) through cookies and similar technologies.</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>
                We use data to provide and improve our service, send transactional and marketing
                communications (with your consent where required), analyze usage, and respond to inquiries.
              </p>
            </Section>

            <Section title="3. Sharing & Third Parties">
              <p>
                We may share data with service providers who perform services on our behalf
                (email providers, analytics, hosting). We do not sell personal information.
              </p>
            </Section>

            <Section title="4. Cookies & Tracking">
              <p>
                We use cookies and similar technologies for site functionality and analytics.
                You can control cookies via your browser settings.
              </p>
            </Section>

            <Section title="5. Data Security & Retention">
              <p>
                We take reasonable measures to protect data. We retain personal data only as long as
                necessary for the purposes described.
              </p>
            </Section>

            <Section title="6. Your Rights">
              <p>
                You may request access, correction, deletion, or portability of your personal data,
                or object to processing where applicable. To exercise these rights, contact us below.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                For questions or requests:{' '}
                <a href="mailto:privacy@pointhed.com" className="text-[#264EFF] hover:underline">
                  privacy@pointhed.com
                </a>
              </p>
            </Section>
          </div>

          <div className="mt-14 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-400">
              By using our site you agree to the terms of this privacy policy. We may update this policy;
              changes will be posted here with a revised effective date.
            </p>
            <p className="text-sm text-gray-400 mt-2">— Pointhed</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-sora text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}
