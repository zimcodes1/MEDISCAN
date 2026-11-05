import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;

/** /forgot-password: resets are issued by an admin, so this explains how to get one. */
export default function ForgotPasswordPage() {
  useEffect(() => {
    document.title = "Forgot password - Mediscan AI";
  }, []);

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

        <div className="bg-brand-card rounded-3xl border border-brand-border p-6 sm:p-8 space-y-5">
          <div className="w-12 h-12 bg-linear-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center">
            <KeyRound className="text-brand-bg" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-brand-text">
            Forgot your password?
          </h1>
          <p className="text-[#dce1fb] text-sm">
            Password resets are handled by your organisation admin. No email is
            sent.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[#dce1fb] text-sm">
            <li>Ask your admin to open Settings, then Staff Management.</li>
            <li>They press Reset password next to your name and send you the link.</li>
            <li>Open the link and choose a new password. It works once and expires soon.</li>
          </ol>
          <p className="text-[#8c91a8] text-sm">
            Are you the only admin, or can't reach one?{" "}
            {SUPPORT_EMAIL ? (
              <>
                Email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-[#7bd0ff] underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </>
            ) : (
              "Contact MediScan support."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
