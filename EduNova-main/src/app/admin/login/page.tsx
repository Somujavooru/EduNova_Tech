"use client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { FormEvent, useState, useEffect } from "react";
import { Shield, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const error = await login(email, password);
    if (error) {
      setError(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 md:px-8 xl:px-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] flex items-center justify-center shadow-[0_0_30px_rgba(176,38,255,0.4)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-glow">Admin Portal</h1>
          <p className="text-gray-400">Secure access for EduNova management</p>
        </div>

        <Card glowOnHover>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Admin Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors" 
                placeholder="admin@edunova.com" 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors" 
                placeholder="••••••••" 
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button type="submit" size="lg" fullWidth className="mt-4" disabled={isLoading}>
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? "Authenticating..." : "Access Dashboard"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
