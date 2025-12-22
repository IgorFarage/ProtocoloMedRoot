import { useState, useEffect } from "react";
import { Product } from "@/types/store";
import { getLocalImage } from "@/lib/imageMapper";
import placeholderImg from "@/assets/Produtos/MinoxidilSpray.png";

// Ajuste a URL base conforme seu ambiente
const API_BASE_URL = "http://localhost:8000/api";

interface ProductImageProps {
    product: Product;
    className?: string;
}

export function ProductImage({ product, className }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState<string>("");

    // Este useEffect garante que a imagem atualize sempre que o produto mudar
    useEffect(() => {
        let newSrc = placeholderImg;

        // 1. Tenta Proxy do Bitrix
        if (product.image_id) {
            newSrc = `${API_BASE_URL}/store/image/${product.id}/`;
        } else {
            // 2. Tenta Local
            const local = getLocalImage(product.name);
            if (local) newSrc = local;
        }

        setImgSrc(newSrc);
    }, [product]); // <--- A mágica acontece aqui: monitora mudanças no produto

    return (
        <img
            src={imgSrc}
            alt={product.name}
            className={className}
            onError={() => {
                // Se der erro (ex: 404), tenta local ou placeholder
                const local = getLocalImage(product.name);
                setImgSrc(local || placeholderImg);
            }}
        />
    );
}