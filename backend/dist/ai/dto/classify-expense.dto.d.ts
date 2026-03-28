export declare enum AiInputTypeDto {
    BANK_TX = "BANK_TX",
    RECEIPT = "RECEIPT",
    MANUAL_ENTRY = "MANUAL_ENTRY"
}
export declare class ClassifyExpenseDto {
    inputText: string;
    inputType?: AiInputTypeDto;
    referenceId?: string;
}
export declare class ReviewClassificationDto {
    accountCode: string;
    note?: string;
}
