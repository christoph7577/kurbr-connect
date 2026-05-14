import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass">
    <div className="container flex items-center justify-between h-16">
      <Link to="/" className="text-xl font-bold tracking-[-0.06em]">
        KURBR<span className="text-primary">.</span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">How it works</a>
        <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Services</a>
        <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Pricing</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/schedule">
          <Button variant="hero">Book Now</Button>
        </Link>
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="text-xs uppercase tracking-widest text-muted-foreground">Admin</Button>
        </Link>
      </div>
    </div>
  </nav>
);
