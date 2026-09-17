import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2, ShieldAlert } from "lucide-react";
import aiClubLogo from "@/assets/ai-club-logo.png";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface AuthBarrierProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthBarrier({ children, requireAdmin = false }: AuthBarrierProps) {
  const { isAuthenticated, isAdmin, isLoading, login } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setErrorMsg(null);
    try {
      await login(credentialResponse.credential);
    } catch (err: any) {
      console.error('Failed to sync login:', err);
      setErrorMsg(err.message || 'Unable to connect to the authentication server.');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999] overflow-hidden">
        {/* Futuristic glowing backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img
            src={aiClubLogo}
            alt="AI Club Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-2xl border border-primary/20 animate-bounce"
          />
          <Loader2 className="animate-spin text-primary w-8 h-8 mt-2" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#07090e] flex items-center justify-center p-4 z-[9999] overflow-hidden">
        {/* Abstract animated glowing background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-accent/15 rounded-full blur-[150px] pointer-events-none" />

        {/* Matrix/AI grid style background overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-card/60 backdrop-blur-2xl border border-border/80 rounded-3xl p-8 md:p-10 shadow-2xl overflow-hidden flex flex-col items-center">
          {/* Neon top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Logo container */}
          <div className="relative mb-6">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-accent opacity-50 blur-sm animate-pulse" />
            <img
              src={aiClubLogo}
              alt="AI Club DAU Logo"
              className="relative w-20 h-20 rounded-2xl object-cover border border-border"
            />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground font-display text-center mb-2">
            Welcome to AI Club <span className="text-primary">DAU</span>
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs leading-relaxed">
            Please sign in with your Google account to access events, projects, resources, and the AI chatbot.
          </p>

          {/* Login button container */}
          <div className="w-full flex justify-center py-2 px-1 relative z-10">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg("Google OAuth sign-in failed.")}
              theme="filled_blue"
              size="large"
              shape="pill"
              text="signin_with"
              logo_alignment="left"
            />
          </div>

          {errorMsg && (
            <div className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs max-w-sm animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border/40 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
            <span>🛡️ Secure Authentication</span>
          </div>
        </div>
      </div>
    );
  }

  // Enforce admin check if requested
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
