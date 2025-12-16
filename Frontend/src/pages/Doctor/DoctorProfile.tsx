import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, MapPin, Award } from "lucide-react";
import DoctorPlaceholder from "@/assets/Images/Medico02.jpg";

const DoctorProfile = () => {
    const navigate = useNavigate();

    // Mock doctor data
    const doctor = {
        name: "Dr. Protótipo",
        crm: "123456/SP",
        photo: DoctorPlaceholder,
        biography: "Especialista em dermatologia capilar com mais de 10 anos de experiência. Focado em tratamentos avançados para queda de cabelo e saúde do couro cabeludo. Membro da Sociedade Brasileira de Dermatologia e certificado em técnicas de implante capilar.",
        specialties: ["Dermatologia", "Tricologia", "Implante Capilar"],
        phone: "(11) 98765-4321",
        clinicAddress: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100"
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate("/ClientDashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Perfil do médico</h1>
                    <p className="text-muted-foreground">Conheça seu profissional de saúde</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Doctor Info Card */}
                <Card className="lg:col-span-1">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* Profile Photo */}
                            <Avatar className="h-40 w-40 border-4 border-primary">
                                <AvatarImage src={doctor.photo} alt={doctor.name} />
                                <AvatarFallback className="text-5xl font-bold">
                                    {doctor.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Name and CRM */}
                            <div>
                                <h2 className="text-2xl font-bold">{doctor.name}</h2>
                                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                    <Award className="h-3 w-3" />
                                    CRM {doctor.crm}
                                </p>
                            </div>

                            <Separator />

                            {/* Specialties */}
                            <div className="w-full">
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Especialidades</h3>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {doctor.specialties.map((specialty) => (
                                        <Badge key={specialty} variant="secondary">
                                            {specialty}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Contact Info */}
                            <div className="w-full space-y-3">
                                <div className="flex items-start gap-3 text-left">
                                    <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground">Telefone</p>
                                        <p className="text-sm">{doctor.phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-left">
                                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground">Endereço da clínica</p>
                                        <p className="text-sm">{doctor.clinicAddress}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column - Biography */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Sobre o médico</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                            {doctor.biography}
                        </p>

                        <Separator className="my-6" />

                        <div>
                            <h3 className="font-semibold mb-3">Como posso ajudar você?</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Estou aqui para acompanhar sua jornada de tratamento capilar. Se você tiver dúvidas sobre seu protocolo,
                                evolução ou próximos passos, não hesite em entrar em contato.
                            </p>

                            <div className="flex gap-3">
                                <Button onClick={() => navigate("/agendamento")}>
                                    Agendar consulta
                                </Button>
                                <Button variant="outline" onClick={() => navigate("/contato")}>
                                    Enviar mensagem
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DoctorProfile;
