import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly configService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, configService: ConfigService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleStockAlertEvent(payload: {
        tenantId: string;
        productId: string;
        productName: string;
        currentStock: number;
        criticalLevel: number;
    }): void;
    handleInvoiceCreatedEvent(payload: {
        tenantId: string;
        invoiceNumber: string;
        totalAmount: number;
    }): void;
}
