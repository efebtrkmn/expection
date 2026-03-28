export declare class SendReconciliationDto {
    customerSupplierId: string;
}
export declare class RespondReconciliationDto {
    decision: 'APPROVED' | 'REJECTED';
    note?: string;
}
