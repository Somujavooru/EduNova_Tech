"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { submitCustomRequest } from "@/lib/data/customRequests";
import { sendNotification } from "@/lib/notifications";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function RequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    userName: user?.name || "",
    userEmail: user?.email || "",
    projectTitle: "",
    description: "",
    requiredTech: "",
    budget: "",
    deadline: "",
    additionalNotes: "",
    uploadedFiles: "", // Comma separated for mock
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user) {
      setFormData(prev => ({
        ...prev,
        userName: user.name || prev.userName,
        userEmail: user.email || prev.userEmail
      }));
    }
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to submit a request.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    const filesArray = formData.uploadedFiles
      ? formData.uploadedFiles.split(",").map((s) => s.trim())
      : [];

    const result = await submitCustomRequest({
      userId: user.id,
      userName: formData.userName,
      userEmail: formData.userEmail,
      projectTitle: formData.projectTitle,
      description: formData.description,
      requiredTech: formData.requiredTech,
      budget: Number(formData.budget),
      deadline: formData.deadline,
      additionalNotes: formData.additionalNotes,
      uploadedFiles: filesArray,
    });

    setIsSubmitting(false);

    if (!result) {
      const detail = (submitCustomRequest as { lastError?: string }).lastError || "Unknown error";
      console.error("[Requests] Submission failed:", detail);
      alert(`Error submitting your request: ${detail}\n\nIf this says "permission-denied", the Firestore security rules need to be published in Firebase Console.`);
      return;
    }

    sendNotification("request_submitted", {
      userEmail: formData.userEmail,
      userName: formData.userName,
      projectTitle: formData.projectTitle,
    });

    setIsSuccess(true);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center">
        <p className="text-gray-400">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 text-glow text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
          Request Submitted!
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Thank you, {formData.userName}. We have received your custom project request for "{formData.projectTitle}". 
          Our team will review your requirements and reach out to you shortly.
        </p>
        <Button size="lg" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#180d30] via-[#100820] to-[#080411] -mt-20 pt-32 pb-20 relative overflow-hidden">
      {/* Background ambient lighting orbs */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-72 right-10 w-[450px] h-[450px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 xl:px-12 relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Bespoke Engineering & Custom Software
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 drop-shadow-md">
            Request Custom Project
          </h1>
          <p className="text-purple-100/75 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Need something specific? Fill out the form below with your requirements, budget, and deadline, and our engineering team will build it for you.
          </p>
        </div>

        {!user && (
          <div className="mb-8 p-4 rounded-xl bg-yellow-500/15 border border-yellow-500/40 flex items-center gap-3 text-yellow-300 backdrop-blur-md shadow-lg">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-yellow-400" />
            <p className="text-sm font-medium">You must be logged in to submit a custom project request.</p>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => router.push("/login")}>Login</Button>
          </div>
        )}

        <Card className="relative overflow-hidden bg-gradient-to-br from-[#241540]/95 via-[#190d2e]/95 to-[#0f071e]/98 border-2 border-purple-500/40 shadow-[0_20px_70px_rgba(168,85,247,0.22)] backdrop-blur-2xl p-6 sm:p-9 rounded-3xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-pink-500/15 rounded-full blur-3xl pointer-events-none -ml-12 -mb-12" />

          <form className="flex flex-col gap-7 relative z-10" onSubmit={handleSubmit}>
            {/* Section 1: Client Information */}
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/30 border border-purple-500/20 shadow-inner">
              <h2 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                1. Client Contact Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-purple-200/90 uppercase tracking-wider">Your Name *</label>
                  <input 
                    type="text" 
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    required
                    disabled={!!user}
                    className="bg-black/30 border border-purple-400/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:bg-purple-900/30 focus:shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all disabled:opacity-60" 
                    placeholder="John Doe" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-purple-200/90 uppercase tracking-wider">Email Address *</label>
                  <input 
                    type="email" 
                    name="userEmail"
                    value={formData.userEmail}
                    onChange={handleChange}
                    required
                    disabled={!!user}
                    className="bg-black/30 border border-purple-400/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:bg-purple-900/30 focus:shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all disabled:opacity-60" 
                    placeholder="john@example.com" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Project Scope */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 shadow-inner flex flex-col gap-5">
              <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                2. Project Scope & Specifications
              </h2>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-indigo-200/90 uppercase tracking-wider">Project Title *</label>
                <input 
                  type="text" 
                  name="projectTitle"
                  value={formData.projectTitle}
                  onChange={handleChange}
                  required
                  className="bg-black/30 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/40 focus:outline-none focus:border-indigo-400 focus:bg-indigo-900/30 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all" 
                  placeholder="e.g. AI Based Object Detection & Analytics" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-indigo-200/90 uppercase tracking-wider">Detailed Description *</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4} 
                  className="bg-black/30 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/40 focus:outline-none focus:border-indigo-400 focus:bg-indigo-900/30 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all resize-y" 
                  placeholder="Describe your project requirements, features, algorithms, target hardware, and audience..." 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-indigo-200/90 uppercase tracking-wider">Required Technologies (Optional)</label>
                <input 
                  type="text" 
                  name="requiredTech"
                  value={formData.requiredTech}
                  onChange={handleChange}
                  className="bg-black/30 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-300/40 focus:outline-none focus:border-indigo-400 focus:bg-indigo-900/30 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all" 
                  placeholder="React, Next.js, Node.js, Python, PyTorch, MongoDB..." 
                />
              </div>
            </div>

            {/* Section 3: Budget, Timeline & Attachments */}
            <div className="p-4 sm:p-5 rounded-2xl bg-pink-950/25 border border-pink-500/20 shadow-inner flex flex-col gap-5">
              <h2 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                3. Budget, Timeline & Attachments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-pink-200/90 uppercase tracking-wider">Estimated Budget (₹) *</label>
                  <input 
                    type="number" 
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                    min="1000"
                    className="bg-black/30 border border-pink-400/30 rounded-xl px-4 py-3 text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:bg-pink-900/30 focus:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all font-semibold" 
                    placeholder="10000" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-pink-200/90 uppercase tracking-wider">Target Deadline *</label>
                  <input 
                    type="date" 
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    required
                    style={{ colorScheme: "dark" }}
                    className="bg-black/30 border border-pink-400/30 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-pink-400 focus:bg-pink-900/30 focus:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-pink-200/90 uppercase tracking-wider">Mock Uploaded Files</label>
                  <input 
                    type="text" 
                    name="uploadedFiles"
                    value={formData.uploadedFiles}
                    onChange={handleChange}
                    className="bg-black/30 border border-pink-400/30 rounded-xl px-4 py-3 text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:bg-pink-900/30 focus:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all" 
                    placeholder="architecture.pdf, schema.png (Comma separated)" 
                  />
                  <span className="text-[10px] text-pink-300/60">Provide file names to simulate attachments.</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-pink-200/90 uppercase tracking-wider">Additional Notes (Optional)</label>
                  <textarea 
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    rows={2} 
                    className="bg-black/30 border border-pink-400/30 rounded-xl px-4 py-3 text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:bg-pink-900/30 focus:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all resize-y" 
                    placeholder="Specific hardware or contact preferences?" 
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              fullWidth 
              className="mt-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white font-extrabold py-4 rounded-xl shadow-[0_6px_30px_rgba(168,85,247,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] text-base"
              disabled={!user || isSubmitting}
            >
              {isSubmitting ? "Submitting Custom Request..." : "🚀 Submit Custom Project Request"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
