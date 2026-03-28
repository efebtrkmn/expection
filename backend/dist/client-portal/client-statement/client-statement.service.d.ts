import { PrismaService } from '../../prisma/prisma.service';
export declare class ClientStatementService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateStatementPdf(contactId: string, tenantId: string): Promise<Buffer>;
    private buildStatementHtml;
    private statusLabels;
}
