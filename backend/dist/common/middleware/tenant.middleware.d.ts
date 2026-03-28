import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class TenantMiddleware implements NestMiddleware {
    private readonly jwtService;
    private readonly configService;
    private readonly prismaService;
    private readonly logger;
    constructor(jwtService: JwtService, configService: ConfigService, prismaService: PrismaService);
    use(req: Request & {
        tenantId?: string;
    }, res: Response, next: NextFunction): Promise<void>;
    private isValidUuid;
}
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
        }
    }
}
