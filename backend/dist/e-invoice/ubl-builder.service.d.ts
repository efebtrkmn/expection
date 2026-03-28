export declare class UblBuilderService {
    private readonly logger;
    private readonly NAMESPACES;
    buildXml(invoice: any, tenant: any): string;
    private getInvoiceTypeCode;
    private formatDate;
    private formatDecimal;
    private mapUnit;
    private groupByTaxRate;
}
