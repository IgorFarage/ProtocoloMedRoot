import { Shield, Clock, Users, Award, CheckCircle2 } from "lucide-react";

// Aqui definimos as classes EXPLICITAMENTE para o Tailwind não remover (purge)
const benefits = [
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Protocolos aprovados pela ANVISA e validados por dermatologistas.",
    // Cor do fundo da "bolha" decorativa
    bgClass: "bg-blue-500",
    // Classe exata que pinta o fundo do ícone no hover
    hoverClass: "group-hover:bg-blue-500"
  },
  {
    icon: Clock,
    title: "Resultados Ágeis",
    description: "Evolução visível a partir do 3º mês com consistência no uso.",
    bgClass: "bg-green-500",
    hoverClass: "group-hover:bg-green-500"
  },
  {
    icon: Users,
    title: "Suporte Médico",
    description: "Acompanhamento contínuo via telemedicina durante todo o processo.",
    bgClass: "bg-indigo-500",
    hoverClass: "group-hover:bg-indigo-500"
  },
  {
    icon: Award,
    title: "Alta Eficácia",
    description: "Milhares de pacientes recuperados com taxa de aprovação de 98%.",
    bgClass: "bg-purple-500",
    hoverClass: "group-hover:bg-purple-500"
  }
];

export const BenefitsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto px-4 relative">

        {/* Fundo Decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl -z-10" />

        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <CheckCircle2 className="w-4 h-4" />
            <span>Excelência Clínica</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-6">
            Ciência a favor do seu <span className="text-primary relative inline-block">
              cabelo
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Nossa abordagem une a precisão da medicina com a tecnologia farmacêutica mais avançada.
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              // Card Container
              className="group relative bg-white rounded-[2rem] p-8 border border-gray-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gray-200/50 cursor-default overflow-hidden"
            >
              {/* 1. Bolha Gigante de Fundo (Reveal Effect) */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${benefit.bgClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-full -mr-8 -mt-8`} />

              {/* 2. Container do Ícone */}
              <div className="relative mb-8 inline-block">
                <div
                  className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center 
                    bg-gray-50 text-gray-600 shadow-sm
                    transition-all duration-500 ease-out
                    
                    /* Efeitos no Hover: Fundo colorido, texto branco, gira e cresce */
                    ${benefit.hoverClass} 
                    group-hover:text-white 
                    group-hover:scale-110 
                    group-hover:rotate-3 
                    group-hover:shadow-lg
                  `}
                >
                  <benefit.icon className="w-8 h-8 transition-transform duration-500" strokeWidth={1.5} />
                </div>
              </div>

              {/* Texto */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-900 transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-gray-500 leading-relaxed group-hover:text-gray-600">
                  {benefit.description}
                </p>
              </div>

              {/* Barra Inferior Animada */}
              <div className={`absolute bottom-0 left-0 w-0 h-1.5 ${benefit.bgClass} transition-all duration-700 ease-in-out group-hover:w-full`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};