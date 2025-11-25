import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Onboarding - CollabStep',
    description: 'Welcome to CollabStep'
};

export default function OnboardingLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[color:var(--surface-base)]">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
                        CollabStep
                    </h1>
                    <p className="mt-2 text-[color:var(--text-secondary)]">
                        Добро пожаловать! Давайте настроим ваш профиль
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
