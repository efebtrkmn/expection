import { ClientAuthService } from './client-auth.service';
import { ClientRegisterDto, ClientLoginDto } from './dto/client-login.dto';
export declare class ClientAuthController {
    private readonly clientAuthService;
    constructor(clientAuthService: ClientAuthService);
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
