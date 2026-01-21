
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Product } from '../types/store';

const CACHE_KEY = '@protocolomed:catalog_cache';
const CACHE_TTL = 1 * 60 * 1000; // 1 minute in milliseconds

interface CachedData {
    timestamp: number;
    data: Product[];
}

export const useProductCatalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);

        try {
            // 1. Check Cache (if not forced)
            if (!force) {
                const cached = sessionStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed: CachedData = JSON.parse(cached);
                    const now = Date.now();

                    if (now - parsed.timestamp < CACHE_TTL) {
                        console.log('⚡ Using Cached Product Catalog');
                        setProducts(parsed.data);
                        setLoading(false);
                        return;
                    }
                }
            }

            // 2. Fetch from API
            console.log('🌐 Fetching Product Catalog from API...');
            const response = await api.get('/store/catalog/');

            // 3. Update State and Cache
            const data = response.data;
            setProducts(data);

            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));

        } catch (err) {
            console.error('❌ Error fetching catalog:', err);
            setError('Erro ao carregar produtos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return {
        products,
        loading,
        error,
        refetch: () => fetchProducts(true)
    };
};
