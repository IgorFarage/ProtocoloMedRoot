import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { Product } from "@/types/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useProductCatalog } from "@/hooks/useProductCatalog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

export default function ProductCatalog() {
    const { products, loading, error } = useProductCatalog();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);


    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50/50">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                        Nossos Produtos
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Clique nos produtos para ver detalhes, composições e indicações de uso.
                    </p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onClick={(p) => setSelectedProduct(p)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* --- MODAL DE DETALHES DO PRODUTO (CORRIGIDO) --- */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="max-w-4xl w-[95%] p-0 overflow-hidden bg-white rounded-xl h-auto md:h-[600px] flex flex-col md:flex-row">

                    {/* Lado Esquerdo: Imagem Grande */}
                    <div className="bg-gray-50 w-full md:w-1/2 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-100 h-[250px] md:h-full">
                        {selectedProduct && (
                            <ProductImage
                                key={selectedProduct.id} // Força recriar a imagem ao trocar produto
                                product={selectedProduct}
                                className="object-contain w-full h-full max-h-[300px] md:max-h-[400px] mix-blend-multiply"
                            />
                        )}
                    </div>

                    {/* Lado Direito: Informações */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col h-[60%] md:h-full">
                        <DialogHeader className="mb-4 shrink-0">
                            <DialogTitle className="text-2xl font-bold text-gray-900">
                                {selectedProduct?.name}
                            </DialogTitle>
                            {/* <div className="text-xl font-semibold text-primary mt-1">
                                {selectedProduct && formatPrice(selectedProduct.price)}
                            </div> */}
                        </DialogHeader>

                        {/* ÁREA DE DESCRIÇÃO COM ROLAGEM */}
                        <div className="flex-1 overflow-y-auto pr-2 border border-gray-100 rounded-md p-3 mb-4 bg-gray-50/50">
                            <div className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                                <div dangerouslySetInnerHTML={{
                                    __html: selectedProduct?.description || "Sem descrição detalhada."
                                }} />
                            </div>
                        </div>

                    </div>
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
}