import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { JournalService } from '../../journal/journal.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class IyzicoCallbackService {
    private readonly prisma;
    private readonly httpService;
    private readonly config;
    private readonly mailService;
    private readonly journalService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, httpService: HttpService, config: ConfigService, mailService: MailService, journalService: JournalService, eventEmitter: EventEmitter2);
    handleCallback(payload: Record<string, string>, iyzicoSignature?: string): Promise<{
        received: boolean;
    }>;
    private handleSuccessfulPayment;
    private handleFailedPayment;
    private createCollectionJournalEntry;
    private decrypt;
}
