import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulação de envio
        console.log("Formulário enviado:", formData);

        toast({
            title: "Mensagem enviada!",
            description: "Entraremos em contato em breve.",
        });

        setFormData({ name: "", email: "", subject: "", message: "" });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">

                    {/* Coluna 1: Informações de Texto */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight mb-4">Entre em Contato</h1>
                            <p className="text-lg text-muted-foreground">
                                Estamos aqui para ajudar você a recuperar sua autoestima. Tire suas dúvidas sobre o tratamento, agendamentos ou suporte técnico.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Telefone / WhatsApp</h3>
                                    <p className="text-muted-foreground">(61) 99970-4822</p>
                                    <p className="text-sm text-muted-foreground">Seg-Sex, 09h às 18h</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">E-mail</h3>
                                    <p className="text-muted-foreground">contato@protocolohair.com.br</p>
                                    <p className="text-sm text-muted-foreground">Respondemos em até 24h úteis</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Localização</h3>
                                    <p className="text-muted-foreground">SCLRN 703, Bloco "H", Loja 32. Asa Norte</p>
                                    <p className="text-sm text-muted-foreground">Brasília - DF</p>
                                    <p className="text-sm text-muted-foreground">CEP: 70740610</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coluna 2: Formulário */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Envie uma Mensagem</CardTitle>
                            <CardDescription>Preencha o formulário abaixo e nossa equipe entrará em contato.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Seu nome"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Assunto</Label>
                                    <Input
                                        id="subject"
                                        name="subject"
                                        placeholder="Dúvida sobre tratamento, suporte..."
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Mensagem</Label>
                                    <Textarea
                                        id="message"
                                        name="message"
                                        placeholder="Como podemos ajudar?"
                                        className="min-h-[120px]"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full">
                                    <Send className="mr-2 h-4 w-4" /> Enviar Mensagem
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Contact;