import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Upload, X, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DoctorPlaceholder from "@/assets/Images/Medico02.jpg";

const DoctorProfileSettings = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State for profile data
    const [profilePhoto, setProfilePhoto] = useState<string | null>(DoctorPlaceholder);
    const [fullName, setFullName] = useState("Dr. Protótipo");
    const [crm, setCrm] = useState("123456/SP");
    const [email] = useState("medico@protocolomed.com");
    const [biography, setBiography] = useState(
        "Especialista em dermatologia capilar com mais de 10 anos de experiência. Focado em tratamentos avançados para queda de cabelo e saúde do couro cabeludo."
    );
    const [phone, setPhone] = useState("(11) 98765-4321");
    const [clinicAddress, setClinicAddress] = useState("Av. Paulista, 1000 - São Paulo, SP");

    // Specialties state
    const [specialties, setSpecialties] = useState<string[]>(["Dermatologia", "Tricologia", "Implante Capilar"]);
    const [newSpecialty, setNewSpecialty] = useState("");

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePhoto(URL.createObjectURL(file));
        }
    };

    const handleAddSpecialty = () => {
        if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
            setSpecialties([...specialties, newSpecialty.trim()]);
            setNewSpecialty("");
        }
    };

    const handleRemoveSpecialty = (specialtyToRemove: string) => {
        setSpecialties(specialties.filter(s => s !== specialtyToRemove));
    };

    const handleSave = () => {
        // Simulate save action
        toast({
            title: "Alterações salvas!",
            description: "Seu perfil foi atualizado com sucesso.",
        });
    };

    const handleCancel = () => {
        navigate("/DoctorDashboard");
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate("/DoctorDashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Configurações de perfil</h1>
                    <p className="text-muted-foreground">Atualize suas informações profissionais</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* Left Block - Identity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Identidade</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Photo */}
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-32 w-32 border-4 border-primary">
                                <AvatarImage src={profilePhoto || undefined} alt={fullName} />
                                <AvatarFallback className="text-4xl font-bold">
                                    {fullName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <span>
                                        <Upload className="h-4 w-4" />
                                        Alterar foto
                                    </span>
                                </Button>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />
                            </label>
                        </div>

                        <Separator />

                        {/* Basic Info Fields */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nome completo</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Digite seu nome completo"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="crm">CRM</Label>
                                <Input
                                    id="crm"
                                    value={crm}
                                    onChange={(e) => setCrm(e.target.value)}
                                    placeholder="Ex: 123456/SP"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    value={email}
                                    readOnly
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    O e-mail não pode ser alterado
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Block - Public Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes públicos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Biography */}
                        <div className="space-y-2">
                            <Label htmlFor="biography">Biografia</Label>
                            <Textarea
                                id="biography"
                                value={biography}
                                onChange={(e) => setBiography(e.target.value)}
                                placeholder="Conte aos pacientes sobre sua experiência..."
                                className="min-h-[120px] resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Descreva sua experiência e áreas de atuação
                            </p>
                        </div>

                        <Separator />

                        {/* Specialties */}
                        <div className="space-y-3">
                            <Label>Especialidades</Label>

                            {/* Specialty Input */}
                            <div className="flex gap-2">
                                <Input
                                    value={newSpecialty}
                                    onChange={(e) => setNewSpecialty(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialty()}
                                    placeholder="Ex: Tricologia"
                                />
                                <Button onClick={handleAddSpecialty} type="button">
                                    Adicionar
                                </Button>
                            </div>

                            {/* Specialty Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md">
                                {specialties.length > 0 ? (
                                    specialties.map((specialty) => (
                                        <Badge key={specialty} variant="secondary" className="gap-1 pr-1">
                                            {specialty}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0 hover:bg-transparent"
                                                onClick={() => handleRemoveSpecialty(specialty)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma especialidade adicionada
                                    </p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clinicAddress">Endereço da clínica</Label>
                                <Textarea
                                    id="clinicAddress"
                                    value={clinicAddress}
                                    onChange={(e) => setClinicAddress(e.target.value)}
                                    placeholder="Digite o endereço completo da clínica"
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar alterações
                </Button>
            </div>
        </div>
    );
};

export default DoctorProfileSettings;
