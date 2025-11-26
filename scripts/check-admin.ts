import dotenv from 'dotenv';
import path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Load apps/web/.env.local if DATABASE_URL is missing
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.log('Loading env from apps/web/.env.local...');
    dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
}

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdminUser() {
    try {
        const adminEmail = 'admin.demo@collabverse.test';
        const adminUser = await db
            .select()
            .from(users)
            .where(eq(users.email, adminEmail))
            .limit(1);

        if (adminUser.length > 0) {
            console.log('✅ Демо-администратор найден в базе данных:');
            console.log(JSON.stringify(adminUser[0], null, 2));
            console.log('\nПароль установлен:', adminUser[0].passwordHash ? 'Да' : 'Нет');
        } else {
            console.log('❌ Демо-администратор НЕ найден в базе данных');
            console.log('Нужно запустить инициализацию демо-аккаунтов');
        }
    } catch (error) {
        console.error('Ошибка при проверке:', error);
    } finally {
        process.exit(0);
    }
}

checkAdminUser();
