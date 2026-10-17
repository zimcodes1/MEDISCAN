import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  useEffect(() => {
    document.title = "Registration received - Mediscan AI";
  }, []);

  const steps = [
    {
      title: "An administrator reviews your request",
      hint: "Accounts are approved manually",
    },
    {
      title: "Your account is approved",
      hint: "Until then you cannot sign in",
    },
    {
      title: "Sign in",
      hint: "Use the email and password you just registered with",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-brand-card rounded-3xl border border-brand-border p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-linear-to-br from-brand-primary to-brand-secondary">
                <Clock className="text-brand-bg" size={44} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-brand-text">
              Registration received
            </h1>
            <div className="text-brand-text space-y-2">
              {email && (
                <p className="font-semibold text-brand-primary break-all">
                  {email}
                </p>
              )}
              <p className="text-sm leading-relaxed">
                An administrator must approve your account before you can sign
                in.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={s.title} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-brand-primary text-brand-bg rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-brand-text">{s.title}</p>
                  <p className="text-sm text-[#8c91a8]">{s.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full text-brand-bg bg-linear-to-r from-brand-primary to-brand-secondary cursor-pointer py-3 rounded-xl font-semibold text-sm"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
