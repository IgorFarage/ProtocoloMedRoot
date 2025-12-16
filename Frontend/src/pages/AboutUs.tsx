import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Heart, Lightbulb, Shield, Users } from "lucide-react";

const AboutUs = () => {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                {/* Hero Section */}
                <section className="bg-primary/5 py-16 md:py-24">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                            Sobre a ProtocoloMED
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            A ProtocoloMED é uma assessoria inovadora especializada em tratamentos para calvície e problemas capilares.
                            Oferecemos um protocolo abrangente que combina acompanhamento médico, suplementação de vitaminas e um histórico online completo da evolução do paciente.
                        </p>
                    </div>
                </section>

                {/* Vision Section */}
                <section className="py-16 container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold mb-8 text-center">Visão Geral do Negócio</h2>
                        <p className="text-lg text-muted-foreground leading-relaxed text-center">
                            Nossa abordagem é única e centrada no cliente, visando proporcionar resultados excepcionais, conveniência e uma experiência personalizada para indivíduos que buscam recuperar a saúde e a autoconfiança por meio de tratamentos capilares eficazes.
                        </p>
                    </div>
                </section>

                {/* Mission & Values */}
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-12 items-start">
                            <div>
                                <h2 className="text-3xl font-bold mb-6">Nossa Missão</h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Nossa missão é transformar a vida das pessoas, ajudando-as a recuperar a saúde capilar, a autoestima e a qualidade de vida por meio de tratamentos inovadores, cuidados compassivos e um compromisso inabalável com a excelência.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-3xl font-bold mb-6">Nossos Valores</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <Shield className="w-6 h-6 text-primary shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-lg">Integridade</h3>
                                            <p className="text-muted-foreground">Agimos com honestidade, transparência e ética em todas as nossas interações.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Heart className="w-6 h-6 text-primary shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-lg">Empatia</h3>
                                            <p className="text-muted-foreground">Tratamos nossos pacientes com compaixão, respeito e compreensão.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Lightbulb className="w-6 h-6 text-primary shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-lg">Inovação</h3>
                                            <p className="text-muted-foreground">Buscamos continuamente novas ideias, tecnologias e abordagens.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Users className="w-6 h-6 text-primary shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-lg">Colaboração</h3>
                                            <p className="text-muted-foreground">Trabalhamos em estreita colaboração com nossos pacientes e médicos.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-16 container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-12 text-center">Nossos Serviços</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            "Consultas médicas online com especialistas",
                            "Exames laboratoriais abrangentes",
                            "Análise nutricional personalizada",
                            "Prescrição baseada em evidências",
                            "Entrega de produtos em casa",
                            "Acompanhamento clínico contínuo",
                            "Histórico médico completo online"
                        ].map((service, index) => (
                            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="pt-6 flex items-start gap-4">
                                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                                    <span className="font-medium">{service}</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Target Audience */}
                <section className="py-16 bg-primary text-primary-foreground">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-8">Nosso Público-Alvo</h2>
                        <p className="text-xl max-w-3xl mx-auto mb-8 opacity-90">
                            Homens e mulheres entre 25 e 55 anos que enfrentam calvície ou problemas capilares e buscam uma solução eficaz, conveniente e personalizada.
                        </p>
                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
                            <div className="bg-primary-foreground/10 p-6 rounded-lg backdrop-blur-sm">
                                <p className="font-medium">Valoriza a saúde, a aparência e a autoconfiança.</p>
                            </div>
                            <div className="bg-primary-foreground/10 p-6 rounded-lg backdrop-blur-sm">
                                <p className="font-medium">Está disposto a investir em tratamentos de alta qualidade.</p>
                            </div>
                            <div className="bg-primary-foreground/10 p-6 rounded-lg backdrop-blur-sm">
                                <p className="font-medium">É tecnologicamente experiente e aprecia a conveniência online.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default AboutUs;
