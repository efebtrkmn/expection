import { ProductsService } from '../../products/products.service';
export declare class InvoiceStockListener {
    private readonly productsService;
    private readonly logger;
    constructor(productsService: ProductsService);
    handleStockUpdates(payload: {
        tenantId: string;
        invoice: any;
    }): Promise<void>;
}
