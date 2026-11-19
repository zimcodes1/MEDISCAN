import { Search, Bell, HelpCircle, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import NotificationsPanel from "./NotificationsPanel";
import { useAuth } from "../contexts/AuthContext";
import { useOrg } from "../contexts/OrgContext";
import { useNotifications } from "../contexts/NotificationsContext";
import Avatar from "./Avatar";
import OrgLogo from "./OrgLogo";

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  const { org } = useOrg();
  const { unreadCount } = useNotifications();
  const orgName = org?.name ?? user?.organisation.name ?? "";
  const [showNotifications, setShowNotifications] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);
  return (
    <header className="h-16 bg-brand-bg/85 backdrop-blur-md border-b border-brand-border/40 flex items-center justify-between px-4 sm:px-6 fixed top-0 sm:left-64 right-0 z-10 transition-all duration-300 print:hidden">
      <button
        onClick={onMenuClick}
        className="sm:hidden p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-brand-primary text-brand-text-muted transition-all duration-300 active:scale-95"
      >
        <Menu size={16} />
      </button>
      {/* Search Bar */}
      <div className="max-sm:mx-2 flex items-center gap-2.5 flex-1 sm:max-w-sm bg-brand-card/60 border border-brand-border/60 px-4 py-2 rounded-xl focus-within:border-brand-primary/50 focus-within:bg-brand-card transition-all duration-300 group">
        <Search
          size={16}
          className="text-brand-text-muted group-focus-within:text-brand-primary transition-colors"
        />
        <input
          type="text"
          placeholder="Search patients or scans..."
          className="bg-transparent text-brand-text text-sm placeholder-brand-text-muted outline-none w-full"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setShowNotifications((s) => !s)}
            className="relative p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-brand-primary text-brand-text-muted transition-all duration-300 active:scale-95"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,210,255,0.5)]" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2">
              <NotificationsPanel />
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/support")}
          title="Support"
          aria-label="Support"
          className="max-sm:hidden p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-brand-primary text-brand-text-muted transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <HelpCircle size={16} />
        </button>

        {/* Organisation */}
        {orgName && (
          <div className="hidden md:flex items-center gap-2.5 max-w-[14rem]">
            <OrgLogo url={org?.logo_url} name={orgName} className="w-8 h-8 text-sm" />
            <p className="text-brand-text text-xs font-bold truncate">{orgName}</p>
          </div>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 sm:ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-brand-text text-sm font-bold">
              {user?.full_name ?? ""}
            </p>
            <p className="text-brand-text-muted text-[9px] font-bold uppercase tracking-wider">
              {user?.role ?? ""}
            </p>
          </div>

          <Avatar
            url={user?.avatar_url}
            name={user?.full_name ?? ""}
            className="w-10 h-10 shadow-[0_0_15px_rgba(0,210,255,0.1)]"
          />

          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-rose-400 text-brand-text-muted transition-all duration-300 active:scale-95"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
