import { motion } from "framer-motion";
import { ArrowRight, Clock, Shield, Zap, Truck, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ETACard } from "@/components/ETACard";
import heroImage from "@/assets/hero-industrial.jpg";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
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

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springBolt, delay: 0 }}
                className="text-primary font-mono text-sm uppercase tracking-widest mb-6"
              >
                On-demand junk removal
              </motion.p>
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

      {/* How It Works */}
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
            {[
              { icon: MapPin, step: "01", title: "SNAP & SUBMIT", desc: "Photo your junk. Get an instant algorithmic quote in seconds." },
              { icon: Zap, step: "02", title: "MATCH & DISPATCH", desc: "We pair you with the nearest vetted hauler. Average match: 3.2 min." },
              { icon: Truck, step: "03", title: "TRACK & CLEAR", desc: "Live GPS tracking. Know exactly when your hauler arrives." },
              { icon: CreditCard, step: "04", title: "PAY & DONE", desc: "Seamless auto-pay. Transparent pricing. No surprise fees." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ ...springBolt, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card p-8 group hover:bg-secondary/50 transition-colors"
              >
                <p className="font-mono text-primary text-sm mb-6">{item.step}</p>
                <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                <h3 className="font-bold text-sm uppercase tracking-widest mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-32 bg-card">
        <div className="container">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-primary font-mono text-sm uppercase tracking-widest mb-4"
          >
            Services
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={springBolt}
            className="text-4xl md:text-5xl font-bold mb-20"
          >
            What we haul<span className="text-primary">.</span>
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "RESIDENTIAL", desc: "Furniture, appliances, yard waste, renovation debris. Full house cleanouts.", price: "From $89" },
              { title: "COMMERCIAL", desc: "Office furniture, equipment, construction materials. Scheduled recurring service.", price: "Custom quote" },
              { title: "SPECIALTY", desc: "E-waste recycling, donation pickups, hazardous materials coordination.", price: "From $120" },
            ].map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ ...springBolt, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="border-milled p-8 bg-background hover:border-primary transition-colors group"
              >
                <h3 className="font-bold text-sm uppercase tracking-widest mb-4">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{service.desc}</p>
                <p className="font-mono text-primary text-lg">{service.price}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Unit Economics */}
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
          <p className="text-muted-foreground max-w-lg mb-16 leading-relaxed">
            Join the KURBR hauler network. Get reliable leads, standard equipment support, and a technology platform built for operators.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "75%", subtitle: "Hauler Payout", desc: "You keep the majority. We handle marketing, tech, and payments." },
              { title: "$35", subtitle: "Target CAC", desc: "Our efficient acquisition means more jobs flowing to your truck." },
              { title: "$280", subtitle: "Target LTV", desc: "Repeat customers and corporate contracts build long-term value." },
            ].map((item, i) => (
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-primary">
        <div className="container text-center">
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

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xl font-bold tracking-[-0.06em]">
            KURBR<span className="text-primary">.</span>
          </p>
          <p className="text-sm text-muted-foreground">
            © 2026 KURBR. Clear your curb. Claim your space.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            chrisbclayton@gmail.com
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
