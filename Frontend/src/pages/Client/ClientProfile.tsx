import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Save, CreditCard, Plus, Building2 } from "lucide-react";

const ClientProfile = () => {
    const { toast } = useToast();

    // Mock initial data - in a real app this would come from an API/Context
    const [formData, setFormData] = useState({
        name: "João Silva",
        email: "joao.silva@example.com",
        phone: "(11) 99999-9999",
        street: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zip: "01234-567"
    });

    const [paymentData, setPaymentData] = useState({
        cardName: "João Silva",
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

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPaymentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulation of update
        console.log("Dados pessoais atualizados:", formData);

        toast({
            title: "Perfil atualizado!",
            description: "Suas informações pessoais foram salvas.",
        });
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulation of payment update
        console.log("Dados de pagamento atualizados:", paymentData);

        toast({
            title: "Pagamento atualizado!",
            description: "Suas informações de pagamento foram salvas.",
        });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
                        <p className="text-muted-foreground">
                            Gerencie suas informações pessoais e métodos de pagamento.
                        </p>
                    </div>

                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                            <TabsTrigger value="payment">Pagamento &amp; Banco</TabsTrigger>
                        </TabsList>

                        <TabsContent value="personal">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Pessoais</CardTitle>
                                    <CardDescription>Atualize seus dados para mantermos o contato.</CardDescription>
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
                                                        placeholder="Seu nome"
                                                        className="pl-9"
                                                        value={formData.name}
                                                        onChange={handleChange}
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
                                                        type="email"
                                                        placeholder="seu@email.com"
                                                        className="pl-9 bg-muted"
                                                        value={formData.email}
                                                        readOnly
                                                        title="O e-mail não pode ser alterado"
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
                                                    placeholder="(00) 00000-0000"
                                                    className="pl-9"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>

                                        {/* Endereço */}
                                        <div className="space-y-2">
                                            <Label>Endereço</Label>
                                            <div className="grid gap-4">
                                                <div className="relative">
                                                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        name="street"
                                                        placeholder="Rua, Número, Complemento"
                                                        className="pl-9"
                                                        value={formData.street}
                                                        onChange={handleChange}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <Input
                                                        name="city"
                                                        placeholder="Cidade"
                                                        value={formData.city}
                                                        onChange={handleChange}
                                                    />
                                                    <Input
                                                        name="state"
                                                        placeholder="Estado"
                                                        value={formData.state}
                                                        onChange={handleChange}
                                                    />
                                                    <Input
                                                        name="zip"
                                                        placeholder="CEP"
                                                        value={formData.zip}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button type="submit">
                                            <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="payment">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Métodos de Pagamento</CardTitle>
                                    <CardDescription>Gerencie seus cartões e informações bancárias.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handlePaymentSubmit}>
                                    <CardContent className="space-y-8">

                                        {/* Cartão de Crédito */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium flex items-center gap-2">
                                                    <CreditCard className="h-5 w-5" /> Cartão de Crédito Principal
                                                </h3>
                                            </div>

                                            <div className="grid gap-4 border p-4 rounded-lg bg-muted/20">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cardName">Nome no Cartão</Label>
                                                    <Input
                                                        id="cardName"
                                                        name="cardName"
                                                        placeholder="Nome como está no cartão"
                                                        value={paymentData.cardName}
                                                        onChange={handlePaymentChange}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                                                    <Input
                                                        id="cardNumber"
                                                        name="cardNumber"
                                                        placeholder="0000 0000 0000 0000"
                                                        value={paymentData.cardNumber}
                                                        onChange={handlePaymentChange}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="expiry">Validade</Label>
                                                        <Input
                                                            id="expiry"
                                                            name="expiry"
                                                            placeholder="MM/AA"
                                                            value={paymentData.expiry}
                                                            onChange={handlePaymentChange}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="cvv">CVV</Label>
                                                        <Input
                                                            id="cvv"
                                                            name="cvv"
                                                            placeholder="123"
                                                            type="password"
                                                            value={paymentData.cvv}
                                                            onChange={handlePaymentChange}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dados Bancários */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium flex items-center gap-2">
                                                    <Building2 className="h-5 w-5" /> Dados Bancários
                                                </h3>
                                            </div>

                                            <div className="grid gap-4 border p-4 rounded-lg bg-muted/20">
                                                <div className="space-y-2">
                                                    <Label htmlFor="bank">Banco</Label>
                                                    <Input
                                                        id="bank"
                                                        name="bank"
                                                        placeholder="Nome ou Código do Banco"
                                                        value={paymentData.bank}
                                                        onChange={handlePaymentChange}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agency">Agência</Label>
                                                        <Input
                                                            id="agency"
                                                            name="agency"
                                                            placeholder="0000"
                                                            value={paymentData.agency}
                                                            onChange={handlePaymentChange}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="account">Conta</Label>
                                                        <Input
                                                            id="account"
                                                            name="account"
                                                            placeholder="00000-0"
                                                            value={paymentData.account}
                                                            onChange={handlePaymentChange}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button type="submit">
                                            <Save className="mr-2 h-4 w-4" /> Salvar Dados de Pagamento
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ClientProfile;
