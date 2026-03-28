import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
export declare class TenantGuard implements CanActivate {
    private readonly prismaService;
    private readonly reflector;
    private readonly logger;
    constructor(prismaService: PrismaService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
