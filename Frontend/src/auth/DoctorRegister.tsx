import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Stethoscope, ShieldCheck } from "lucide-react";

const DoctorRegister = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "Dr.",
        full_name: "",
        email: "",
        crm: "",
        specialty: "",
        specialty_type: "trichologist",
        invite_code: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({ variant: "destructive", title: "Senhas não conferem" });
            return;
        }

        setLoading(true);

        try {
            await api.post("/accounts/register-doctor/", {
                email: formData.email,
                password: formData.password,
                full_name: `${formData.title} ${formData.full_name}`,
                crm: formData.crm,
                specialty: formData.specialty,
                specialty_type: formData.specialty_type,
                invite_code: formData.invite_code
            });

            toast({
                title: "Cadastro realizado com sucesso!",
                description: "Sua conta médica foi criada. Faça login para acessar."
            });

            navigate("/login");

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || "Erro ao criar conta médica.";
            toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <Card className="w-full max-w-lg border-primary/20 shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Portal Médico</CardTitle>
                    <CardDescription>
                        Cadastro exclusivo para profissionais de saúde parceiros.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <div className="flex gap-2">
                                    <div className="w-[100px]">
                                        <Select
                                            value={formData.title}
                                            onValueChange={(value) => setFormData({ ...formData, title: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Título" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Dr.">Dr.</SelectItem>
                                                <SelectItem value="Dra.">Dra.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input
                                        id="full_name"
                                        placeholder="Nome Sobrenome"
                                        required
                                        onChange={handleChange}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="crm">CRM / UF</Label>
                                <Input id="crm" placeholder="123456/SP" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="specialty_type">Área de Atuação</Label>
                                <Select
                                    value={formData.specialty_type}
                                    onValueChange={(value) => setFormData({ ...formData, specialty_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trichologist">Tricologista</SelectItem>
                                        <SelectItem value="nutritionist">Nutricionista</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Especialidade</Label>
                                <Input id="specialty" placeholder="Ex: Implante Capilar, Nutrição Clínica" onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail Profissional</Label>
                            <Input id="email" type="email" placeholder="medico@clinica.com" required onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="invite_code">Código de Convite</Label>
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                            </div>
                            <Input id="invite_code" placeholder="Insira o código fornecido" required onChange={handleChange} className="border-green-200 focus-visible:ring-green-500" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input id="password" type="password" required onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input id="confirmPassword" type="password" required onChange={handleChange} />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Conta Médica"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-gray-600">
                        Já possui acesso? <Link to="/login" className="text-primary hover:underline font-semibold">Acessar Painel</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default DoctorRegister;
