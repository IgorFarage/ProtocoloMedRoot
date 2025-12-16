import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary/80">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground">
            Pronto para recuperar sua confiança?
          </h2>
          <p className="text-xl text-primary-foreground/90">
            Comece sua avaliação gratuita agora e receba seu plano de tratamento personalizado
          </p>
          <Link to="/questionario" className="inline-block mt-8">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 h-auto group"
            >
              Iniciar avaliação gratuita
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-sm text-primary-foreground/70">
            ⏱️ Leva apenas 3 minutos • 🔒 100% confidencial
          </p>
        </div>
      </div>
    </section>
  );
};
