import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import scrappyDriving from "@/assets/scrappy-driving.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const metrics = [
  { title: "75%", subtitle: "Hauler Payout", desc: "You keep the majority. We handle marketing, tech, and payments." },
  { title: "$35", subtitle: "Target CAC", desc: "Our efficient acquisition means more jobs flowing to your truck." },
  { title: "$280", subtitle: "Target LTV", desc: "Repeat customers and corporate contracts build long-term value." },
];

export const HaulersSection = () => (
  <section id="pricing" className="py-32">
    <div className="container">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-primary font-mono text-sm uppercase tracking-widest mb-4"
      >
        For Haulers
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={springBolt}
        className="text-4xl md:text-5xl font-bold mb-8"
      >
        Your truck<span className="text-primary">.</span> Our platform<span className="text-primary">.</span>
      </motion.h2>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-16">
        <p className="text-muted-foreground max-w-lg leading-relaxed">
          Join the KURBR hauler network. Get reliable leads, standard equipment support, and a technology platform built for operators.
        </p>
        <motion.img
          src={scrappyDriving}
          alt="Scrappy driving"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={springBolt}
          className="w-32 h-20 object-contain"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {metrics.map((item, i) => (
          <motion.div
            key={item.subtitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: i * 0.1 }}
            viewport={{ once: true }}
            className="border-milled p-8"
          >
            <p className="text-5xl font-mono font-bold text-primary mb-2">{item.title}</p>
            <p className="font-bold text-sm uppercase tracking-widest mb-3">{item.subtitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ ...springBolt, delay: 0.3 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <Link to="/hauler-onboarding">
          <Button variant="hero" className="gap-2">
            Apply to Haul <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>
);
