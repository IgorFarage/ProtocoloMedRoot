import { useState, useEffect, useRef } from "react";
import { medicalService, EvolutionPhoto } from "@/services/medicalService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Camera, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const EvolutionGallery = () => {
    const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const fetchPhotos = async () => {
        try {
            setLoading(true);
            const data = await medicalService.getEvolutionPhotos();
            setPhotos(data);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar galeria",
                description: "Não foi possível buscar as fotos de evolução."
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, []);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validar tipo e tamanho (ex: max 5MB)
        if (!file.type.startsWith('image/')) {
            toast({
                variant: "destructive",
                title: "Arquivo inválido",
                description: "Por favor selecione apenas imagens."
            });
            return;
        }

        try {
            setUploading(true);
            const newPhoto = await medicalService.uploadEvolutionPhoto(file);
            setPhotos([newPhoto, ...photos]);
            toast({
                title: "Foto enviada!",
                description: "Sua evolução foi registrada com sucesso."
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro no upload",
                description: "Falha ao enviar a imagem. Tente novamente."
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Galeria de Evolução
                    <Button onClick={triggerFileInput} disabled={uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploading ? "Enviando..." : "Nova Foto"}
                    </Button>
                </CardTitle>
                <CardDescription>Registre seu progresso visualmente. Suas fotos são privadas e analisadas apenas pela equipe médica.</CardDescription>
            </CardHeader>
            <CardContent>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                {photos.length === 0 ? (
                    <div
                        onClick={triggerFileInput}
                        className="border-2 border-dashed border-gray-200 rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                        <Camera className="w-12 h-12 mb-4 opacity-50" />
                        <p className="font-medium">Nenhuma foto registrada</p>
                        <p className="text-sm">Clique para adicionar sua primeira foto de evolução</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map((photo) => (
                            <Dialog key={photo.id}>
                                <DialogTrigger asChild>
                                    <div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                        <img
                                            src={photo.photo}
                                            alt={`Evolução ${new Date(photo.taken_at).toLocaleDateString()}`}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs backdrop-blur-sm">
                                            <p className="font-medium text-center">
                                                {new Date(photo.taken_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl border-none bg-transparent shadow-none p-0">
                                    <DialogTitle className="sr-only">Visualização da Evolução</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Foto registrada em {new Date(photo.taken_at).toLocaleDateString()}.
                                    </DialogDescription>
                                    <div className="relative rounded-lg overflow-hidden bg-black">
                                        <img
                                            src={photo.photo}
                                            alt="Evolução Fullsize"
                                            className="w-full h-auto max-h-[80vh] object-contain"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                )}

                <div className="mt-8 bg-blue-50 p-4 rounded-lg flex gap-3 items-start border border-blue-100">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-medium text-blue-900 text-sm">Dica de Registro</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Tente tirar as fotos sempre no mesmo local, com a mesma iluminação e ângulo para facilitar a comparação da evolução capilar.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
