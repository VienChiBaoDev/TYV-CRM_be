import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      ok: true,
      service: 'talentmanagment-be',
      lark: {
        syncUsersFromBitable: 'POST /users/sync — đồng bộ Base HR (bitable) → bảng users',
        listUsers: 'GET /users',
        optionalCron: 'Bật LARK_USERS_SYNC_CRON_ENABLED=true để cron mỗi ngày lúc 12:00 trưa',
      },
    };
  }
}

