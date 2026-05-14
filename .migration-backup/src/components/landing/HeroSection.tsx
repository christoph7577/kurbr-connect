import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ETACard } from "@/components/ETACard";
import heroImage from "@/assets/hero-industrial.jpg";
import scrappyMain from "@/assets/scrappy-main.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

export const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-16">
    <div
      className="absolute inset-0 z-0 opacity-20"
      style={{ backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
    />
    <div className="absolute inset-0 z-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
    <div className="container relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <img src={scrappyMain} alt="Scrappy the KURBR mascot" className="w-10 h-10 object-contain" />
            <p className="text-primary font-mono text-sm uppercase tracking-widest">On-demand junk removal</p>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springBolt, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-8"
          >
            CLEAR YOUR
            <br />
            CURB<span className="text-primary">.</span>
            <br />
            <span className="text-muted-foreground">CLAIM YOUR</span>
            <br />
            SPACE<span className="text-primary">.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springBolt, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed"
          >
            Instant quotes. Vetted haulers. Real-time tracking. 
            The junk removal marketplace that moves at your speed.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: 0.3 }}
            className="flex gap-4"
          >
            <Link to="/schedule">
              <Button variant="hero" className="gap-2">
                Get Instant Quote <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/tracking">
              <Button variant="outline" size="lg">
                Track a Job
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-8 mt-16"
          >
            {[
              { value: "42.4s", label: "Avg Handoff" },
              { value: "$180", label: "Avg Job Value" },
              { value: "25%", label: "Commission" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-mono font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springBolt, delay: 0.2 }}
          className="hidden lg:block"
        >
          <ETACard />
        </motion.div>
      </div>
    </div>
  </section>
);
