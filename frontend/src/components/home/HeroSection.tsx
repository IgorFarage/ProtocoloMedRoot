import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] flex items-center bg-gradient-to-br from-primary/10 to-secondary">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center py-20">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Recupere seus cabelos com confiança
          </h1>
          <p className="text-lg text-muted-foreground">
            Tratamento capilar personalizado, prescrito por especialistas. 100% online com acompanhamento médico contínuo.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-primary w-5 h-5" />
              <span className="text-foreground">Avaliação médica especializada</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="text-primary w-5 h-5" />
              <span className="text-foreground">Medicação entregue em casa</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="text-primary w-5 h-5" />
              <span className="text-foreground">Acompanhamento contínuo</span>
            </div>
          </div>
          <div className="flex justify-center my-8">
            <Link to="/questionario">
              <Button size="lg" className="text-lg px-8 py-6 h-auto">
                Começar avaliação
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroImage}
            alt="Clínica moderna de tratamento capilar"
            className="rounded-2xl shadow-2xl w-full"
          />
        </div>
      </div>
    </section>
  );
};
