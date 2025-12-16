import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthProvider";
import { ChevronRight, Heart, TrendingUp, UserCheck, Upload, LogOut, ShoppingBag, FileText, AlertCircle, ClipboardList, History } from "lucide-react";
import api from "@/lib/api";

// --- IMPORTAÇÃO DOS PRODUTOS (Lógica Real) ---
import minoxidilCpsImg from "@/assets/Produtos/MinoxidilCPS.png";
import finasteridaCpsImg from "@/assets/Produtos/FinasteridaCPS.png";
import dutasteridaCpsImg from "@/assets/Produtos/DutasteridaCPS.png";
import minoxidilSprayImg from "@/assets/Produtos/MinoxidilSpray.png";
import finasteridaSprayImg from "@/assets/Produtos/FinasteridaSpray.png";
import shampooImg from "@/assets/Produtos/SawpalmetoShampoo.png";
import biotinaImg from "@/assets/Produtos/BiotinaCPS.png";

// Componente de Card de Ação Rápida
const ActionCard = ({ title, description, link, linkText, icon: Icon, color }: any) => (
  <Card className="flex flex-col justify-between">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-lg font-bold mb-2 leading-tight">{description}</div>
    </CardContent>
    <CardFooter>
      <Link to={link} className="w-full">
        <Button variant="outline" className="w-full justify-between">
          {linkText}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </Link>
    </CardFooter>
  </Card>
);

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<any>(null);
  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Busca Histórico Real e Normalizado
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.get('/accounts/questionnaires/');
        if (response.data && response.data.length > 0) {
          setFullHistory(response.data);
          setAnswers(response.data[0].answers); // Define o mais recente como padrão
        }
      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. Lógica de Protocolo Dinâmico
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

    const allergicFinasterida = allergies.includes("finasterida");
    const allergicMinoxidil = allergies.includes("minoxidil");
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

        {/* CONTEÚDO: PROTOCOLO ATUAL */}
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
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
                    <div className="w-12 h-12 p-1">
                      {prod.img && <img src={prod.img} alt={prod.name} className="w-full h-full object-contain" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{prod.name}</p>
                      <p className="text-[10px] text-gray-500">{prod.sub}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">Assinar Plano</Button>
              </CardFooter>
            </Card>
          </section>
        </TabsContent>

        {/* CONTEÚDO: HISTÓRICO DE RESPOSTAS E REMÉDIOS */}
        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consultas e Respostas</CardTitle>
              <CardDescription>Veja como seu perfil e recomendações mudaram ao longo do tempo.</CardDescription>
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
                        {/* Respostas da época */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" /> Respostas enviadas:
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

                        {/* Remédios recomendados na época */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" /> Recomendação na data:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {pastProtocol?.map((p: any, i: number) => (
                              <div key={i} className="bg-white border p-2 rounded flex items-center gap-2 text-xs w-full">
                                <span className="font-bold">{p.name}</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500">{p.sub}</span>
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

      {/* UPLOAD E FOTOS */}
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

        {/* Histórico - Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Galeria de Evolução</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center text-gray-400">
            <div className="p-4 bg-gray-100 rounded-full mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p>Nenhuma foto enviada ainda.</p>
            <p className="text-xs mt-1">Suas fotos aparecerão aqui após o upload.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}