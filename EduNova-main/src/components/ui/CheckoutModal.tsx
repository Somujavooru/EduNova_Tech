"use client";

import { useState, useRef, useEffect } from "react";
import { Project } from "@/lib/data/mockProjects";
import { createOrder, DuplicateUtrError } from "@/lib/data/orders";
import { useAuth } from "@/context/AuthContext";
import { sendNotification } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Upload, CheckCircle, Clock, QrCode, IndianRupee, Shield, LogIn, Hash, AlertCircle, Image as ImageIcon, Gift } from "lucide-react";
import { Button } from "./Button";
import { hasFreeAccess } from "@/lib/data/projectIntegration";
import { compressImage } from "@/lib/imageUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPlatformSettings, getEffectiveQrCodeUrl } from "@/lib/data/settings";

interface Props {
  project: Project;
  onClose: () => void;
}

type Step = "checkout" | "uploading" | "submitted";

export function CheckoutModal({ project, onClose }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("checkout");
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState("");
  const [acceptedToS, setAcceptedToS] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ utr?: string; screenshot?: string; tos?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against rapid double-clicks submitting duplicate orders
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      onClose();
    }
  }, [user, loading, router, onClose]);

  // Auth gate — wait or redirect
  if (loading || !user) {
    return null;
  }

  // Free access gate — custom project original requester
  if (hasFreeAccess(user.email, project.id)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-2xl border border-[var(--color-neon-purple)]/30 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(168,85,247,0.2)] p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-[var(--color-neon-purple)]/30 to-[var(--color-neon-blue)]/30 border border-[var(--color-neon-purple)]/40 flex items-center justify-center"
          >
            <Gift className="w-10 h-10 text-[var(--color-neon-purple)]" />
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-2">Free Access Granted! 🎉</h2>
          <p className="text-gray-400 mb-6">
            This project was built for your custom request. You have <strong className="text-[var(--color-neon-purple)]">free lifetime access</strong> — no payment needed!
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1" onClick={onClose}>
              <Button variant="secondary" size="lg" fullWidth>
                Go to Dashboard
              </Button>
            </Link>
            <Button size="lg" className="flex-1" onClick={onClose}>
              <CheckCircle className="w-5 h-5" />
              Got It!
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, screenshot: "File size must be less than 1MB" }));
        return;
      }
      setFileName(file.name);
      setErrors(prev => ({ ...prev, screenshot: undefined }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setFilePreview(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, screenshot: "File size must be less than 1MB" }));
        return;
      }
      setFileName(file.name);
      setErrors(prev => ({ ...prev, screenshot: undefined }));
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setFilePreview(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    let isValid = true;
    const newErrors: { utr?: string; screenshot?: string; tos?: string } = {};
    if (!utrNumber.trim()) {
      newErrors.utr = "UTR / Transaction number is required";
      isValid = false;
    } else if (utrNumber.trim().length < 6) {
      newErrors.utr = "Enter a valid UTR number (min 6 characters)";
      isValid = false;
    }
    if (!filePreview) {
      newErrors.screenshot = "Payment screenshot is required";
      isValid = false;
    }
    if (!acceptedToS) {
      newErrors.tos = "You must accept the Terms of Service & Privacy Policy";
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    // Guard against re-entry from rapid double-clicks
    if (isSubmitting.current) return;
    if (!validate()) return;

    isSubmitting.current = true;
    setStep("uploading");

    // Create the order
    try {
      const order = await createOrder(
        user.id,
        user.email,
        user.name,
        project,
        filePreview!,
        utrNumber.trim(),
        "UPI"
      );
      setOrderId(order.id);

      // Send notification with server-returned amount
      sendNotification("order_placed", {
        userName: user.name,
        userEmail: user.email,
        orderId: order.id,
        projectTitle: project.title,
        amount: order.amount ?? project.price,
      });

      // Simulate processing delay
      setTimeout(() => {
        setStep("submitted");
        sendNotification("payment_submitted", {
          userName: user.name,
          userEmail: user.email,
          orderId: order.id,
          projectTitle: project.title,
          amount: order.amount ?? project.price,
          utrNumber: utrNumber.trim(),
        });
        // Don't reset isSubmitting — order is complete, prevent any re-submission
      }, 1800);
    } catch (e) {
      console.error("[Checkout] Order creation failed:", e);
      if (e instanceof DuplicateUtrError) {
        setErrors((prev) => ({ ...prev, utr: e.message }));
      } else {
        setErrors((prev) => ({ ...prev, utr: (e as Error)?.message || "Failed to create order. Please try again." }));
      }
      setStep("checkout");
      // Reset guard so user can retry after a genuine error
      isSubmitting.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(0,240,255,0.15)] modal-scrollable custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>

        {/* SUCCESS STATE */}
        {step === "submitted" ? (
          <div className="p-8 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">Order Submitted!</h2>
            <p className="text-gray-400 mb-6">
              Your payment proof for <strong className="text-white">{project.title}</strong> has been uploaded successfully.
            </p>

            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Awaiting Admin Approval</h3>
              </div>
              <p className="text-sm text-gray-400">
                Our team will verify your payment within 24 hours. Once approved, you will receive the project files via your dashboard.
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-8 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Project</span>
                <span className="text-white">{project.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-[var(--color-neon-purple)] font-bold">₹{project.price.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">UTR Number</span>
                <span className="text-white font-mono">{utrNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Payment Proof</span>
                <span className="text-green-400">{fileName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-yellow-400 font-semibold">Pending Verification</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1" onClick={onClose}>
                <Button variant="secondary" size="lg" fullWidth>
                  Go to Dashboard
                </Button>
              </Link>
              <Button size="lg" className="flex-1" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : step === "uploading" ? (
          /* UPLOADING STATE */
          <div className="p-8 md:p-10 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 rounded-full border-3 border-[var(--color-neon-blue)] border-t-transparent animate-spin mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-sm text-gray-400 text-center">Uploading screenshot and verifying UTR {utrNumber}...</p>
          </div>
        ) : (
          /* CHECKOUT STATE */
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Secure Checkout</h2>
                <p className="text-xs text-gray-400">Purchasing as {user.name} ({user.email})</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Summary</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">{project.title}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">By: EduNova Team</span>
                <span className="text-xs text-gray-500 capitalize">{project.category}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="text-sm font-semibold text-gray-300">Total</span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">
                  ₹{project.price.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* UPI Payment Section */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[var(--color-neon-blue)]" /> Pay via UPI
              </h3>

              {/* QR Code */}
              <div className="w-44 h-44 mx-auto mb-4 rounded-xl bg-white p-2.5 flex items-center justify-center shadow-lg border border-white/20">
                <img
                  src={getEffectiveQrCodeUrl(project.price)}
                  alt="UPI QR Code"
                  className="w-full h-full rounded-lg object-contain"
                />
              </div>

              <p className="text-center text-xs text-gray-400 mb-2">Scan QR or pay to UPI ID:</p>
              <div className="text-center mb-4">
                <span className="inline-block px-4 py-2 rounded-lg bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] font-mono text-sm font-bold select-all">
                  {getPlatformSettings().upiId || "edunova@paytm"}
                </span>
              </div>

              {/* Amount to pay */}
              <div className="rounded-lg bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30 p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Amount to Pay</p>
                <p className="text-xl font-black text-[var(--color-neon-purple)]">₹{project.price.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* UTR Number Input */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--color-neon-purple)]" /> UTR / Transaction Number
              </h3>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (errors.utr) setErrors(prev => ({ ...prev, utr: undefined }));
                }}
                placeholder="Enter your UTR or transaction reference number"
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder-gray-500 focus:outline-none transition-colors ${
                  errors.utr
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/10 focus:border-[var(--color-neon-blue)]/50"
                }`}
              />
              {errors.utr && (
                <p className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.utr}
                </p>
              )}
              <p className="text-[10px] text-gray-600 mt-2">You can find UTR on your UPI app under transaction details</p>
            </div>

            {/* Upload Payment Screenshot */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--color-neon-purple)]" /> Upload Payment Proof
              </h3>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {filePreview ? (
                <div className="relative">
                  <img
                    src={filePreview}
                    alt="Payment screenshot"
                    className="w-full max-h-48 object-contain rounded-xl border border-white/10"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-green-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview(null);
                        setFileName(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full py-7 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center gap-2 cursor-pointer group ${
                    isDragging ? "border-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10" :
                    errors.screenshot
                      ? "border-red-500/40 hover:border-red-500/60"
                      : "border-white/20 hover:border-[var(--color-neon-blue)]/50"
                  }`}
                >
                  <ImageIcon className={`w-8 h-8 transition-colors ${isDragging ? "text-[var(--color-neon-purple)]" : "text-gray-500 group-hover:text-[var(--color-neon-blue)]"}`} />
                  <p className={`text-sm transition-colors ${isDragging ? "text-[var(--color-neon-purple)]" : "text-gray-400 group-hover:text-gray-300"}`}>
                    {isDragging ? "Drop image here" : "Drag & drop or click to upload payment screenshot"}
                  </p>
                  <p className="text-[10px] text-gray-600">PNG, JPG, WEBP up to 1MB</p>
                </div>
              )}
              {errors.screenshot && (
                <p className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.screenshot}
                </p>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            <div className="mb-5 px-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptedToS}
                    onChange={(e) => {
                      setAcceptedToS(e.target.checked);
                      if (e.target.checked && errors.tos) setErrors(prev => ({ ...prev, tos: undefined }));
                    }}
                    className="w-5 h-5 rounded border border-white/20 bg-white/5 appearance-none cursor-pointer checked:bg-[var(--color-neon-purple)] checked:border-[var(--color-neon-purple)] transition-colors"
                  />
                  {acceptedToS && <CheckCircle className="absolute w-3.5 h-3.5 text-white pointer-events-none" />}
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  I agree to the <Link href="/terms" className="text-white hover:text-[var(--color-neon-purple)] underline decoration-white/30 transition-colors">Terms of Service</Link> and <Link href="/privacy" className="text-white hover:text-[var(--color-neon-purple)] underline decoration-white/30 transition-colors">Privacy Policy</Link>. I understand that all sales are final once digital files are accessed.
                </div>
              </label>
              {errors.tos && (
                <p className="flex items-center gap-1.5 mt-2 text-xs text-red-400 pl-8">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.tos}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={step !== "checkout"}
            >
              <Shield className="w-5 h-5" />
              Submit Payment for Verification
            </Button>

            {/* Trust Badges */}
            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mt-4">
              <Shield className="w-4 h-4" />
              <span>Secure payment • Admin verified • Money-back guarantee</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
