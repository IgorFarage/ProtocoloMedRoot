import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientData } from "@/hooks/useClientData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, ClipboardList, ShoppingBag, Camera, Upload } from "lucide-react";

export default function ClientSchedule() {
    const { loading, fullHistory, calculateProtocol } = useClientData();

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
                <p className="text-muted-foreground mt-2">
                    Acompanhe sua evolução e histórico de tratamentos.
                </p>
            </div>

            <Tabs defaultValue="photos" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="photos">Minhas Fotos</TabsTrigger>
                    <TabsTrigger value="history">Tratamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="mt-6">
                    <ScrollArea className="h-[calc(100vh-250px)]">
                        <div className="space-y-4 pr-4">
                            {fullHistory.length === 0 && (
                                <p className="text-muted-foreground">Nenhum registro encontrado no histórico.</p>
                            )}

                            {fullHistory.map((entry, index) => {
                                const protocol = calculateProtocol(entry.answers);
                                const isCurrent = index === 0;

                                return (
                                    <Card key={entry.id || index} className={`transition-all ${isCurrent ? 'border-primary shadow-md' : 'opacity-80 hover:opacity-100'}`}>
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                                    {new Date(entry.created_at).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                                                </CardTitle>
                                                <CardDescription>
                                                    {isCurrent ? "Protocolo Ativo" : "Protocolo Anterior"}
                                                </CardDescription>
                                            </div>
                                            {isCurrent && <Badge className="bg-green-600">Atual</Badge>}
                                        </CardHeader>
                                        <CardContent className="pt-4 grid md:grid-cols-2 gap-6">
                                            {/* Respostas Resumidas */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2 mb-2 text-sm text-gray-900">
                                                    <ClipboardList className="w-4 h-4 text-primary" /> Dados Clínicos
                                                </h4>
                                                <div className="text-sm bg-gray-50 p-3 rounded-lg space-y-1">
                                                    <p><span className="text-muted-foreground">Estágio:</span> {entry.answers.F1_Q2_stage?.replace('_', ' ')}</p>
                                                    <p><span className="text-muted-foreground">Prioridade:</span> {entry.answers.F2_Q19_priority}</p>
                                                    <p><span className="text-muted-foreground">Alergias:</span> {entry.answers.F2_Q15_allergy || "Nenhuma"}</p>
                                                </div>
                                            </div>

                                            {/* Recomendação */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2 mb-2 text-sm text-gray-900">
                                                    <ShoppingBag className="w-4 h-4 text-primary" /> Indicação
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {protocol?.map((p, i) => (
                                                        <Badge key={i} variant="secondary" className="px-2 py-1">
                                                            {p.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="photos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Galeria de Evolução</CardTitle>
                            <CardDescription>Registre seu progresso visualmente enviando fotos periodicamente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Placeholder para fotos */}
                                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors cursor-pointer">
                                    <div className="text-center p-2">
                                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-xs">Adicionar Foto</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start border border-blue-100">
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <Upload className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-900 text-sm">Dica de Registro</h4>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Tente tirar as fotos sempre no mesmo local e com a mesma iluminação para melhor comparação.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
