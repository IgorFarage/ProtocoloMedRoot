import resultsImage from "@/assets/results-image.jpg";

export const ResultsSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resultados Reais
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Veja as transformações de nossos pacientes com tratamento personalizado
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <img
            src={resultsImage}
            alt="Resultados antes e depois do tratamento capilar"
            className="rounded-2xl shadow-xl w-full"
          />

          <div className="mt-12 text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Mais de <strong className="text-primary">90%</strong> dos nossos pacientes relatam melhora significativa em 6 meses
            </p>
            <div className="flex justify-center gap-8 flex-wrap">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Diversos</div>
                <div className="text-sm text-muted-foreground">Pacientes Tratados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">4.8/5</div>
                <div className="text-sm text-muted-foreground">Avaliação Média</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground">Recomendam</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
