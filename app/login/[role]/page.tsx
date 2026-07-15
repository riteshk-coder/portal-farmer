"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import { IconPhone, IconLeaf, IconArrowLeft } from "@tabler/icons-react";
import { roleConfig } from "@/lib/auth/roleConfig";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const role = (params.role as string) || "buyer";
  const config = roleConfig[role];
  const registeredEmail = searchParams.get("email") || "";
  
  const { loginAsRole, showToast } = useApp();
  
  const [emailInput, setEmailInput] = useState(registeredEmail);
  const [mobileInput, setMobileInput] = useState("");
  const [loginMethod, setLoginMethod] = useState<"google" | "otp">("google");
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoInput, setShowDemoInput] = useState(false);

  useEffect(() => {
    if (registeredEmail) {
      setEmailInput(registeredEmail);
    }
  }, [registeredEmail]);

  // Initialize and Render Real Google Login Button
  useEffect(() => {
    if (loginMethod !== "google" || showDemoInput) return;

    const initGoogleBtn = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: "694689368383-j7nk5eohial7vhbphamomjtjfdka4apj.apps.googleusercontent.com",
            callback: handleCredentialResponse,
          });

          const buttonParent = document.getElementById("google-signin-btn");
          if (buttonParent) {
            (window as any).google.accounts.id.renderButton(buttonParent, {
              theme: "outline",
              size: "large",
              width: 320,
            });
          }
        } catch (err) {
          console.error("Google Init Error:", err);
        }
      }
    };

    // Poll until Google object is injected on window
    const timer = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).google) {
        initGoogleBtn();
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [loginMethod, showDemoInput]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-s text-tx-s">
        Role not found.
      </div>
    );
  }

  // Google Login Callback (Handles Real Token)
  const handleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/login/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_token: idToken,
          role: role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Google account authentication failed.");
      }

      // Success
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email || "");
      localStorage.setItem("user_position", data.position || "");
      
      // Update AppContext active role
      loginAsRole(role as any);
      showToast(`Welcome back, ${data.name}!`, "success");
      
      // Redirect to role dashboard
      router.push(config.redirectPath);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo Fallback Login Handler
  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert("Please enter your email.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/auth/login/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_token: emailInput.trim(),
          role: role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      // Success
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email || "");
      localStorage.setItem("user_position", data.position || "");
      
      loginAsRole(role as any);
      showToast(`Welcome back, ${data.name}!`, "success");
      router.push(config.redirectPath);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileInput.trim() || mobileInput.trim().length < 10) {
      alert("Please enter a valid mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobileInput.trim(),
          purpose: "login",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP.");
      }

      showToast(`Demo OTP sent successfully! Code: ${data.otp}`, "success");
      router.push(`/verify-otp?mobile=${mobileInput.trim()}&role=${role}&purpose=login`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-s flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Load Google Client SDK */}
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-bg/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-info-bg/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => router.push("/auth")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors mb-6"
        >
          <IconArrowLeft className="w-4 h-4" /> Back to Role Selection
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">
            Sign In as {config.label}
          </h1>
          <p className="text-xs text-tx-s mt-1">Platform Contract Vault Passwordless Authentication</p>
        </div>

        {/* Login Card */}
        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          {/* Tabs switch */}
          <div className="flex bg-bg-s p-1 rounded-lg mb-6">
            <button
              onClick={() => setLoginMethod("google")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                loginMethod === "google"
                  ? "bg-bg-p text-tx-p shadow-sm"
                  : "text-tx-s hover:text-tx-p"
              }`}
            >
              Google Sign-In
            </button>
            <button
              onClick={() => setLoginMethod("otp")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                loginMethod === "otp"
                  ? "bg-bg-p text-tx-p shadow-sm"
                  : "text-tx-s hover:text-tx-p"
              }`}
            >
              <IconPhone className="w-4 h-4" /> Mobile OTP
            </button>
          </div>

          {loginMethod === "google" ? (
            showDemoInput ? (
              <form onSubmit={handleGoogleLogin} className="space-y-4">
                <Input
                  label="Mock Google Email Address"
                  type="email"
                  placeholder="enter email matching registration"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  floating={false}
                  required
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Demo Sign In →"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowDemoInput(false)}
                  className="text-xs text-primary font-bold underline block text-center mx-auto mt-2"
                >
                  Use official Google Account Sign-In
                </button>
              </form>
            ) : (
              <div className="space-y-5 py-4">
                <div className="flex justify-center">
                  <div id="google-signin-btn" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowDemoInput(true)}
                  className="text-xs text-tx-s hover:text-tx-p font-semibold block text-center mx-auto mt-2 transition-colors"
                >
                  Or, use demo email sign-in (testing fallback)
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input
                label="Registered Mobile Number"
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                floating={false}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending code..." : "Request Verification OTP"}
              </Button>
            </form>
          )}

          {role !== "admin" && (
            <div className="text-center mt-6 pt-4 border-t border-bd-t">
              <p className="text-xs text-tx-s">
                New to the platform?{" "}
                <button
                  onClick={() => router.push(`/register/${role}`)}
                  className="font-bold text-primary hover:underline"
                >
                  Register as {config.label}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
