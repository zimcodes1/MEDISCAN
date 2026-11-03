import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, StopCircle } from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import { loginUser } from "../lib/auth";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import { needsOnboarding } from "../lib/onboarding";

/** Turn the backend's sign-in refusal into a message that says what to do next. */
function describeLoginError(err: unknown): string {
  const e = err as { message?: string; status?: number } | null;
  const msg = e?.message ?? "";
  if (/suspend/i.test(msg)) {
    return "Your organisation has been suspended, so nobody in it can sign in. Contact MediScan support to restore access.";
  }
  if (/pending|not (yet )?approved|awaiting|approval/i.test(msg)) {
    return "Your account is waiting for approval. You can sign in once your organisation or administrator has approved it.";
  }
  if (e?.status === 401) return "Incorrect email or password.";
  return msg || "Sign in failed";
}

export default function LoginPage() {
  //Set Previous page for the 404 back button handler to check
  sessionStorage.setItem("lastPage", window.location.href);
  // Set Page Title
  useEffect(() => {
    document.title = "Login - Mediscan AI";
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { refetch } = useAuth();
  const { add } = useNotifications();
  // ProtectedRoute passes where the user was headed in location.state.from
  const routeState = location.state as {
    from?: { pathname: string };
    message?: string;
  } | null;
  const from = routeState?.from?.pathname ?? "/dashboard";
  const notice = routeState?.message;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser({ email, password });
      // load the user into AuthContext first, or ProtectedRoute bounces us back here
      const me = await refetch();
      add({
        id: String(Date.now()),
        message: "Signed in successfully",
        read: false,
        time: new Date().toISOString(),
      });
      // a new admin finishes their organisation setup first
      navigate(me && needsOnboarding(me) ? "/onboarding" : from, {
        replace: true,
      });
    } catch (err: unknown) {
      setError(describeLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md pb-10 pt-5">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#7bd0ff] hover:text-[#5db8ff] mb-8"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {/* Login Card */}
        <div className="glass-card bg-brand-card rounded-2xl border border-brand-border p-6 sm:p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#dce1fb]">Welcome Back</h1>
            <p className="text-[#dce1fb]">Sign in to Mediscan</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {notice && !error && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 flex gap-2 rounded-xl p-4">
                <CheckCircle className="text-emerald-400 shrink-0" size={20} />
                <p className="text-emerald-300 text-sm">{notice}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-500 flex gap-2 bg-opacity-20 rounded-xl p-4">
                <StopCircle className="text-white" size={20} />
                <p className="text-white text-sm">{error}</p>
              </div>
            )}
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#dce1fb]"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#151b2d] border border-brand-border text-brand-text placeholder-brand-text-muted rounded-lg focus:outline-none focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#dce1fb]"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-sm text-[#7bd0ff] hover:text-[#5db8ff]"
                >
                  Forgot password?
                </a>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#151b2d] border border-brand-border text-brand-text placeholder-brand-text-muted rounded-lg focus:outline-none focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                required
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 bg-[#151b2d] border border-[#2e3447] text-[#7bd0ff] rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-[#dce1fb]">
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e3447]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-brand-card text-[#8c91a8]">Or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-[#dce1fb]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#7bd0ff] hover:text-[#5db8ff] font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </div>

          {/* Disclaimer */}
          <div className="pt-6 border-t border-[#2e3447]">
            <p className="text-xs text-[#8c91a8] text-center leading-relaxed">
              By signing in, you agree to our{" "}
              <a href="#" className="text-[#7bd0ff] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#7bd0ff] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
