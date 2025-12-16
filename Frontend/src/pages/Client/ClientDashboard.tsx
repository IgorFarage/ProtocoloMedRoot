import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/auth/AuthProvider";
import { ChevronRight, Heart, TrendingUp, UserCheck, Upload, LogOut, ShoppingBag, FileText, AlertCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  // 1. Busca Histórico Real
  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await api.get('/accounts/questionnaires/');
        if (response.data && response.data.length > 0) {
          setAnswers(response.data[0].answers);
        }
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // 2. Lógica de Protocolo Dinâmico
  const getProtocol = () => {
    if (!answers) return null;

    const shampoo = { name: "Shampoo Saw Palmetto", sub: "Café verde + Mentol", img: shampooImg };
    const biotina = { name: "Biotina 45ug", sub: "Suplemento vitamínico", img: biotinaImg };
    let selectedCapsule = null;
    let selectedSpray = null;

    const gender = answers["F1_Q1_gender"];
    const hasPets = answers["F2_Q18_pets"] === "sim";
    const allergies = answers["F2_Q15_allergy"] || "";
    const priority = answers["F2_Q19_priority"];
    const intervention = answers["F2_Q16_intervention"];

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

    return [selectedCapsule, selectedSpray, shampoo, biotina].filter((p): p is { name: string, sub: string, img: string | null } => p !== null);
  };

  const protocol = getProtocol();

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
      <header className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Olá, {user?.full_name?.split(" ")[0] || "Paciente"}!</h1>
            <p className="text-lg text-muted-foreground">Bem-vindo à sua central de tratamento.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/perfil">
              <Button variant="outline" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> Meu perfil
              </Button>
            </Link>
            <Button onClick={logout} variant="outline" className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        <Alert className="bg-primary/5 border-primary/20 text-primary-800">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <AlertTitle>Status do Pedido: Em Análise</AlertTitle>
          <AlertDescription>
            Nossa equipe médica está revisando suas respostas para liberar a prescrição.
          </AlertDescription>
        </Alert>
      </header>

      <Separator />

      {/* STATS */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estágio de queda</CardTitle>
            <Heart className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive capitalize">
              {answers?.["F1_Q2_stage"]?.replace('_', ' ') || "--"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Conforme sua anamnese.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Médico Responsável</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Equipe ProtocoloMed</div>
            <p className="text-xs text-muted-foreground mt-1">Especialistas em Tricologia</p>
          </CardContent>
        </Card>

        <ActionCard
          title="Nova Avaliação"
          description="Mudança no quadro?"
          link="/questionnaire"
          linkText="Refazer Anamnese"
          icon={TrendingUp}
          color="text-green-600"
        />

        <ActionCard
          title="Suporte"
          description="Fale com a equipe."
          link="/contato"
          linkText="Chat Online"
          icon={Heart}
          color="text-orange-500"
        />
      </section>

      {/* ÁREA CENTRAL: GRÁFICO (Placeholder) E PROTOCOLO */}
      <section className="grid gap-6 lg:grid-cols-3">

        {/* Gráfico - Estado Vazio */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do Tratamento</CardTitle>
            <CardDescription>Acompanhe seu progresso ao longo dos meses.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px] bg-gray-50/50 rounded-lg border border-dashed m-4">
            <TrendingUp className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500">Gráfico indisponível</h3>
            <p className="text-sm text-gray-400 text-center max-w-sm mt-2">
              Seu gráfico de densidade capilar será gerado automaticamente após o início do tratamento e envio das primeiras fotos.
            </p>
          </CardContent>
        </Card>

        {/* Protocolo - Dinâmico */}
        <Card className="flex flex-col h-full border-primary/20 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Protocolo Sugerido
            </CardTitle>
            <CardDescription>Produtos baseados no seu perfil</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {loading ? (
              <p className="text-center text-sm text-gray-500">Carregando...</p>
            ) : !protocol ? (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Responda a anamnese para ver seu protocolo.</p>
                <Link to="/questionnaire"><Button size="sm" className="mt-4">Iniciar</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {protocol.map((prod, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
                    <div className="w-12 h-12 flex-shrink-0 p-1">
                      {prod.img && <img src={prod.img} alt={prod.name} className="w-full h-full object-contain" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{prod.name}</p>
                      <p className="text-[10px] text-gray-500">{prod.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {protocol && (
            <CardFooter>
              <Button className="w-full">Prosseguir para Assinatura</Button>
            </CardFooter>
          )}
        </Card>
      </section>

      {/* UPLOAD E FOTOS - Estado Vazio */}
      <section className="grid gap-6 lg:grid-cols-3">

        {/* Card de Upload */}
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

        {/* Histórico - Estado Vazio */}
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