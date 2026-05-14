import { motion } from "framer-motion";
import { MapPin, Zap, Truck, CreditCard } from "lucide-react";
import scrappyClipboard from "@/assets/scrappy-clipboard.png";
import scrappyDriving from "@/assets/scrappy-driving.png";
import scrappyLifting from "@/assets/scrappy-lifting.png";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const steps = [
  { icon: MapPin, step: "01", title: "SNAP & SUBMIT", desc: "Photo your junk. Get an instant algorithmic quote in seconds.", mascot: scrappyClipboard },
  { icon: Zap, step: "02", title: "MATCH & DISPATCH", desc: "We pair you with the nearest vetted hauler. Average match: 3.2 min.", mascot: scrappyDriving },
  { icon: Truck, step: "03", title: "TRACK & CLEAR", desc: "Live GPS tracking. Know exactly when your hauler arrives.", mascot: scrappyLifting },
  { icon: CreditCard, step: "04", title: "PAY & DONE", desc: "Seamless auto-pay. Transparent pricing. No surprise fees.", mascot: scrappyThumbsup },
];

export const HowItWorks = () => (
  <section id="how-it-works" className="py-32">
    <div className="container">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-primary font-mono text-sm uppercase tracking-widest mb-4"
      >
        Process
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={springBolt}
        className="text-4xl md:text-5xl font-bold mb-20"
      >
        Arrival is a metric<span className="text-primary">.</span>
        <br />
        <span className="text-muted-foreground">Master it.</span>
      </motion.h2>

      <div className="grid md:grid-cols-4 gap-px bg-border">
        {steps.map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: i * 0.1 }}
            viewport={{ once: true }}
            className="bg-card p-8 group hover:bg-secondary/50 transition-colors relative overflow-hidden"
          >
            <p className="font-mono text-primary text-sm mb-6">{item.step}</p>
            <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
            <h3 className="font-bold text-sm uppercase tracking-widest mb-3">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
            <img
              src={item.mascot}
              alt={`Scrappy ${item.title}`}
              className="w-16 h-16 object-contain opacity-30 group-hover:opacity-60 transition-opacity absolute bottom-3 right-3"
            />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
