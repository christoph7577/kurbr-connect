import scrappyMain from "@/assets/scrappy-main.png";

export const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <img src={scrappyMain} alt="Scrappy" className="w-8 h-8 object-contain" />
        <p className="text-xl font-bold tracking-[-0.06em]">
          KURBR<span className="text-primary">.</span>
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        © 2026 KURBR. Clear your curb. Claim your space.
      </p>
      <p className="text-xs text-muted-foreground font-mono">
        chrisbclayton@gmail.com
      </p>
    </div>
  </footer>
);
