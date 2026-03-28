import { ProductUnit } from '@prisma/client';
export declare class CreateProductDto {
    code: string;
    name: string;
    description?: string;
    unit: ProductUnit;
    unitPrice: number;
    taxRate: number;
    stockQuantity?: number;
    criticalStockLevel?: number;
    trackStock?: boolean;
    salesAccountCode?: string;
    cogsAccountCode?: string;
    isActive?: boolean;
}
export declare class UpdateProductDto {
    name?: string;
    description?: string;
    unitPrice?: number;
    taxRate?: number;
    criticalStockLevel?: number;
    trackStock?: boolean;
    isActive?: boolean;
}
