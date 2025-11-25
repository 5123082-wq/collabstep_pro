import { encodeDemoSession } from '@/lib/auth/demo-session';
import { usersRepository, resetFinanceMemory } from '@collabverse/api';
import { GET, PATCH } from '@/app/api/me/profile/route';
import { NextRequest } from 'next/server';

describe('User Profile API', () => {
    const userId = 'test-user-profile@collabverse.test';
    const session = encodeDemoSession({
        email: userId,
        userId,
        role: 'user',
        issuedAt: Date.now()
    });
    const headers = {
        cookie: `cv_session=${session}`,
        'content-type': 'application/json'
    };

    beforeEach(async () => {
        resetFinanceMemory();
        // Create test user
        await usersRepository.create({
            name: 'Test User',
            email: userId,
            title: 'Software Engineer',
            department: 'Engineering',
            location: 'Moscow',
            timezone: 'Europe/Moscow',
            avatarUrl: 'https://example.com/avatar.jpg'
        });
    });

    describe('GET /api/me/profile', () => {
        it('should return current user profile', async () => {
            const response = await GET();

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data.profile).toBeDefined();
            expect(data.data.profile.email).toBe(userId);
            expect(data.data.profile.name).toBe('Test User');
            expect(data.data.profile.title).toBe('Software Engineer');
            expect(data.data.profile.department).toBe('Engineering');
            expect(data.data.profile.location).toBe('Moscow');
            expect(data.data.profile.timezone).toBe('Europe/Moscow');
            expect(data.data.profile.image).toBe('https://example.com/avatar.jpg');
        });

        it('should return 401 if not authenticated', async () => {
            // Mock getCurrentUser to return null
            const originalGetCurrentUser = require('@/lib/auth/session').getCurrentUser;
            require('@/lib/auth/session').getCurrentUser = jest.fn().mockResolvedValue(null);

            const response = await GET();

            expect(response.status).toBe(401);

            // Restore original function
            require('@/lib/auth/session').getCurrentUser = originalGetCurrentUser;
        });
    });

    describe('PATCH /api/me/profile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                name: 'Updated Name',
                title: 'Senior Engineer',
                department: 'Backend Team',
                location: 'Saint Petersburg',
                timezone: 'Europe/Moscow',
                image: 'https://example.com/new-avatar.jpg'
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data.profile.name).toBe('Updated Name');
            expect(data.data.profile.title).toBe('Senior Engineer');
            expect(data.data.profile.department).toBe('Backend Team');
            expect(data.data.profile.location).toBe('Saint Petersburg');
            expect(data.data.profile.timezone).toBe('Europe/Moscow');
            expect(data.data.profile.image).toBe('https://example.com/new-avatar.jpg');

            // Verify data persisted
            const user = await usersRepository.findById(userId);
            expect(user?.name).toBe('Updated Name');
            expect(user?.title).toBe('Senior Engineer');
        });

        it('should update only provided fields', async () => {
            const updateData = {
                name: 'Only Name Changed'
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data.profile.name).toBe('Only Name Changed');
            // Other fields should remain unchanged
            expect(data.data.profile.title).toBe('Software Engineer');
            expect(data.data.profile.department).toBe('Engineering');
        });

        it('should validate name minimum length', async () => {
            const updateData = {
                name: 'A' // Too short (min 2 chars)
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate image URL format', async () => {
            const updateData = {
                image: 'not-a-valid-url'
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should allow empty string for image to remove avatar', async () => {
            const updateData = {
                image: ''
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data.profile.image).toBe('');
        });

        it('should return 401 if not authenticated', async () => {
            const originalGetCurrentUser = require('@/lib/auth/session').getCurrentUser;
            require('@/lib/auth/session').getCurrentUser = jest.fn().mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ name: 'Test' })
            });

            const response = await PATCH(request);

            expect(response.status).toBe(401);

            require('@/lib/auth/session').getCurrentUser = originalGetCurrentUser;
        });

        it('should update timezone correctly', async () => {
            const updateData = {
                timezone: 'America/New_York'
            };

            const request = new NextRequest('http://localhost/api/me/profile', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });

            const response = await PATCH(request);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data.profile.timezone).toBe('America/New_York');
        });
    });
});
