import { CatalogServiceController } from './catalog-service.controller';
import { CatalogServiceService } from './catalog-service.service';
import { ServiceGroupController } from './service-group.controller';
import { ServiceGroupService } from './service-group.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [ServiceGroupController, CatalogServiceController],
  providers: [ServiceGroupService, CatalogServiceService],
})
export class ServiceCatalogModule {}
