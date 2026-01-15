'use client';

import { useCallback } from 'react';
import { Modal, ModalBody, ModalClose, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { VacancyForm } from '@/components/performers/VacancyForm';
import { useOrganization } from '@/components/organizations/OrganizationContext';

type CreateVacancyModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateVacancyModal({ open, onClose }: CreateVacancyModalProps) {
  const { currentOrgId, currentOrganization } = useOrganization();

  const handleCreated = useCallback((vacancyId?: string) => {
    if (vacancyId) {
      window.dispatchEvent(
        new CustomEvent('vacancy-created', { detail: { vacancyId } })
      );
    }
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalClose />
        <ModalHeader>
          <ModalTitle>Создать вакансию</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="rounded-2xl border border-neutral-900/60 bg-neutral-950/40 p-4 text-sm text-neutral-300">
            {currentOrganization?.name
              ? `Организация: ${currentOrganization.name}`
              : 'Выберите организацию, чтобы разместить вакансию.'}
          </div>
          <VacancyForm organizationId={currentOrgId} onCreated={handleCreated} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
