
import { db } from '../apps/api/src/db/config';
import { users } from '../apps/api/src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, 'apps/web/.env.local') });

async function seed() {
    console.log('Seeding demo users...');

    const demoUsers = [
        {
            id: 'demo-user-id',
            name: 'Demo User',
            email: 'user.demo@collabverse.test',
            role: 'user'
        },
        {
            id: 'demo-admin-id',
            name: 'Demo Admin',
            email: 'admin.demo@collabverse.test',
            role: 'admin'
        }
    ];

    for (const u of demoUsers) {
        const existing = await db.select().from(users).where(eq(users.id, u.id));
        if (existing.length === 0) {
            console.log(`Creating user: ${u.name}`);
            await db.insert(users).values({
                id: u.id,
                name: u.name,
                email: u.email,
                emailVerified: new Date(),
            });
        } else {
            console.log(`User exists: ${u.name}`);
        }
    }

    console.log('Done!');
    process.exit(0);
}

seed().catch(console.error);

