import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "@/types/store";
import { ProductImage } from "./ProductImage";
import { cn } from "@/lib/utils"; // Utilitário padrão do shadcn/ui para juntar classes

interface ProductCardProps {
    product: Product;
    onClick?: (product: Product) => void; // <--- AGORA É OPCIONAL
}

export function ProductCard({ product, onClick }: ProductCardProps) {
    // Verifica se é interativo (tem função de click)
    const isInteractive = !!onClick;

    return (
        <Card
            className={cn(
                "flex flex-col h-full transition-all duration-300 border-gray-100",
                // Só aplica cursor e hover forte se for interativo
                isInteractive ? "cursor-pointer hover:shadow-xl group" : "cursor-default"
            )}
            onClick={() => {
                if (isInteractive) {
                    onClick(product);
                }
            }}
        >
            <CardHeader className="p-0 overflow-hidden rounded-t-lg bg-gray-50 relative">
                <div className={cn(
                    "aspect-square w-full flex items-center justify-center p-6 transition-transform duration-500",
                    isInteractive ? "group-hover:scale-105" : ""
                )}>
                    <ProductImage
                        product={product}
                        className="object-contain h-full w-full mix-blend-multiply"
                    />
                </div>

                {/* Badge "Ver Detalhes" só aparece se for interativo */}
                {isInteractive && (
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-xs font-semibold px-3 py-1 rounded-full shadow-sm text-gray-700">
                            Ver Detalhes
                        </span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 p-5 text-center flex flex-col items-center justify-center space-y-2">
                <CardTitle className={cn(
                    "text-lg leading-tight font-bold text-gray-800 transition-colors",
                    isInteractive ? "group-hover:text-primary" : ""
                )}>
                    {product.name}
                </CardTitle>
            </CardContent>
        </Card>
    );
}