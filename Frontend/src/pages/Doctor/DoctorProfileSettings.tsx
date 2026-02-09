
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const DoctorProfileSettings = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile Data
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [fullName, setFullName] = useState("");
    const [crm, setCrm] = useState("");
    const [email, setEmail] = useState("");
    const [biography, setBiography] = useState("");
    const [phone, setPhone] = useState("");

    // Specialties (Backend stores as comma separated string for now, or single field)
    const [specialtyType, setSpecialtyType] = useState("trichologist");
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [newSpecialty, setNewSpecialty] = useState("");

    // Fetch Profile Data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/accounts/doctor/profile/');
                const data = response.data;

                setFullName(data.fullName || "");
                setEmail(data.email || "");
                setPhone(data.phone || "");
                setCrm(data.crm || "");
                setBiography(data.bio || "");
                setProfilePhoto(data.profilePhoto || null);
                setSpecialtyType(data.specialty_type || "trichologist");

                // Parse specialties if they come as "Tag1, Tag2"
                if (data.specialty) {
                    setSpecialties(data.specialty.split(',').map((s: string) => s.trim()).filter(Boolean));
                }
            } catch (error) {
                console.error("Erro ao carregar perfil:", error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar perfil",
                    description: "Não foi possível buscar seus dados.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [toast]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setProfilePhoto(URL.createObjectURL(file)); // Preview
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('phone', phone);
            formData.append('bio', biography);
            formData.append('crm', crm);
            formData.append('specialty_type', specialtyType);

            // Join specialties
            formData.append('specialty', specialties.join(', '));

            if (selectedFile) {
                formData.append('profilePhoto', selectedFile);
            }

            // Note: clinicAddress is not sent because backend doesn't support it in this view yet
            // If we wanted, we could map it to 'street' or 'complement' if UserUpdate supported it.

            await api.put('/accounts/doctor/profile/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast({
                title: "Alterações salvas!",
                description: "Seu perfil foi atualizado com sucesso.",
            });

            // Reload page or just stay? Stay is better but maybe refresh photo state if URL changed?
            // Usually the preview is fine.

        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Verifique os dados e tente novamente.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate("/DoctorDashboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                                <AvatarImage src={profilePhoto || undefined} alt={fullName} className="object-cover" />
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
                                Esta descrição aparecerá no seu cartão de perfil.
                            </p>
                        </div>

                        <Separator />

                        {/* Specialties */}
                        <div className="space-y-3">
                            <Label>Área de Atuação e Especialidades</Label>

                            {/* Specialty Type Select */}
                            <div className="space-y-2">
                                <Label htmlFor="specialty_type" className="text-xs text-muted-foreground">Área de Atuação Principal</Label>
                                <Select
                                    value={specialtyType}
                                    onValueChange={setSpecialtyType}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione sua área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trichologist">Tricologista</SelectItem>
                                        <SelectItem value="nutritionist">Nutricionista</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Specialty Input */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Especialidades (Tags)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newSpecialty}
                                        onChange={(e) => setNewSpecialty(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialty()}
                                        placeholder="Ex: Implante Capilar"
                                    />
                                    <Button onClick={handleAddSpecialty} type="button">
                                        Adicionar
                                    </Button>
                                </div>
                            </div>

                            {/* Specialty Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md">
                                {specialties.length > 0 ? (
                                    specialties.map((specialty, index) => (
                                        <Badge key={index} variant="secondary" className="gap-1 pr-1">
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Salvar alterações
                </Button>
            </div>
        </div>
    );
};

export default DoctorProfileSettings;
