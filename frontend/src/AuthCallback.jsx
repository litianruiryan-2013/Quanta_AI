import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import QuantaLoader from "./components/QuantaLoader.jsx";

export default function AuthCallback() {
  const { session } = useAuth();
  const navigate    = useNavigate();

  // Navigate to app once the PKCE code exchange completes and session is set.
  useEffect(() => {
    if (session) navigate("/app/strategy", { replace: true });
  }, [session, navigate]);

  // Fallback: if something goes wrong, send the user home after 8 s.
  useEffect(() => {
    const t = setTimeout(() => navigate("/", { replace: true }), 8000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-ink-950">
      <QuantaLoader size="md" label="Completing sign-in…" />
    </div>
  );
}
