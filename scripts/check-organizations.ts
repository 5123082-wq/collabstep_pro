import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import { users, organizations, organizationMembers } from '@collabverse/api/db/schema';
import { organizationsRepository } from '@collabverse/api';
import { eq } from 'drizzle-orm';

async function checkOrganizations() {
    try {
        const adminEmail = 'admin.demo@collabverse.test';
        console.log(`🔍 Checking organizations for: ${adminEmail}`);

        const adminUser = await db
            .select()
            .from(users)
            .where(eq(users.email, adminEmail))
            .limit(1);

        if (adminUser.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }

        const user = adminUser[0];
        console.log(`✅ User found: ${user.id} (${user.email})`);

        // 1. Check raw DB for ownership
        const ownedOrgs = await db
            .select()
            .from(organizations)
            .where(eq(organizations.ownerId, user.id));

        console.log(`\n📂 Owned Organizations (Raw DB): ${ownedOrgs.length}`);
        ownedOrgs.forEach(org => console.log(` - ${org.name} (${org.id})`));

        // 2. Check raw DB for membership
        const memberOrgs = await db
            .select({
                orgName: organizations.name,
                orgId: organizations.id,
                role: organizationMembers.role
            })
            .from(organizationMembers)
            .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
            .where(eq(organizationMembers.userId, user.id));

        console.log(`\n👥 Member Organizations (Raw DB): ${memberOrgs.length}`);
        memberOrgs.forEach(item => console.log(` - ${item.orgName} (${item.orgId}) [${item.role}]`));

        // 3. Check Repository Logic
        console.log('\n🧪 Testing organizationsRepository.listForUser...');
        const repoOrgs = await organizationsRepository.listForUser(user.id);
        console.log(`📊 Repository returned: ${repoOrgs.length} organizations`);
        repoOrgs.forEach(org => console.log(` - ${org.name} (${org.id})`));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

checkOrganizations();
