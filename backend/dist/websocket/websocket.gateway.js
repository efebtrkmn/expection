"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppWebSocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppWebSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
let AppWebSocketGateway = AppWebSocketGateway_1 = class AppWebSocketGateway {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(AppWebSocketGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers['authorization']?.split(' ')[1];
            if (!token) {
                throw new Error('No token provided');
            }
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const tenantId = payload.tenantId;
            client.join(`tenant:${tenantId}`);
            client.join(`user:${payload.sub}`);
            this.logger.log(`Client Configured. ID: ${client.id}, Tenant Room: tenant:${tenantId}`);
        }
        catch (error) {
            this.logger.warn(`Unauthorized WebSocket connection attempt: ${error.message}`);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client Disconnected. ID: ${client.id}`);
    }
    handleStockAlertEvent(payload) {
        this.logger.log(`[EVENT] Broadasting Stock Alert for ${payload.productName} in Tenant: ${payload.tenantId}`);
        this.server.to(`tenant:${payload.tenantId}`).emit('stock.alert', {
            message: 'Kritik Stok Uyarısı',
            details: payload,
        });
    }
    handleInvoiceCreatedEvent(payload) {
        this.server.to(`tenant:${payload.tenantId}`).emit('invoice.created', {
            message: `Yeni fatura oluşturuldu: ${payload.invoiceNumber}`,
            details: payload,
        });
    }
};
exports.AppWebSocketGateway = AppWebSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppWebSocketGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)('stock.alert'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppWebSocketGateway.prototype, "handleStockAlertEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppWebSocketGateway.prototype, "handleInvoiceCreatedEvent", null);
exports.AppWebSocketGateway = AppWebSocketGateway = AppWebSocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: 'ws',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], AppWebSocketGateway);
//# sourceMappingURL=websocket.gateway.js.map