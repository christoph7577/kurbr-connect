import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import scrappyWaving from "@/assets/scrappy-waving.png";

const LoginPage = () => {
  const clerk = useClerk();
  const { isLoaded } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client?.signIn) return;
    setLoading(true);
    try {
      const result = await clerk.client.signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        toast({ title: "Welcome back!" });
        navigate("/");
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: { longMessage?: string }[]; message?: string })?.errors?.[0]?.longMessage
        ?? (err as { message?: string })?.message
        ?? "Login failed";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src={scrappyWaving} alt="Scrappy mascot" className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-bold tracking-[-0.06em] font-mono">
            KURBR<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
            Sign In
          </Button>
        </form>

        <div className="text-center space-y-2 text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline block">
            Forgot password?
          </Link>
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
