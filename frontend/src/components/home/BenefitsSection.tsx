import { Shield, Clock, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: Shield,
    title: "Tratamento seguro",
    description: "Medicamentos aprovados e prescritos por tricologista e nutricionista certificados"
  },
  {
    icon: Clock,
    title: "100% online",
    description: "Consulta, prescrição e entrega sem sair de casa"
  },
  {
    icon: Users,
    title: "Diversos pacientes",
    description: "Milhares de pessoas já recuperaram seus cabelos conosco"
  },
  {
    icon: Award,
    title: "Resultados comprovados",
    description: "Acompanhamento profissional em cada etapa do tratamento"
  }
];

export const BenefitsSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Por que escolher a PROTOCOLO MED?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tratamento capilar completo com acompanhamento médico especializado
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
