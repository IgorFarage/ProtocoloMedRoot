// Importe as imagens que você já tem no projeto
import BiotinaCPS from "@/assets/Produtos/BiotinaCPS.png";
import DutasteridaCPS from "@/assets/Produtos/DutasteridaCPS.png";
import FinasteridaCPS from "@/assets/Produtos/FinasteridaCPS.png";
import FinasteridaSpray from "@/assets/Produtos/FinasteridaSpray.png";
import MinoxidilCPS from "@/assets/Produtos/MinoxidilCPS.png";
import MinoxidilSpray from "@/assets/Produtos/MinoxidilSpray.png";
import SawpalmetoShampoo from "@/assets/Produtos/SawpalmetoShampoo.png";

export const getLocalImage = (productName: string) => {
    // Normaliza para minúsculas para facilitar a busca
    const name = productName.toLowerCase();

    // Lógica de "De-Para" baseada nos nomes que vimos no terminal
    if (name.includes("biotina")) return BiotinaCPS;
    if (name.includes("dutasterida")) return DutasteridaCPS;

    // Diferencia Tópico (Spray) de Cápsula
    if (name.includes("finasterida") && name.includes("tópico")) return FinasteridaSpray;
    if (name.includes("finasterida")) return FinasteridaCPS;

    if (name.includes("minoxidil") && name.includes("tópico")) return MinoxidilSpray;
    if (name.includes("minoxidil")) return MinoxidilCPS;

    if (name.includes("shampoo") || name.includes("saw")) return SawpalmetoShampoo;

    return null; // Se não achar nada, retorna null (vai pro placeholder genérico)
};