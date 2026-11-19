import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader, StopCircle } from "lucide-react";
import { resetPassword } from "../lib/auth";
import { clearAuthTokens } from "../lib/api";

const INPUT =
  "w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 border-brand-border text-brand-text placeholder-[#8c91a8] focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-20 transition-all";

/** /reset-password?token=...: set a new password from a link an admin gave you. */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  // the backend only accepts tokens of 20-200 characters
  const tokenLooksValid = token.length >= 20 && token.length <= 200;

  useEffect(() => {
    document.title = "Reset password - Mediscan AI";
  }, []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkFailed, setLinkFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bytes = new TextEncoder().encode(password).length;
    if (bytes < 10 || bytes > 72) {
      setError("Password must be 10–72 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      // the backend ended every session, so drop any stale tokens in this browser
      clearAuthTokens();
      navigate("/login", {
        replace: true,
        state: { message: "Password updated. Sign in with your new password." },
      });
    } catch (err) {
      const e2 = err as { message?: string; status?: number };
      if (e2.status === 404) setLinkFailed(true); // unknown, used or expired
      else setError(e2.message || "Could not reset the password");
    } finally {
      setLoading(false);
    }
  }

  const brokenLink = !tokenLooksValid || linkFailed;

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-[#7bd0ff] hover:text-[#5db8ff] mb-6"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="bg-brand-card rounded-3xl border border-brand-border p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-brand-text mb-2">
            {brokenLink ? "Link not valid" : "Set a new password"}
          </h1>

          {brokenLink ? (
            <div className="space-y-4">
              <p className="text-[#dce1fb] text-sm">
                This reset link is invalid, already used or has expired. Links
                work once and expire quickly.
              </p>
              <p className="text-[#8c91a8] text-sm">
                Ask your organisation admin to create a new one for you.
              </p>
              <Link
                to="/forgot-password"
                className="block text-center w-full text-brand-bg py-3 rounded-xl font-semibold bg-linear-to-r from-brand-primary to-brand-secondary"
              >
                What do I do now?
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-[#dce1fb] text-sm">
                Choose a new password. You will be signed out everywhere and
                need to sign in again with it.
              </p>

              {error && (
                <div className="bg-red-500/20 flex gap-2 rounded-xl p-4">
                  <StopCircle className="text-white shrink-0" size={20} />
                  <p className="text-white text-sm break-words">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-[#dce1fb]"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="10–72 characters"
                  className={INPUT}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-[#dce1fb]"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={INPUT}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-brand-bg py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-linear-to-r from-brand-primary to-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
