import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientData } from "@/hooks/useClientData";
import { INSTRUCTIONS, PRICES } from "@/lib/client-constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Calendar, X, Maximize2 } from "lucide-react";

import { ProductCard } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { Product } from "@/types/store";

export default function ClientProtocol() {
    const navigate = useNavigate();
    const { loading, currentProtocol, activeProtocol, answers, profile } = useClientData();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    // LISTA DE PRODUTOS: Prioriza API (activeProtocol.products) > Fallback Local (currentProtocol)
    const rawProducts = (activeProtocol?.products && activeProtocol.products.length > 0)
        ? activeProtocol.products
        : currentProtocol;

    if (!rawProducts || rawProducts.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Nenhum protocolo ativo encontrado. Responda o questionário primeiro.
            </div>
        );
    }

    // Map to Store Product Type
    const displayProducts: Product[] = rawProducts.map((p: any, idx: number) => ({
        id: p.id || `local-${idx}`,
        name: p.name,
        price: p.price || PRICES[p.name] || 0,
        description: p.description || p.sub || "Protocolo Personalizado",
        image_url: p.img,
        category_id: "protocol"
    }));

    // Preço Total
    const totalPrice = (activeProtocol?.total_value !== undefined && activeProtocol?.total_value !== null)
        ? activeProtocol.total_value
        : displayProducts.reduce((acc, p) => acc + p.price, 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Seu Protocolo</h1>
                <p className="text-muted-foreground mt-2">
                    Baseado na sua triagem do dia {answers?.created_at ? new Date(answers.created_at).toLocaleDateString() : 'recente'}.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onClick={(p) => {
                            setSelectedProduct(p);
                        }}
                    />
                ))}
            </div>

            <Card className="bg-slate-900 text-white border-none mt-8">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Valor Mensal do Kit</h3>
                        <p className="text-slate-400">Entrega automática todo mês. Cancele quando quiser.</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-3xl font-bold text-green-400">
                            {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {profile?.plan !== 'plus' && (
                            <Button
                                size="lg"
                                className="bg-green-500 hover:bg-green-600 text-black font-bold h-12 px-8"
                                onClick={() => {
                                    // Se for Standard, vai para Upgrade (Diferença de Serviço). Se for None, vai para checkout full.
                                    navigate("/planos", { state: { isUpgrade: true } });
                                }}
                            >
                                Melhorar Plano (Upgrade)
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* PRODUCT DETAIL MODAL (Matching ProductCatalog) */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="max-w-4xl w-[95%] p-0 overflow-hidden bg-white rounded-xl h-auto md:h-[600px] flex flex-col md:flex-row">

                    {/* Lado Esquerdo: Imagem */}
                    <div className="bg-gray-50 w-full md:w-1/2 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-100 h-[250px] md:h-full">
                        {selectedProduct && (
                            <ProductImage
                                product={selectedProduct}
                                className="object-contain w-full h-full max-h-[300px] md:max-h-[400px] mix-blend-multiply"
                            />
                        )}
                    </div>

                    {/* Lado Direito: Info */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col h-[60%] md:h-full">
                        <DialogHeader className="mb-4 shrink-0">
                            <DialogTitle className="text-2xl font-bold text-gray-900">
                                {selectedProduct?.name}
                            </DialogTitle>
                            <div className="text-xl font-semibold text-primary mt-2">
                                {selectedProduct && (selectedProduct.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto pr-2 border border-gray-100 rounded-md p-3 mb-4 bg-gray-50/50">
                            <div className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                                <div dangerouslySetInnerHTML={{
                                    __html: selectedProduct?.description || "Sem descrição detalhada."
                                }} />
                            </div>
                        </div>

                        <Button className="w-full mt-auto" onClick={() => setSelectedProduct(null)}>
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
