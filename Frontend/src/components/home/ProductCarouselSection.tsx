import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Product } from "@/types/store";
import { ProductCard } from "@/components/store/ProductCard";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export function ProductCarouselSection() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                const response = await api.get("/store/catalog/");
                // Pega TODOS os produtos (sem slice)
                setProducts(response.data);
            } catch (error) {
                console.error("Erro ao carregar produtos para a home:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    if (!loading && products.length === 0) {
        return null;
    }

    return (
        <section className="py-16 bg-white">
            <div className="container px-4 mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                        Nossos Produtos
                    </h2>
                    <p className="text-lg text-slate-600">
                        Conheça as fórmulas e medicamentos aprovados pelos nossos especialistas.
                    </p>
                </div>

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="min-w-[280px] w-full md:w-1/3 lg:w-1/4">
                                <Skeleton className="h-[400px] w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-1">
                        {/* --- CARROSSEL  --- */}
                        <Carousel
                            opts={{
                                align: "start",
                                loop: false,
                            }}
                            className="w-full"
                        >
                            <CarouselContent className="-ml-4 pb-4">
                                {products.map((product) => (
                                    <CarouselItem key={product.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                        <div className="h-full p-1">
                                            {/* Card não clicável no carrossel (sem onClick) */}
                                            <ProductCard product={product} />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <div className="hidden md:block">
                                <CarouselPrevious className="-left-4" />
                                <CarouselNext className="-right-4" />
                            </div>
                        </Carousel>

                        {/* --- BOTÃO --- */}
                        <div className="mt-6 hidden md:flex justify-end">
                            <Link to="/produtos">
                                <Button variant="outline" className="gap-2">
                                    Ver Loja Completa <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Botão Mobile */}
                <div className="mt-8 text-center md:hidden">
                    <Link to="/produtos">
                        <Button className="w-full gap-2">
                            Ver Loja Completa <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}