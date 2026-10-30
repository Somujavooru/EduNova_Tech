export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col font-sans">
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] mb-4">
          Terms of Service
        </h1>
        <p className="text-gray-400 mb-12">Last Updated: May 12, 2026</p>

        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[var(--color-neon-blue)]">
          <h2 className="text-2xl font-bold mb-4 mt-8">1. Acceptance of Terms</h2>
          <p className="mb-6 leading-relaxed">
            By accessing and using the EduNova Forge platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">2. Digital Products & Custom Requests</h2>
          <p className="mb-6 leading-relaxed">
            EduNova Forge provides a marketplace for digital engineering projects and a service for custom project requests. Due to the digital nature of these products, all sales are final once the source files or delivery links have been accessed.
          </p>
          <ul className="list-disc pl-6 mb-6 text-gray-300 space-y-2">
            <li><strong>Marketplace Purchases:</strong> You are granted a non-exclusive license to use the project files for educational and personal purposes. Resale is strictly prohibited.</li>
            <li><strong>Custom Projects:</strong> Requires a 25% non-refundable advance payment to begin development. The final 75% payment is required prior to unlocking the final deliverables.</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">3. User Responsibilities</h2>
          <p className="mb-6 leading-relaxed">
            You agree to provide accurate information during registration and payment. Attempting to bypass the payment verification system or sharing premium delivery links publicly will result in immediate account termination.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">4. Intellectual Property</h2>
          <p className="mb-6 leading-relaxed">
            All content, source code, and assets provided by EduNova Forge remain the intellectual property of their respective creators. The purchase grants a usage license, not full copyright ownership, unless explicitly stated in a custom contract.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">5. Contact Information</h2>
          <p className="mb-6 leading-relaxed">
            If you have any questions regarding these terms, please contact our legal team at <a href="mailto:legal@edunova.com" className="hover:underline">legal@edunova.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
