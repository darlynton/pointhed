import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-12">
            Welcome to Pointhed. These Terms of Service ("Terms") govern your access to and use of our
            website and services. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <div className="space-y-10">
            <Section title="1. Use of Service">
              <p>
                You may use our services for lawful purposes only. You agree not to misuse the service
                or help anyone else do so.
              </p>
            </Section>

            <Section title="2. Accounts & Communications">
              <p>
                If you provide contact information (email, phone) to join the waitlist or receive
                communications, you consent to receive messages from us as described in our{' '}
                <Link to="/privacy-policy" className="text-[#264EFF] hover:underline">Privacy Policy</Link>.
              </p>
            </Section>

            <Section title="3. Intellectual Property">
              <p>
                All content, trademarks, and logos on the service are owned by Pointhed or our licensors.
                You may not use our marks without prior written permission.
              </p>
            </Section>

            <Section title="4. Disclaimers & Limitation of Liability">
              <p>
                Our services are provided "as is" without warranties. To the maximum extent permitted by law,
                Pointhed is not liable for indirect, incidental, or consequential damages arising from your
                use of the service.
              </p>
            </Section>

            <Section title="5. Termination">
              <p>
                We may suspend or terminate access to the service for any user who breaches these Terms
                or for operational reasons.
              </p>
            </Section>

            <Section title="6. Governing Law">
              <p>
                These Terms are governed by the laws of the jurisdiction where Pointhed is established,
                without regard to conflict of law principles.
              </p>
            </Section>

            <Section title="7. Changes">
              <p>
                We may update these Terms; we will post the revised terms with a new effective date.
                Continued use after changes constitutes acceptance.
              </p>
            </Section>

            <Section title="8. Contact">
              <p>
                Questions about these Terms:{' '}
                <a href="mailto:legal@pointhed.com" className="text-[#264EFF] hover:underline">
                  legal@pointhed.com
                </a>
              </p>
            </Section>
          </div>

          <div className="mt-14 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-400">— Pointhed</p>
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
