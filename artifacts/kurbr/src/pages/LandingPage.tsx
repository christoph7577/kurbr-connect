import { motion } from "framer-motion";
import { ArrowRight, Clock, Shield, Zap, Truck, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ETACard } from "@/components/ETACard";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { HaulersSection } from "@/components/landing/HaulersSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <ServicesSection />
      <HaulersSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
