"use client";

import { useState, FormEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertTriangle, Building2, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveContactMessage, getSocialLinks, SocialMediaLinks } from "@/lib/data/contact";
import { sendNotification } from "@/lib/notifications";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";

// We can map social names to dynamic lucide icons, but lucide doesn't have full brand icons like WhatsApp/Telegram.
// Let's create simple SVG components for them or use generic ones.
const SocialIcons: Record<string, React.ReactNode> = {
  instagram: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  )
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    projectRef: "",
    phone: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [socials, setSocials] = useState<SocialMediaLinks | null>(null);

  useEffect(() => {
    setSocials(getSocialLinks());
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Persist message to server database, cloud, and local cache
      await saveContactMessage(formData);

      // 2. Trigger in-app notification
      sendNotification("contact_received", { userName: formData.name, userEmail: formData.email });
      
      setIsSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "", projectRef: "", phone: "" });
      
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      console.error("[Contact] Error submitting contact message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-[80px]">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 xl:px-12 py-12">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] text-sm font-bold mb-6"
          >
            <MessageSquare className="w-4 h-4" />
            Get in Touch
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight"
          >
            How can we <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)]">help you?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl leading-relaxed"
          >
            Have a question, custom request, or just want to say hi? 
            Drop us a message and our team will get back to you within 24 hours.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Contact Info & Socials (Left Column) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-neon-blue)]/10 to-[var(--color-neon-purple)]/10 blur-[80px] pointer-events-none" />
              
              <h3 className="text-2xl font-bold text-white mb-8">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-[var(--color-neon-blue)]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Email Us</p>
                    <a href="mailto:edunovasupport@gmail.com" className="text-white hover:text-[var(--color-neon-blue)] transition-colors font-medium">edunovasupport@gmail.com</a>
                    <p className="text-xs text-gray-500 mt-1">We aim to reply within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-6">Connect With Us</h3>
              <div className="flex flex-wrap gap-4">
                {socials && Object.entries(socials).map(([key, data]) => {
                  if (!data.enabled) return null;
                  const icon = SocialIcons[key] || <ArrowRight className="w-5 h-5" />;
                  return (
                    <span
                      key={key}
                      className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 opacity-50 cursor-not-allowed transition-all duration-300"
                      title={`${key.charAt(0).toUpperCase() + key.slice(1)} (Temporarily Inactive)`}
                    >
                      {icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Contact Form (Right Column) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-7"
          >
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-xl shadow-2xl relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-neon-blue)]/20 rounded-full blur-[80px]" />
              
              <h3 className="text-2xl font-bold text-white mb-2">Send a Message</h3>
              <p className="text-gray-400 mb-8">Fill out the form below and we'll get right back to you.</p>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">Message Sent!</h4>
                  <p className="text-green-400/80 mb-8">Thank you for reaching out. We will get back to you shortly.</p>
                  <Button onClick={() => setIsSuccess(false)} variant="secondary">Send Another Message</Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">Subject *</label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all"
                        placeholder="How can we help?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">Phone Number <span className="text-gray-600 font-normal">(Optional)</span></label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Project Reference <span className="text-gray-600 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={formData.projectRef}
                      onChange={e => setFormData({ ...formData, projectRef: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all"
                      placeholder="e.g. Smart IoT Agriculture Project"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-blue)]/50 focus:bg-white/5 transition-all resize-none"
                      placeholder="Write your message here..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    fullWidth 
                    disabled={isSubmitting}
                    className="relative overflow-hidden group"
                  >
                    <span className={`flex items-center justify-center gap-2 transition-transform duration-300 ${isSubmitting ? '-translate-y-12' : 'translate-y-0'}`}>
                      <Send className="w-5 h-5" />
                      Send Message
                    </span>
                    <span className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ${isSubmitting ? 'translate-y-0' : 'translate-y-12'}`}>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </span>
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
