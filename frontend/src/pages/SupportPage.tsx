import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Mail, Phone } from "lucide-react";

// Optional: set these in the frontend's environment (Vercel: Settings, Environment Variables)
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE as string | undefined;

const FAQ: { q: string; a: string }[] = [
  {
    q: "I can't sign in. What should I check?",
    a: "Check your email and password first. A message saying your account is waiting for approval means your organisation admin has not approved you yet. A message saying your organisation is suspended means MediScan has paused it: contact support.",
  },
  {
    q: "I forgot my password.",
    a: "Ask your organisation admin to create a reset link for you under Settings, Staff Management (Reset password), then open the link. If you are the only admin, contact support. If you are signed in, you can change your password under Settings, My Profile.",
  },
  {
    q: "My invitation link doesn't work.",
    a: "Invitation links expire and work once. Ask your admin to delete the old invitation and create a new one under Settings, Staff Management.",
  },
  {
    q: "Who can assign scans to a radiologist?",
    a: "Only organisation admins assign scans. If a scan needs a different radiologist, ask your admin.",
  },
  {
    q: "How do I change my job title or role?",
    a: "Your job title and role are set by your organisation admin, so ask them to update it.",
  },
  {
    q: "The AI result looks wrong.",
    a: "MediScan NG is a decision-support tool. Every result must be reviewed by a qualified radiologist. Report anything that looks off to support, with the scan's patient code and date.",
  },
];

/** /support: where to get help. */
export default function SupportPage() {
  useEffect(() => {
    document.title = "Support - Mediscan AI";
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:pt-10 max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2 flex items-center gap-3">
          <LifeBuoy className="text-brand-primary" size={28} />
          Support
        </h1>
        <p className="text-brand-text-muted text-sm">
          Answers to common questions, and how to reach us.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3">
        <h2 className="text-brand-text font-bold text-sm font-display">
          Contact
        </h2>
        {SUPPORT_EMAIL || SUPPORT_PHONE ? (
          <div className="flex flex-wrap gap-3">
            {SUPPORT_EMAIL && (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-primary/30 text-brand-primary text-sm font-bold hover:bg-brand-primary/10 transition-colors"
              >
                <Mail size={16} />
                {SUPPORT_EMAIL}
              </a>
            )}
            {SUPPORT_PHONE && (
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-primary/30 text-brand-primary text-sm font-bold hover:bg-brand-primary/10 transition-colors"
              >
                <Phone size={16} />
                {SUPPORT_PHONE}
              </a>
            )}
          </div>
        ) : (
          <p className="text-brand-text-muted text-sm">
            For account, role or access problems, contact your organisation
            admin. They can manage staff under{" "}
            <Link to="/settings" className="text-brand-primary underline">
              Settings
            </Link>
            .
          </p>
        )}
      </div>

      <div className="glass-panel rounded-2xl divide-y divide-brand-border/30">
        {FAQ.map((item) => (
          <details key={item.q} className="group p-4 sm:px-6">
            <summary className="cursor-pointer list-none text-brand-text text-sm font-semibold flex items-center justify-between gap-4">
              {item.q}
              <span className="text-brand-text-muted text-lg leading-none group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="text-brand-text-muted text-sm mt-3 leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
