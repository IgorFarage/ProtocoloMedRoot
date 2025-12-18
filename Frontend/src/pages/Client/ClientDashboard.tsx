import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthProvider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Importante para não dar erro
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, ShoppingBag, FileText, History,
  Upload, ClipboardList, Trash2, Loader2, MapPin
} from "lucide-react";
import api from "@/lib/api";

// --- IMPORTAÇÃO DOS PRODUTOS ---
import minoxidilCpsImg from "@/assets/Produtos/MinoxidilCPS.png";
import finasteridaCpsImg from "@/assets/Produtos/FinasteridaCPS.png";
import dutasteridaCpsImg from "@/assets/Produtos/DutasteridaCPS.png";
import minoxidilSprayImg from "@/assets/Produtos/MinoxidilSpray.png";
import finasteridaSprayImg from "@/assets/Produtos/FinasteridaSpray.png";
import shampooImg from "@/assets/Produtos/SawpalmetoShampoo.png";
import biotinaImg from "@/assets/Produtos/BiotinaCPS.png";

// --- CONFIGURAÇÕES MOCKADAS (Preços e Instruções) ---
const PRICES: Record<string, number> = {
  "Minoxidil 2.5mg": 49.90,
  "Finasterida 1mg": 39.90,
  "Dutasterida 0.5mg": 89.90,
  "Saw Palmetto": 55.00,
  "Loção Finasterida": 65.00,
  "Loção Minoxidil 5%": 59.90,
  "Shampoo Saw Palmetto": 35.00,
  "Biotina 45ug": 29.90
};

