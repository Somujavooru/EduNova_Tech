import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-24">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-400 mb-12">Last Updated: May 12, 2026</p>

        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[var(--color-neon-blue)]">
          <h2 className="text-2xl font-bold mb-4 mt-8">1. Information We Collect</h2>
          <p className="mb-6 leading-relaxed">
            When you register, place an order, or submit a custom project request on EduNova, we collect necessary personal information such as your name, email address, and payment verification details (e.g., UTR numbers and screenshots).
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">2. How We Use Your Information</h2>
          <p className="mb-6 leading-relaxed">
            We use your information strictly to:
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300 space-y-2">
            <li>Process transactions and verify milestone payments.</li>
            <li>Deliver digital products and custom project links securely.</li>
            <li>Send important system notifications regarding your project status.</li>
            <li>Provide customer support.</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">3. Data Security</h2>
          <p className="mb-6 leading-relaxed">
            EduNova implements industry-standard security measures to protect your personal information. Payment proofs are securely stored and verified strictly by authorized administrators. We do not sell or rent your personal information to third parties.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">4. Cookies</h2>
          <p className="mb-6 leading-relaxed">
            We use cookies to maintain your session and improve your experience on our platform. You can configure your browser to reject cookies, but doing so may limit functionality.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">5. Contact Us</h2>
          <p className="mb-6 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact our Data Protection Officer at <a href="mailto:privacy@edunova.com" className="hover:underline">privacy@edunova.com</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
