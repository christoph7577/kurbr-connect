import { useClerk } from "@clerk/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ForgotPasswordPage = () => {
  const clerk = useClerk();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await clerk.client.signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { errors?: { longMessage?: string }[]; message?: string })?.errors?.[0]?.longMessage
        ?? (err as { message?: string })?.message
        ?? "Failed to send reset email";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-xl font-bold font-mono">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a
            password reset code. Enter it on the next page.
          </p>
          <Link to="/reset-password">
            <Button className="w-full">Enter Reset Code</Button>
          </Link>
          <Link to="/login" className="block text-sm text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-[-0.06em] font-mono">Reset Password</h1>
          <p className="text-muted-foreground text-sm">Enter your email to receive a reset code</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send Reset Code
          </Button>
        </form>
        <Link to="/login" className="block text-center text-sm text-primary hover:underline">Back to login</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
