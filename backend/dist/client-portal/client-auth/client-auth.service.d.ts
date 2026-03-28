import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ClientRegisterDto, ClientLoginDto } from './dto/client-login.dto';
export declare class ClientAuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly mailService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, mailService: MailService, config: ConfigService);
    register(dto: ClientRegisterDto): Promise<{
        message: string;
        clientUserId: string;
    }>;
    login(dto: ClientLoginDto): Promise<{
        accessToken: string;
        clientName: string;
        email: string;
    }>;
}
