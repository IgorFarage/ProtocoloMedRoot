export interface Product {
    id: string | number;
    name: string;
    price: number;
    description: string;
    category_id?: string | number;
    image_url?: string | null; // <--- O Campo NOVO e Importante
}

export interface CartItem extends Product {
    quantity: number;
}