const INSTRUCTIONS: Record<string, string> = {
  "Minoxidil 2.5mg": "Tomar 1 cápsula via oral pela manhã.",
  "Finasterida 1mg": "Tomar 1 comprimido via oral todos os dias.",
  "Dutasterida 0.5mg": "Tomar 1 cápsula via oral diariamente.",
  "Loção Minoxidil 5%": "Aplicar 6 borrifadas no couro cabeludo seco à noite.",
  "Loção Finasterida": "Aplicar nas áreas afetadas 1x ao dia.",
  "Shampoo Saw Palmetto": "Uso diário. Deixar agir por 3 minutos.",
  "Biotina 45ug": "Tomar 1 cápsula junto com o almoço."
};

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Estados de Dados
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<any>(null);
  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1 = Carrinho, 2 = Endereço
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState({
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: ""
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // 1. Busca Histórico Real
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.get('/accounts/questionnaires/');
        if (response.data && response.data.length > 0) {
          setFullHistory(response.data);
          setAnswers(response.data[0].answers);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. Lógica de Protocolo
  const calculateProtocol = (targetAnswers: any) => {
    if (!targetAnswers) return null;

    const shampoo = { name: "Shampoo Saw Palmetto", sub: "Café verde + Mentol", img: shampooImg };
    const biotina = { name: "Biotina 45ug", sub: "Suplemento vitamínico", img: biotinaImg };
    let selectedCapsule = null;
    let selectedSpray = null;

    const gender = targetAnswers["F1_Q1_gender"];
    const hasPets = targetAnswers["F2_Q18_pets"] === "sim";
    const allergies = targetAnswers["F2_Q15_allergy"] || "";
    const priority = targetAnswers["F2_Q19_priority"];
    const intervention = targetAnswers["F2_Q16_intervention"];

    const allergicMinoxidil = allergies.includes("minoxidil");
    const allergicFinasterida = allergies.includes("finasterida");
    const allergicDutasterida = allergies.includes("dutasterida");
    const isHighEfficacy = priority === "efetividade" || intervention === "dutasterida";

    if (gender === "feminino") {
      selectedCapsule = allergicMinoxidil
        ? { name: "Consulte Especialista", sub: "Restrição alérgica", img: null }
        : { name: "Minoxidil 2.5mg", sub: "Cápsula oral", img: minoxidilCpsImg };
    } else {
      if (isHighEfficacy && !allergicDutasterida) {
        selectedCapsule = { name: "Dutasterida 0.5mg", sub: "Alta eficácia", img: dutasteridaCpsImg };
      } else if (!allergicFinasterida) {
        selectedCapsule = { name: "Finasterida 1mg", sub: "Bloqueador DHT", img: finasteridaCpsImg };
      } else {
        selectedCapsule = !allergicMinoxidil
          ? { name: "Minoxidil 2.5mg", sub: "Estimulante oral", img: minoxidilCpsImg }
          : { name: "Saw Palmetto", sub: "Alternativa natural", img: null };
      }
    }

    if (hasPets) {
      selectedSpray = { name: "Loção Finasterida", sub: "Spray pet-friendly", img: finasteridaSprayImg };
    } else {
      selectedSpray = allergicMinoxidil
        ? { name: "Loção Finasterida", sub: "Spray tópico", img: finasteridaSprayImg }
        : { name: "Loção Minoxidil 5%", sub: "Spray tópico", img: minoxidilSprayImg };
    }

    return [selectedCapsule, selectedSpray, shampoo, biotina].filter((p): p is any => p !== null);
  };

  const currentProtocol = calculateProtocol(answers);

  // --- FUNÇÕES DE CHECKOUT ---

  const openCheckout = () => {
    if (!currentProtocol) return;
    const itemsWithPrice = currentProtocol.map((p: any) => ({
      ...p,
      price: PRICES[p.name] || 0
    }));
    setCart(itemsWithPrice);
    setCheckoutStep(1);
    setIsCheckoutOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const totalValue = cart.reduce((acc, item) => acc + item.price, 0);

  const handleCepBlur = async () => {
    const cep = address.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubscribe = async () => {
    if (!address.street || !address.number) {
      toast({ title: "Endereço incompleto", description: "Preencha número e rua.", variant: "destructive" });
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.post('/accounts/subscribe/', {
        address,
        products: cart,
        total: totalValue
      });
      toast({
        title: "Pedido Recebido!",
        description: "Seu kit será preparado. Acompanhe pelo email.",
        className: "bg-green-600 text-white"
      });
      setIsCheckoutOpen(false);
    } catch (error) {
      toast({ title: "Erro ao processar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // --- FUNÇÕES DE UPLOAD ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handlePhotoSubmit = () => {
    if (uploadedFile) {
      alert("Funcionalidade de upload será ativada em breve.");
      setUploadedFile(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Olá, {user?.full_name?.split(" ")[0] || "Paciente"}!</h1>
          <p className="text-lg text-muted-foreground">Gerencie seu tratamento e histórico médico.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={logout} variant="outline" className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="overview" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Meu Protocolo
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* --- PROTOCOLO ATUAL --- */}
        <TabsContent value="overview" className="space-y-8 pt-4">
          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Status do Tratamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-primary/5 border-primary/20">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <AlertTitle>Em Análise Médica</AlertTitle>
                  <AlertDescription>Seu protocolo está sendo validado por um especialista.</AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Estágio Atual</p>
                    <p className="text-xl font-bold text-destructive capitalize">{answers?.["F1_Q2_stage"]?.replace('_', ' ') || "--"}</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Prioridade</p>
                    <p className="text-xl font-bold text-primary capitalize">{answers?.["F2_Q19_priority"] || "--"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Protocolo Ativo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentProtocol?.map((prod: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg border shadow-sm">
                    <div className="w-12 h-12 p-1 shrink-0">
                      {prod.img && <img src={prod.img} alt={prod.name} className="w-full h-full object-contain" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{prod.name}</p>
                      <p className="text-[10px] text-gray-500 mb-1">{prod.sub}</p>
                      {/* POSOLOGIA AQUI */}
                      <p className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1 rounded w-fit">
                        {INSTRUCTIONS[prod.name] || "Uso conforme orientação"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={openCheckout}>
                  Assinar Plano
                </Button>
              </CardFooter>
            </Card>
          </section>
        </TabsContent>

        {/* --- HISTÓRICO --- */}
        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {fullHistory.map((entry, index) => {
                  const pastProtocol = calculateProtocol(entry.answers);
                  return (
                    <div key={entry.id || index} className="mb-8 p-6 border rounded-xl bg-gray-50/50">
                      <div className="flex justify-between items-center mb-4">
                        <Badge variant="outline" className="text-md py-1 px-3">
                          Realizada em: {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                        </Badge>
                        {index === 0 && <Badge className="bg-green-600">Atual</Badge>}
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" /> Respostas:
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries(entry.answers).map(([key, value]: [string, any]) => (
                              <div key={key} className="text-xs flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">{key.split('_').pop()}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" /> Recomendação:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {pastProtocol?.map((p: any, i: number) => (
                              <div key={i} className="bg-white border p-2 rounded text-xs">
                                <span className="font-bold">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- SEÇÃO DE UPLOAD --- */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Envio de Fotos</CardTitle>
            <CardDescription>Atualize seu médico sobre seu progresso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedFile ? (
              <div className="border p-4 rounded-lg flex items-center justify-between bg-primary/10">
                <span className="text-sm font-medium truncate max-w-[150px]">{uploadedFile.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)} className="text-red-500 h-8 w-8 p-0">X</Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors cursor-pointer bg-gray-50/50">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 text-center">Clique para carregar foto</span>
                <Input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handlePhotoSubmit} disabled={!uploadedFile} className="w-full">
              Enviar Foto
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Galeria de Evolução</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center text-gray-400">
            <div className="p-4 bg-gray-100 rounded-full mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p>Nenhuma foto enviada ainda.</p>
          </CardContent>
        </Card>
      </section>

      {/* --- MODAL DE CHECKOUT --- */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {checkoutStep === 1 ? "Revisar Pedido" : "Dados de Entrega"}
            </DialogTitle>
            <DialogDescription>
              {checkoutStep === 1
                ? "Confira os itens do seu protocolo e o valor total."
                : "Informe o endereço para recebimento do kit."}
            </DialogDescription>
          </DialogHeader>

          {/* PASSO 1: CARRINHO */}
          {checkoutStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Carrinho vazio.</p>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-secondary/20 p-3 rounded-lg">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.sub}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl text-primary">
                  {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancelar</Button>
                <Button onClick={() => setCheckoutStep(2)} disabled={cart.length === 0}>
                  Continuar
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* PASSO 2: ENDEREÇO */}
          {checkoutStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={address.cep}
                      onChange={e => setAddress({ ...address, cep: e.target.value })}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {loadingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Rua</Label>
                  <Input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label>Número</Label>
                  <Input value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })} />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Complemento</Label>
                  <Input value={address.complement} onChange={e => setAddress({ ...address, complement: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={address.neighborhood} onChange={e => setAddress({ ...address, neighborhood: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade/UF</Label>
                  <Input value={`${address.city}/${address.state}`} readOnly className="bg-muted" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setCheckoutStep(1)}>Voltar</Button>
                <Button onClick={handleSubscribe} disabled={submittingOrder}>
                  {submittingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Assinatura
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}