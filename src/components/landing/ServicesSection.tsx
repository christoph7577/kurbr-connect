import { motion } from "framer-motion";
import scrappyLifting from "@/assets/scrappy-lifting.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const services = [
  { title: "RESIDENTIAL", desc: "Furniture, appliances, yard waste, renovation debris. Full house cleanouts.", price: "From $89" },
  { title: "COMMERCIAL", desc: "Office furniture, equipment, construction materials. Scheduled recurring service.", price: "Custom quote" },
  { title: "SPECIALTY", desc: "E-waste recycling, donation pickups, hazardous materials coordination.", price: "From $120" },
];

export const ServicesSection = () => (
  <section id="services" className="py-32 bg-card">
    <div className="container">
      <div className="flex items-end justify-between mb-20">
        <div>
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
            className="text-4xl md:text-5xl font-bold"
          >
            What we haul<span className="text-primary">.</span>
          </motion.h2>
        </div>
        <motion.img
          src={scrappyLifting}
          alt="Scrappy lifting"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={springBolt}
          className="hidden md:block w-24 h-24 object-contain"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {services.map((service, i) => (
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
);
