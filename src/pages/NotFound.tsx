import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import scrappyWaving from "@/assets/scrappy-waving.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <img src={scrappyWaving} alt="Scrappy waving" className="w-32 h-32 object-contain mx-auto mb-8" />
        <h1 className="mb-2 text-6xl font-mono font-bold text-primary">404</h1>
        <p className="mb-2 text-2xl font-bold">Wrong curb!</p>
        <p className="mb-8 text-muted-foreground font-mono text-sm">
          Scrappy couldn't find this page. Let's get you back on route.
        </p>
        <Link to="/">
          <Button variant="hero">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
