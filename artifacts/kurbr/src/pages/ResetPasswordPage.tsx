import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const ResetPasswordPage = () => {
  const clerk = useClerk();
  const { isLoaded } = useUser();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client?.signIn) return;
    setLoading(true);
    try {
      const result = await clerk.client.signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        window.location.href = "/";
      } else {
        toast({ title: "Could not reset password", description: `Status: ${result.status}`, variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg =
        (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
        (err as { message?: string })?.message ??
        "Failed to reset password";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-[-0.06em] font-mono">New Password</h1>
          <p className="text-muted-foreground text-sm">Enter the code from your email and your new password</p>
        </div>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Reset Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="bg-secondary border-border font-mono tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-secondary border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !isLoaded}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </form>
        <Link to="/login" className="block text-center text-sm text-primary hover:underline">Back to login</Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
