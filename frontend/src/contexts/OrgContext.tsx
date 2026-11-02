import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getOrg,
  getOrgSettings,
  type Organisation,
  type OrgSettings,
} from "../lib/org";

interface OrgContextValue {
  org: Organisation | null;
  /** null when the signed-in role cannot read the settings. */
  settings: OrgSettings | null;
  reload: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  settings: null,
  reload: async () => {},
});

/** The signed-in user's organisation: name and logo for the header and reports, plus its settings. */
export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [org, setOrg] = useState<Organisation | null>(null);
  const [settings, setSettings] = useState<OrgSettings | null>(null);

  const reload = useCallback(async () => {
    const [o, s] = await Promise.allSettled([getOrg(), getOrgSettings()]);
    setOrg(o.status === "fulfilled" ? o.value : null);
    setSettings(s.status === "fulfilled" ? s.value : null);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.allSettled([getOrg(), getOrgSettings()]).then(([o, s]) => {
      if (!active) return;
      setOrg(o.status === "fulfilled" ? o.value : null);
      setSettings(s.status === "fulfilled" ? s.value : null);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // signed out: show nothing, whatever was loaded for the previous user
  const value: OrgContextValue = userId
    ? { org, settings, reload }
    : { org: null, settings: null, reload };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
