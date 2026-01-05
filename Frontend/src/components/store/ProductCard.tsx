import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Product } from "@/types/store";
import { ProductImage } from "./ProductImage"; // Importa do mesmo diretório
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
    product: Product;
    onClick?: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
    const isInteractive = !!onClick;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    return (
        <Card
            className={cn(
                "flex flex-col h-full transition-all duration-300 border-gray-100 overflow-hidden",
                isInteractive ? "cursor-pointer hover:shadow-xl hover:border-primary/20 group" : "cursor-default"
            )}
            onClick={() => isInteractive && onClick(product)}
        >
            <CardHeader className="p-0 bg-gray-50 relative aspect-square">
                <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                    <ProductImage
                        product={product}
                        className={cn(
                            "w-full h-full mix-blend-multiply transition-transform duration-500",
                            isInteractive ? "group-hover:scale-110" : ""
                        )}
                    />
                </div>

                {isInteractive && (
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-xs font-semibold px-3 py-1 rounded-full shadow-sm text-gray-700 backdrop-blur-sm">
                            Ver Detalhes
                        </span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 p-5 text-center flex flex-col items-center justify-start space-y-2">
                <CardTitle className={cn(
                    "text-lg font-bold text-gray-800 line-clamp-2 transition-colors",
                    isInteractive ? "group-hover:text-primary" : ""
                )}>
                    {product.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description?.replace(/<[^>]*>?/gm, '') || "Sem descrição."}
                </p>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-center pb-6">
                <span className="text-lg font-bold text-primary">
                    {formatPrice(product.price)}
                </span>
            </CardFooter>
        </Card>
    );
}