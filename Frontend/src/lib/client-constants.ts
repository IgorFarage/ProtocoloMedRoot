
// Imagens dos Produtos
import minoxidilCpsImg from "@/assets/Produtos/MinoxidilCPS.png";
import finasteridaCpsImg from "@/assets/Produtos/FinasteridaCPS.png";
import dutasteridaCpsImg from "@/assets/Produtos/DutasteridaCPS.png";
import minoxidilSprayImg from "@/assets/Produtos/MinoxidilSpray.png";
import finasteridaSprayImg from "@/assets/Produtos/FinasteridaSpray.png";
import shampooImg from "@/assets/Produtos/SawpalmetoShampoo.png";
import biotinaImg from "@/assets/Produtos/BiotinaCPS.png";

export const PRICES: Record<string, number> = {
    "Minoxidil 2.5mg": 49.90,
    "Finasterida 1mg": 39.90,
    "Dutasterida 0.5mg": 89.90,
    "Saw Palmetto": 55.00,
    "Loção Finasterida": 65.00,
    "Loção Minoxidil 5%": 59.90,
    "Shampoo Saw Palmetto": 35.00,
    "Biotina 45ug": 29.90
};

export const INSTRUCTIONS: Record<string, string> = {
    "Minoxidil 2.5mg": "Tomar 1 cápsula via oral pela manhã.",
    "Finasterida 1mg": "Tomar 1 comprimido via oral todos os dias.",
    "Dutasterida 0.5mg": "Tomar 1 cápsula via oral diariamente.",
    "Loção Minoxidil 5%": "Aplicar 6 borrifadas no couro cabeludo seco à noite.",
    "Loção Finasterida": "Aplicar nas áreas afetadas 1x ao dia.",
    "Shampoo Saw Palmetto": "Uso diário. Deixar agir por 3 minutos.",
    "Biotina 45ug": "Tomar 1 cápsula junto com o almoço."
};

export const PRODUCT_IMAGES: Record<string, string> = {
    "Minoxidil 2.5mg": minoxidilCpsImg,
    "Finasterida 1mg": finasteridaCpsImg,
    "Dutasterida 0.5mg": dutasteridaCpsImg,
    "Loção Minoxidil 5%": minoxidilSprayImg,
    "Loção Finasterida": finasteridaSprayImg,
    "Shampoo Saw Palmetto": shampooImg,
    "Biotina 45ug": biotinaImg
};
