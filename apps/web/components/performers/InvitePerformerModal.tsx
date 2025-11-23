'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalClose } from '@/components/ui/modal';

interface Organization {
  id: string;
  name: string;
}

interface InvitePerformerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performer: { id: string; name: string } | null;
}

export function InvitePerformerModal({ open, onOpenChange, performer }: InvitePerformerModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      void fetch('/api/organizations')
        .then(res => res.json())
        .then(data => {
            const orgs = data.organizations || [];
            setOrganizations(orgs);
            if (orgs.length > 0) setSelectedOrgId(orgs[0].id);
        })
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  const handleInvite = async () => {
    if (!performer || !selectedOrgId) return;

    setIsSending(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/performers/${performer.id}/invite-to-organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to send invite');
      }

      setMessage({ type: 'success', text: 'Приглашение отправлено' });
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error sending invite' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Пригласить {performer?.name}</ModalTitle>
          <ModalClose />
        </ModalHeader>
        <ModalBody>
            {message && (
                <div className={`p-3 rounded text-sm mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}
            
            {isLoading ? (
                <div>Загрузка организаций...</div>
            ) : organizations.length === 0 ? (
                <div>У вас нет организаций, чтобы пригласить исполнителя. Создайте организацию в меню.</div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[color:var(--text-secondary)]">Выберите организацию</label>
                        <select
                            className="w-full rounded-md border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-base)] px-3 py-2 text-sm"
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                        >
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-[color:var(--text-secondary)]">
                        Исполнитель получит уведомление и сможет присоединиться к вашей организации.
                    </p>
                </div>
            )}
        </ModalBody>
        <ModalFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
           <Button onClick={handleInvite} disabled={isSending || organizations.length === 0 || !selectedOrgId}>
             {isSending ? 'Отправка...' : 'Отправить приглашение'}
           </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

