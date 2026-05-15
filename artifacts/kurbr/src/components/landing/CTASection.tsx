import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import scrappyWaving from "@/assets/scrappy-waving.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

export const CTASection = () => (
  <section className="py-32 bg-primary relative overflow-hidden">
    <motion.img
      src={scrappyWaving}
      alt="Scrappy waving"
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 0.15, x: 0 }}
      transition={springBolt}
      className="absolute right-0 bottom-0 h-72 w-auto object-contain object-bottom pointer-events-none select-none"
    />
    <div className="container text-center relative z-10">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={springBolt}
        className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6"
      >
        Ready to clear the curb?
      </motion.h2>
      <p className="text-primary-foreground/70 mb-10 max-w-md mx-auto">
        Book your first pickup in under 60 seconds. Launching in Utah's Wasatch Front.
      </p>
      <Link to="/schedule">
        <Button variant="outline" size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-none font-bold uppercase tracking-widest text-xs h-12 px-10">
          Book Now <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  </section>
);
