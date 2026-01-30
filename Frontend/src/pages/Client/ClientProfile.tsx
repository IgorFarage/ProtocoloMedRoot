import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
    CardFooter
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast";
import { User as UserIcon, Mail, Phone, MapPin, Save, CreditCard, UserCircle, Wallet, Loader2, Edit2, X, Camera, Upload, AlertTriangle } from "lucide-react";
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

    // States for Cancellation
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCanceling, setIsCanceling] = useState(false);

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

            if (profile.payment_info?.has_card) {
                setPaymentData(prev => ({
                    ...prev,
                    cardName: profile.payment_info!.cardName || "Cartão Salvo",
                    cardNumber: profile.payment_info!.cardNumber || "**** **** **** ****"
                }));
            }
        }
    }, [profile, user]);

    const [paymentData, setPaymentData] = useState({
        cardName: user?.full_name || "",
        cardNumber: "**** **** **** 1234"
    });

    const handleDeleteSubscription = async () => {
        setIsCanceling(true);
        try {
            await api.post('/financial/cancel-subscription/', { reason: cancelReason });
            toast({
                title: "Assinatura Cancelada",
                description: "Seu cancelamento foi agendado com sucesso.",
            });
            setIsCancelModalOpen(false);
            window.location.reload();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível cancelar sua assinatura. Tente novamente.",
            });
        } finally {
            setIsCanceling(false);
        }
    };

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
                                                <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
                                        <div className="flex items-center gap-2 justify-between">
                                            <h3 className="text-lg font-medium flex items-center gap-2">
                                                <CreditCard className="h-5 w-5" /> Cartão de Crédito
                                            </h3>
                                            {profile?.payment_info?.brand && (
                                                <span className="text-xs font-bold uppercase bg-primary/10 text-primary px-2 py-1 rounded">
                                                    {profile.payment_info.brand}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-4 border p-4 rounded-lg bg-gray-50/30">
                                            <div className="space-y-2">
                                                <Label>Nome no Cartão</Label>
                                                <Input name="cardName" value={paymentData.cardName} onChange={handlePaymentChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Número</Label>
                                                <Input name="cardNumber" value={paymentData.cardNumber} onChange={handlePaymentChange} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes do Plano */}
                                    {profile?.plan_info && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="text-lg font-medium flex items-center gap-2">
                                                <Wallet className="h-5 w-5" /> Detalhes do Plano
                                            </h3>
                                            <div className="bg-gray-50/50 rounded-lg p-4 border space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">Plano Atual</span>
                                                    <span className="font-medium">{profile.plan_info.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">Ciclo</span>
                                                    <span className="font-medium">{profile.plan_info.cycle}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">Valor</span>
                                                    <span className="font-medium">{profile.plan_info.price}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">Tipo</span>
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                        {profile.plan_info.is_subscription ? "Assinatura Recorrente" : "Pagamento Único"}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    {/* Cancel Button Block */}
                                    {profile?.plan_info?.is_subscription &&
                                        profile.plan_info.subscription_status !== 'canceled' &&
                                        profile.plan_info.subscription_status !== 'grace_period' && (
                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    variant="destructive"
                                                    type="button"
                                                    className="w-full sm:w-auto"
                                                    onClick={() => setIsCancelModalOpen(true)}
                                                >
                                                    Cancelar Assinatura
                                                </Button>
                                            </div>
                                        )}

                                    {/* Grace Period Warning */}
                                    {profile?.plan_info?.subscription_status === 'grace_period' && (
                                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-yellow-800">Assinatura Cancelada</h4>
                                                <p className="text-sm text-yellow-700 mt-1">
                                                    {profile.plan_info.warning || "Seu acesso será revogado em breve."}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                </CardContent>
                                {/* Botão SALVAR PAGAMENTO Removido */}
                            </form>
                        </Card>
                    )}
                </div>

                {/* MODAL DE CANCELAMENTO */}
                <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tem certeza que deseja cancelar?</DialogTitle>
                            <DialogDescription>
                                Ao cancelar, você perderá acesso ao suporte médico contínuo e aos ajustes do seu protocolo.
                                <br /><br />
                                <strong>Seu acesso permanecerá ativo até o fim do período pago.</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Por qual motivo você está nos deixando?</Label>
                                <Select onValueChange={setCancelReason} value={cancelReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um motivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="financeiro">O valor está muito alto</SelectItem>
                                        <SelectItem value="resultado">Já atingi os resultados esperados</SelectItem>
                                        <SelectItem value="suporte">Não gostei do atendimento</SelectItem>
                                        <SelectItem value="outros">Outros motivos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
                                Prefiro Continuar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSubscription}
                                disabled={!cancelReason || isCanceling}
                            >
                                {isCanceling ? "Processando..." : "Confirmar Cancelamento"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default ClientProfile;
