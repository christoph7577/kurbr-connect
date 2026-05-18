import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";

const SignupPage = () => {
  const clerk = useClerk();
  const { isLoaded } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client?.signUp) return;
    setLoading(true);
    try {
      await clerk.client.signUp.create({ emailAddress: email, password });
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const msg =
        (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
        (err as { message?: string })?.message ??
        "Signup failed";
      toast({ title: "Signup failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client?.signUp) return;
    setLoading(true);
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        window.location.href = "/";
      } else {
        toast({ title: "Verification incomplete", description: `Status: ${result.status}`, variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg =
        (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
        (err as { message?: string })?.message ??
        "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <img src={scrappyThumbsup} alt="Scrappy" className="w-16 h-16 mx-auto" />
            <h1 className="text-2xl font-bold tracking-[-0.06em] font-mono">
              KURBR<span className="text-primary">.</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
            </p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                className="bg-secondary border-border font-mono tracking-widest text-center text-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify Email
            </Button>
          </form>
          <button
            onClick={() => setPendingVerification(false)}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-[-0.06em] font-mono">
            KURBR<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
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
                placeholder="Min 8 characters"
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
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
};

export default SignupPage;
