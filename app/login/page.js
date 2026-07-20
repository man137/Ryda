// app/login/page.js

"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import {
  ArrowLeft,
  Car,
  Eye,
  EyeOff,
  User,
  Truck,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const VIEWS = {
  LOGIN: "login",
  FORGOT_PASSWORD: "forgotPassword",
};

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("user");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(VIEWS.LOGIN);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSubmitting(true);
    setMessage("");
    setMessageType("");

    try {
      const email = e.target.email.value;
      const password = e.target.password.value;

      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }

      const result = await signIn("credentials", {
        email,
        password,
        accountType,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        setMessage("Login successful!");
        setMessageType("success");

        const session = await getSession();

        let redirectUrl = "/";
        if (accountType === "driver") {
          const driverId = session?.user?.id;
          if (!driverId) {
            throw new Error("Driver ID not found in session");
          }
          redirectUrl = `/drivers/${driverId}`;
        }

        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 500);
      }

    } catch (error) {
      console.error("Login error:", error);
      setMessage(error.message || "Login failed. Please try again.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSubmitting(true);
    setMessage("");
    setMessageType("");

    try {
      const email = e.target.email.value;

      if (!email) {
        throw new Error("Please enter your email address.");
      }

      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          accountType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to initiate password reset.");
      }

      setMessage(
        result.message ||
          "Password reset link sent! Check your email."
      );
      setMessageType("success");

    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage(
        error.message ||
          "Could not process request. Please check your email and try again."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const AccountTypeToggle = (
    <div className="flex gap-1.5 mb-8 bg-gray-100 p-1.5 rounded-xl">
      <button
        type="button"
        onClick={() => {
          setAccountType("user");
          setMessage("");
        }}
        className={`flex-1 py-2.5 px-4 rounded-lg transition-all duration-200 font-semibold text-sm ${
          accountType === "user"
            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <User className="h-4 w-4" />
          Passenger
        </div>
      </button>
      <button
        type="button"
        onClick={() => {
          setAccountType("driver");
          setMessage("");
        }}
        className={`flex-1 py-2.5 px-4 rounded-lg transition-all duration-200 font-semibold text-sm ${
          accountType === "driver"
            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Truck className="h-4 w-4" />
          Driver
        </div>
      </button>
    </div>
  );

  const MessageDisplay = (
    message && (
      <div
        className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
          messageType === "success"
            ? "badge-success"
            : "badge-error"
        }`}
      >
        {messageType === "success" ? (
          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        )}
        <span>{message}</span>
      </div>
    )
  );

  const LoginForm = (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-1.5">Welcome back</h1>
        <p className="text-gray-500 font-medium">Log in to your account</p>
      </div>

      {MessageDisplay}
      {AccountTypeToggle}

      <form onSubmit={handleLoginSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700">
            Email Address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            className="w-full input-light px-4 py-3.5 text-sm"
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2 relative">
          <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            className="w-full input-light px-4 py-3.5 pr-12 text-sm"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setViewMode(VIEWS.FORGOT_PASSWORD);
              setMessage("");
            }}
            className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-accent w-full py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent"></div>
              Logging in...
            </>
          ) : (
            "Log In"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-gray-500 font-medium">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-gray-900 font-bold hover:underline ml-1">
            Sign up
          </Link>
        </p>
      </div>
    </>
  );

  const ForgotPasswordForm = (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent text-glow mb-2">
          Reset Password
        </h1>
        <p className="text-slate-400 font-medium">
          Enter your email to receive a reset link
        </p>
      </div>

      {MessageDisplay}
      {AccountTypeToggle}

      <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-slate-300 ml-1"
          >
            Email Address
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            className="w-full px-4 py-3.5 bg-[#050b14]/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-500 transition-all shadow-inner"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg glow-emerald active:scale-[0.98] font-bold text-lg flex items-center justify-center gap-2 group before:absolute before:inset-0 before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Sending Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </span>
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 text-center">
        <button
          type="button"
          onClick={() => {
            setViewMode(VIEWS.LOGIN);
            setMessage("");
          }}
          className="text-emerald-400 font-medium hover:text-emerald-300 hover:underline transition-colors flex items-center justify-center gap-2 mx-auto group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>
      </div>
    </>
  );

  return (
    <div className="font-sans w-screen min-h-screen overflow-hidden bg-[#f7f8fa] text-gray-900 flex flex-col">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#f7f8fa]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-yellow-100/60 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-50/60 blur-[80px]" />
      </div>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50" style={{boxShadow: 'var(--shadow-sm)'}}>
        <div className="container mx-auto flex items-center p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
          <div className="mx-auto flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 bg-black rounded-xl">
              <i className="text-xl text-yellow-400 ri-taxi-line" aria-hidden="true"></i>
            </div>
            <span className="font-black text-2xl text-gray-900 tracking-tight">Ryda</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md mx-auto card-float p-8 min-h-[450px]">
          {viewMode === VIEWS.LOGIN && LoginForm}
          {viewMode === VIEWS.FORGOT_PASSWORD && ForgotPasswordForm}
        </div>
      </main>
    </div>
  );
}
