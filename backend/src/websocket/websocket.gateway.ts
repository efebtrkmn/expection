import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' }, // Canlı ortamda sadece belirlenen domain(ler) yapılmalı
  namespace: 'ws',
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * İstemci (Client) WebSocket bağlantısı açmak istediğinde tetiklenir
   */
  async handleConnection(client: Socket) {
    try {
      // 1. Handshake veya Header üzerinden JWT token oku
      const token = 
        client.handshake.auth?.token || 
        client.handshake.headers['authorization']?.split(' ')[1];
        
      if (!token) {
        throw new Error('No token provided');
      }

      // 2. Token Geçerliliğini Doğrula
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 3. Multi-Tenant İzolasyonu (Tenant Odasına Katılma)
      const tenantId = payload.tenantId;
      client.join(`tenant:${tenantId}`);
      
      // Kullanıcı bazlı bir oda da açılabilir (Admin vs Client ayrımı için)
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client Configured. ID: ${client.id}, Tenant Room: tenant:${tenantId}`);
    } catch (error) {
      this.logger.warn(`Unauthorized WebSocket connection attempt: ${error.message}`);
      // Token hatalıysa veya yoksa bağlantıyı kopar
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client Disconnected. ID: ${client.id}`);
  }

  /**
   * Event-Driven Mimari Üzerinden Gelen Kritik Stok Olaylarını Dinler.
   * ProductsService içindeki reduceStockLevels metodundan tetiklenir.
   */
  @OnEvent('stock.alert')
  handleStockAlertEvent(payload: {
    tenantId: string;
    productId: string;
    productName: string;
    currentStock: number;
    criticalLevel: number;
  }) {
    this.logger.log(`[EVENT] Broadasting Stock Alert for ${payload.productName} in Tenant: ${payload.tenantId}`);
    
    // Yalnızca ilgili Tenant'ın odasındaki kullanıcılara 'stock.alert' emiti gönderilir
    this.server.to(`tenant:${payload.tenantId}`).emit('stock.alert', {
      message: 'Kritik Stok Uyarısı',
      details: payload,
    });
  }

  /**
   * Fatura kesildiğinde (veya e-Fatura GİB'den başarılı döndüğünde) anlık uyarı göndermek için
   */
  @OnEvent('invoice.created')
  handleInvoiceCreatedEvent(payload: {
    tenantId: string;
    invoiceNumber: string;
    totalAmount: number;
  }) {
    this.server.to(`tenant:${payload.tenantId}`).emit('invoice.created', {
      message: `Yeni fatura oluşturuldu: ${payload.invoiceNumber}`,
      details: payload,
    });
  }
}
