import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Scope,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Tenant-Aware PrismaService
 *
 * Her veritabanı sorgusundan önce PostgreSQL session değişkeni olarak
 * `app.current_tenant_id` set eder. Bu sayede RLS politikaları devreye
 * girerek sadece ilgili tenant'ın verileri sorgulanır.
 *
 * Kullanım:
 *   const tenantPrisma = prismaService.forTenant(tenantId);
 *   await tenantPrisma.invoice.findMany();
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Geliştirme ortamında sorgu loglaması
    if (process.env.NODE_ENV === 'development') {
      (this as any).$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
      });
    }

    (this as any).$on('error', (e: any) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PostgreSQL bağlantısı kuruldu');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('PostgreSQL bağlantısı kapatıldı');
  }

  /**
   * Tenant-isolated Prisma client döndürür.
   * Her sorgu öncesinde PostgreSQL session'ına tenant_id enjekte eder.
   *
   * NOT: Bu metot transaction dışı kullanım içindir.
   * Transaction içinde kullanmak için withTenantTransaction() kullanın.
   */
  forTenant(tenantId: string): PrismaClient {
    // Prisma $extends ile middleware zinciri
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Tenant ID'yi PostgreSQL session'ına enjekte et
            const [, result] = await (this as any).$transaction([
              (this as any).$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    }) as unknown as PrismaClient;
  }

  /**
   * Tenant-isolated transaction.
   * Transaction başlamadan önce tenant_id set edilir,
   * tüm işlemler aynı bağlantıda çalışır.
   */
  async withTenantTransaction<T>(
    tenantId: string,
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Transaction başında tenant_id set et (true = sadece bu transaction için)
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  /**
   * SuperAdmin bypass: RLS olmadan sorgu (sadece platform admin işlemleri için)
   * Bu metodu dikkatli kullanın — tenant izolasyonu DEVRE DIŞIDIR.
   */
  get admin(): PrismaClient {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Boş tenant_id ile RLS'yi etkisiz bırak (DB kullanıcısı BYPASSRLS yetkisine sahipse)
            const [, result] = await (this as any).$transaction([
              (this as any).$queryRaw`SELECT set_config('app.current_tenant_id', '', true)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    }) as unknown as PrismaClient;
  }

  /**
   * Sağlık kontrolü
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
