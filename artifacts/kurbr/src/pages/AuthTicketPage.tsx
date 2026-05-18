import { useClerk, useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const AuthTicketPage = () => {
  const clerk = useClerk();
  const { isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !clerk.client?.signIn) return;
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("ticket");
    if (!ticket) {
      setError("No ticket provided.");
      return;
    }
    (async () => {
      try {
        const result = await clerk.client.signIn.create({ strategy: "ticket", ticket });
        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
          window.location.href = "/";
        } else {
          setError(`Sign-in incomplete: ${result.status}`);
        }
      } catch (err: unknown) {
        const msg =
          (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
          (err as { message?: string })?.message ??
          "Ticket sign-in failed";
        setError(msg);
      }
    })();
  }, [isLoaded, clerk]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        {error ? (
          <>
            <h2 className="text-xl font-bold font-mono text-destructive">Sign-in failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthTicketPage;
