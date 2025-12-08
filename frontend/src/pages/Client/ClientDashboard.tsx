import { Link } from "react-router-dom";
import * as Recharts from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/auth/AuthProvider"; // Para a função logout
import { ChevronRight, Heart, TrendingUp, Calendar, UserCheck, Upload, LogOut } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useState } from "react";

// ===============================================
// IMPORTAÇÃO DE ASSETS (PLACEHOLDERS)
// [ATENÇÃO] Verifique se os caminhos correspondem à localização das suas imagens.
// ===============================================
import Photo1 from "@/assets/Images/careca01.jpg";
import Photo2 from "@/assets/Images/careca02.jpg";
import Photo3 from "@/assets/Images/careca03.jpg";
import Photo4 from "@/assets/Images/careca04.jpg";

// ===============================================
// DADOS DE EXEMPLO E TIPOS
// ===============================================

const progressChartData = [
  { month: "Jan", score: 46 },
  { month: "Fev", score: 52 },
  { month: "Mar", score: 66 },
  { month: "Abr", score: 73 },
];

interface PhotoHistoryItem {
  id: number;
  date: string;
  src: string;
}

const photoHistory: PhotoHistoryItem[] = [
  { id: 1, date: "15/Out/2024", src: Photo1 },
  { id: 2, date: "15/Set/2024", src: Photo2 },
  { id: 3, date: "15/Ago/2024", src: Photo3 },
  { id: 4, date: "15/Jul/2024", src: Photo4 },
];

// ===============================================
// COMPONENTES AUXILIARES
// ===============================================

const ActionCard = ({ title, description, link, linkText, icon: Icon, color }: { title: string, description: string, link: string, linkText: string, icon: React.ElementType, color: string }) => (
  <Card className="flex flex-col justify-between">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold mb-2">{description}</div>
    </CardContent>
    <CardFooter>
      <Link to={link}>
        <Button variant="outline" className="w-full justify-between">
          {linkText}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </Link>
    </CardFooter>
  </Card>
);

// ===============================================
// DASHBOARD PRINCIPAL (CLIENTE)
// ===============================================

export const ClientDashboard = () => {
  const userName = "João"; // Deve vir do AuthProvider
  const { logout } = useAuth(); // Obtém a função de logout
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handlePhotoSubmit = () => {
    if (uploadedFile) {
      console.log("Enviando foto:", uploadedFile.name);
      // Adicionar lógica de envio ao backend aqui
      setUploadedFile(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">

      {/* 1. Welcome e Botão Sair (Logout) */}
      <header className="space-y-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Olá, {userName}!</h1>
            <p className="text-lg text-muted-foreground">Bem-vindo à sua central de saúde personalizada.</p>
          </div>
          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Link to="/perfil">
              <Button variant="outline" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Meu perfil
              </Button>
            </Link>
            <Button
              onClick={logout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Alert className="bg-primary text-primary-foreground border-primary/50">
          <Calendar className="h-4 w-4" />
          <AlertTitle>Seu próximo passo é importante!</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="font-semibold">Sua próxima consulta de acompanhamento está agendada para 05/Dez.</span>
            <Link to="/agendamento">
              <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100 ml-2">
                Ver agendamentos
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </header>

      <Separator />

      {/* 2. Cartões de Status e Ações Rápidas */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estágio de queda</CardTitle>
            <Heart className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">Moderado</div>
            <p className="text-xs text-muted-foreground mt-1">Requer atenção especial.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seu médico</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Dr. Protótipo Silva</div>
            <p className="text-xs text-muted-foreground mt-1">Especialista em tricologia.</p>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Link to="/SeuProtocolo" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                Histórico de prescrição
              </Button>
            </Link>
            <Link to="/PerfilMedico" className="text-sm text-primary hover:underline flex items-center self-end justify-end">
              Ver perfil
            </Link>
          </CardFooter>
        </Card>

        <ActionCard
          title="Próxima Avaliação"
          description="Sua saúde evolui. Mantenha seu plano atualizado."
          link="/questionario"
          linkText="Iniciar Reavaliação"
          icon={TrendingUp}
          color="text-green-600"
        />

        <ActionCard
          title="Suporte Dedicado"
          description="Dúvidas? Fale com nossa equipe de saúde agora."
          link="/contato"
          linkText="Falar por Chat"
          icon={Heart}
          color="text-orange-500"
        />
      </section>

      {/* 3. Seção de Progresso e Histórico (Gráfico) */}
      <section className="grid gap-6 lg:grid-cols-3">

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de evolução</CardTitle>
            <CardDescription>Visualização do seu progresso nos últimos 4 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer
                config={{ score: { label: "Score de Risco", color: "hsl(var(--primary))" } }}
                className="h-[300px] w-full"
              >
                <Recharts.LineChart data={progressChartData}>
                  <Recharts.CartesianGrid vertical={false} strokeDasharray="4 4" />

                  <Recharts.XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />

                  <Recharts.YAxis
                    dataKey="score"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    domain={[40, 90]}
                  />

                  <ChartTooltip content={<ChartTooltipContent />} />

                  <Recharts.Line
                    dataKey="score"
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(var(--primary))",
                    }}
                    activeDot={{
                      r: 6,
                      fill: "hsl(var(--primary))",
                      stroke: "hsl(var(--primary) / 0.5)",
                    }}
                  />
                </Recharts.LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu protocolo de tratamento</CardTitle>
            <CardDescription>Protocolo ativo: plano essencial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">Status:</h4>
              <p className="text-sm text-muted-foreground font-semibold">Em andamento</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">Próxima entrega:</h4>
              <p className="text-sm text-muted-foreground">15 de dezembro</p>
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/SeuProtocolo">
              <Button variant="default" className="w-full">
                Gerenciar plano
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </section>

      {/* 4. Upload e Histórico de Fotos */}
      <section className="grid gap-6 lg:grid-cols-3">

        {/* Área 1: Upload de Fotos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upload semanal de fotos</CardTitle>
            <CardDescription>Mantenha seu médico atualizado com seu progresso visual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedFile ? (
              <div className="border p-4 rounded-lg flex items-center justify-between bg-primary/10">
                <span className="text-sm font-medium truncate">{uploadedFile.name}</span>
                <Button variant="destructive" size="sm" onClick={() => setUploadedFile(null)}>
                  Remover
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer bg-muted/50">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Arraste ou clique para carregar (JPEG/PNG)</span>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handlePhotoSubmit}
              disabled={!uploadedFile}
              className="w-full"
            >
              Enviar foto de progresso
            </Button>
          </CardFooter>
        </Card>

        {/* Área 2: Histórico de Fotos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico visual ({photoHistory.length} registros)</CardTitle>
            <CardDescription>Suas fotos passadas para comparação e análise.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 w-full pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photoHistory.map((photo) => (
                  <div key={photo.id} className="relative aspect-[4/5] rounded-lg overflow-hidden border border-border bg-muted">

                    <img
                      src={photo.src}
                      alt={`Foto de progresso de ${photo.date}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-background/70 backdrop-blur-sm p-1 text-center">
                      <small className="text-xs font-medium text-foreground">{photo.date}</small>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

    </div>
  );
};

export default ClientDashboard;