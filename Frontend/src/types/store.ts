export interface Product {
    id: string | number;
    name: string;
    price: number;
    description: string;
    image_id?: string | number | null; // O ID que vem do Bitrix
    image_url?: string; // Caso o backend já devolva a URL tratada
}