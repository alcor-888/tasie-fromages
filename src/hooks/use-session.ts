import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** true = session active, false = déconnecté, null = en cours de résolution */
export function useHasSession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setHasSession(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return hasSession;
}
