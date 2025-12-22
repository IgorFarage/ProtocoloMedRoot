import { useState, useEffect } from "react";
import { Product } from "@/types/store";
import { getLocalImage } from "@/lib/imageMapper";
import placeholderImg from "@/assets/Produtos/MinoxidilSpray.png";

const API_BASE_URL = "http://localhost:8000/api";

interface ProductImageProps {
    product: Product;
    className?: string;
}

export function ProductImage({ product, className }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState<string>("");

    useEffect(() => {
        let newSrc = placeholderImg;

        // 1. PRIORIDADE TOTAL: URL direta do Bitrix (CDN)
        if (product.image_url) {
            newSrc = product.image_url;
        }
        // 2. Se não tiver URL, tenta ID (Legacy/Proxy)
        else if (product.image_id) {
            newSrc = `${API_BASE_URL}/store/image/${product.id}/`;
        }
        // 3. Se não tiver nada do Bitrix, tenta Imagem Local (Fallback)
        else {
            const local = getLocalImage(product.name);
            if (local) newSrc = local;
        }

        setImgSrc(newSrc);
    }, [product]);

    return (
        <img
            src={imgSrc}
            alt={product.name}
            className={className}
            onError={() => {
                // Se a URL do Bitrix falhar (404/403), cai para a imagem local
                console.log(`Falha ao carregar imagem externa para ${product.name}, usando local.`);
                const local = getLocalImage(product.name);
                setImgSrc(local || placeholderImg);
            }}
        />
    );
}