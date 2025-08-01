"use client"

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productsAPI } from "@/lib/api";
import { Loader2, AlertCircle, Package } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  category: string;
  costPrice: number;
  leastPrice: number;
  currentStock: number;
}

interface ProductDropdownProps {
  onSelect: (productId: string) => void;
  selectedProductId: string;
  placeholder?: string;
  categoryFilter?: string;
  showDetails?: boolean;
  disabled?: boolean;
}

export function ProductDropdown({ 
  onSelect, 
  selectedProductId, 
  placeholder = "Select a product",
  categoryFilter,
  showDetails = true,
  disabled = false 
}: ProductDropdownProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError("");
        
        const response = await productsAPI.getAll();
        let productData = response.data || [];
        
        // Filter by category if specified
        if (categoryFilter) {
          productData = productData.filter((product: Product) => product.category === categoryFilter);
        }
        
        setProducts(productData);
        
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [categoryFilter]);

  const getPlaceholderText = () => {
    if (loading) return "Loading products...";
    if (error) return "Error loading products";
    if (products.length === 0) return categoryFilter ? `No ${categoryFilter} products available` : "No products available";
    return placeholder;
  };

  return (
    <Select 
      value={selectedProductId} 
      onValueChange={onSelect} 
      disabled={disabled || loading}
    >
      <SelectTrigger className="h-12">
        <div className="flex items-center gap-2 w-full">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <Package className="w-4 h-4 text-gray-500" />
          )}
          <SelectValue placeholder={getPlaceholderText()} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {products.length > 0 ? (
          products.map((product) => (
            <SelectItem key={product._id} value={product._id}>
              <div className="flex flex-col">
                <span className="font-medium">{product.name}</span>
                {showDetails && (
                  <span className="text-xs text-gray-500">
                    Category: {product.category} • Stock: {product.currentStock} • Price: ${product.leastPrice}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        ) : (
          !loading && (
            <SelectItem value="no-products" disabled>
              {error ? "Error loading products" : "No products found"}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
