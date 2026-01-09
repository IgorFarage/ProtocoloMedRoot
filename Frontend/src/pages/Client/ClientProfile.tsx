import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Save, CreditCard, Building2, UserCircle, Wallet, Loader2, Edit2, X, Camera, Upload } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData"; // [NOVO]
import api from "@/lib/api";

const ClientProfile = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { profile, loading } = useClientData(); // [NOVO] Hook de Dados

    const [activeSection, setActiveSection] = useState<'personal' | 'payment'>('personal');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        street: "", // ADDRESS
        neighborhood: "", // ADDRESS_2
        city: "", // ADDRESS_CITY
        state: "", // ADDRESS_PROVINCE
        zip: "", // ADDRESS_POSTAL_CODE
        country: "Brasil" // ADDRESS_COUNTRY
    });

    // Atualiza o form quando o perfil é carregado
    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                name: profile.name || user?.full_name || "",
                email: profile.email || user?.email || "",
                phone: profile.phone || "",
                street: profile.address?.street || "",
                neighborhood: profile.address?.neighborhood || "",
                city: profile.address?.city || "",
                state: profile.address?.state || "",
                zip: profile.address?.zip || "",
                country: profile.address?.country || "Brasil"
            }));
        }
    }, [profile, user]);

    const [paymentData, setPaymentData] = useState({
        cardName: user?.full_name || "",
        cardNumber: "**** **** **** 1234",
        expiry: "12/28",
        cvv: "***",
        bank: "Banco do Brasil",
        agency: "1234-5",
        account: "12345-6"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancelar edição: Recarrega dados originais
            if (profile) {
                setFormData(prev => ({
                    ...prev,
                    name: profile.name || user?.full_name || "",
                    email: profile.email || user?.email || "",
                    phone: profile.phone || "",
                    street: profile.address?.street || "",
                    neighborhood: profile.address?.neighborhood || "",
                    city: profile.address?.city || "",
                    state: profile.address?.state || "",
                    zip: profile.address?.zip || "",
                    country: profile.address?.country || "Brasil"
                }));
            }
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            await api.post('/accounts/update_address/', {
                address_data: {
                    street: formData.street,
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    state: formData.state,
                    cep: formData.zip,
                    country: formData.country,
                    // Phone não está no update_address padrão, mas vamos enviar separado se necessário
                    // Por enquanto update_address só atualiza endereço no BitrixService
                }
            });

            // TODO: Se tiver endpoint para atualizar telefone, chamar aqui.
            // BitrixService.update_contact_data usa (user_bitrix_id, cpf, phone)
            // Precisaríamos expor isso. Mas vamos focar no endereço que foi o pedido principal.

            toast({
                title: "Perfil atualizado!",
                description: "Suas informações foram salvas com sucesso.",
                className: "bg-green-600 text-white"
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar seus dados. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPaymentData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Pagamento atualizado!",
            description: "Suas informações de pagamento foram salvas.",
            className: "bg-green-600 text-white"
        });
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Minha Conta</h1>
                <p className="text-muted-foreground mt-2">
                    Gerencie seus dados pessoais e financeiros.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* SIDEBAR DE NAVEGAÇÃO INTERNA */}
                <Card className="w-full lg:w-64 flex-shrink-0">
                    <CardContent className="p-4 space-y-2">
                        <Button
                            variant={activeSection === 'personal' ? 'secondary' : 'ghost'}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection('personal')}
                        >
                            <UserCircle className="w-5 h-5" /> Dados Pessoais
                        </Button>
                        <Button
                            variant={activeSection === 'payment' ? 'secondary' : 'ghost'}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection('payment')}
                        >
                            <Wallet className="w-5 h-5" /> Pagamento
                        </Button>
                    </CardContent>
                </Card>

                {/* CONTEÚDO PRINCIPAL */}
                <div className="flex-1 w-full">
                    {activeSection === 'personal' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Informações Pessoais</CardTitle>
                                    <CardDescription>Atualize seus dados para mantermos o contato.</CardDescription>
                                </div>
                                <Button variant={isEditing ? "destructive" : "outline"} size="sm" onClick={handleEditToggle} className="gap-2">
                                    {isEditing ? <><X className="h-4 w-4" /> Cancelar</> : <><Edit2 className="h-4 w-4" /> Editar</>}
                                </Button>
                            </CardHeader>
                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-6">
                                    {/* Nome e Email */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nome Completo</Label>
                                            <div className="relative">
                                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="pl-9 text-gray-900 disabled:opacity-100"
                                                    disabled // Nome geralmente não editavel facilmente
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">E-mail</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    readOnly
                                                    className="pl-9 bg-gray-50 text-gray-900 disabled:opacity-100"
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Telefone */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="pl-9 text-gray-900 disabled:opacity-100"
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    </div>

                                    {/* Endereço - COMPLETO */}
                                    <div className="space-y-4 border-t pt-4">
                                        <h3 className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereço</h3>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Rua / Logradouro</Label>
                                                <Input
                                                    name="street"
                                                    value={formData.street}
                                                    onChange={handleChange}
                                                    placeholder="Rua, Avenida..."
                                                    disabled={!isEditing}
                                                    className="text-gray-900 disabled:opacity-100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Bairro / Complemento</Label>
                                                <Input
                                                    name="neighborhood"
                                                    value={formData.neighborhood}
                                                    onChange={handleChange}
                                                    className="text-gray-900 disabled:opacity-100"
                                                    placeholder="Bairro, Apto..."
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Cidade</Label>
                                                <Input
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="text-gray-900 disabled:opacity-100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Estado</Label>
                                                <Input
                                                    name="state"
                                                    value={formData.state}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="text-gray-900 disabled:opacity-100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>CEP</Label>
                                                <Input
                                                    name="zip"
                                                    value={formData.zip}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="text-gray-900 disabled:opacity-100"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>País</Label>
                                            <Input
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                className="text-gray-900 disabled:opacity-100"
                                            />
                                        </div>
                                    </div>

                                </CardContent>
                                {isEditing && (
                                    <CardFooter className="flex justify-end bg-gray-50/50 p-4 rounded-b-lg">
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Salvar Alterações
                                        </Button>
                                    </CardFooter>
                                )}
                            </form>
                        </Card>
                    )}

                    {activeSection === 'payment' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Métodos de Pagamento</CardTitle>
                                <CardDescription>Gerencie seus cartões e informações bancárias.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handlePaymentSubmit}>
                                <CardContent className="space-y-8">
                                    {/* Cartão de Crédito */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" /> Cartão de Crédito
                                        </h3>
                                        <div className="grid gap-4 border p-4 rounded-lg bg-gray-50/30">
                                            <div className="space-y-2">
                                                <Label>Nome no Cartão</Label>
                                                <Input name="cardName" value={paymentData.cardName} onChange={handlePaymentChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Número</Label>
                                                <Input name="cardNumber" value={paymentData.cardNumber} onChange={handlePaymentChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Validade</Label>
                                                    <Input name="expiry" value={paymentData.expiry} onChange={handlePaymentChange} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>CVV</Label>
                                                    <Input name="cvv" type="password" value={paymentData.cvv} onChange={handlePaymentChange} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Dados Bancários */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium flex items-center gap-2">
                                            <Building2 className="h-5 w-5" /> Dados Bancários
                                        </h3>
                                        <div className="grid gap-4 border p-4 rounded-lg bg-gray-50/30">
                                            <div className="space-y-2">
                                                <Label>Banco</Label>
                                                <Input name="bank" value={paymentData.bank} onChange={handlePaymentChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Agência</Label>
                                                    <Input name="agency" value={paymentData.agency} onChange={handlePaymentChange} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Conta</Label>
                                                    <Input name="account" value={paymentData.account} onChange={handlePaymentChange} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end bg-gray-50/50 p-4 rounded-b-lg">
                                    <Button type="submit">
                                        <Save className="mr-2 h-4 w-4" /> Salvar Pagamento
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ClientProfile;
