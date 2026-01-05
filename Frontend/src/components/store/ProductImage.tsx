import { useState, useEffect } from "react";
import { Product } from "@/types/store";
import { getLocalImage } from "@/lib/imageMapper";
import { cn } from "@/lib/utils";

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    product: Product;
}

export function ProductImage({ product, className, ...props }: ProductImageProps) {
    const [src, setSrc] = useState<string>("");

    useEffect(() => {
        // 1. PRIORIDADE: URL direta do Bitrix
        if (product.image_url) {
            setSrc(product.image_url);
            return;
        }

        // 2. FALLBACK 1: Imagem Local (baseada no nome)
        const local = getLocalImage(product.name);
        if (local) {
            setSrc(local);
            return;
        }

        // 3. FALLBACK FINAL: Placeholder genérico (na pasta public)
        setSrc("/placeholder.svg");
    }, [product]);

    return (
        <img
            src={src}
            alt={product.name}
            className={cn("object-contain transition-opacity duration-300", className)}
            loading="lazy"
            onError={(e) => {
                // Se a URL do Bitrix falhar (404), tenta a local
                const target = e.currentTarget;
                const local = getLocalImage(product.name);

                if (target.src !== local && local) {
                    target.src = local;
                } else if (target.src !== "/placeholder.svg") {
                    target.src = "/placeholder.svg";
                }
            }}
            {...props}
        />
    );
}