'use client';

// @ts-expect-error lucide-react icon types
import { AlertCircle, AlertTriangle, InfoCircle } from 'lucide-react';
import Link from 'next/link';

type ClosureBlocker = {
  moduleId: string;
  moduleName?: string;
  type: 'financial' | 'data';
  severity: 'blocking' | 'warning' | 'info';
  id: string;
  title: string;
  description: string;
  actionRequired?: string;
  actionUrl?: string;
};

type ClosureBlockersCardProps = {
  blockers: ClosureBlocker[];
  warnings?: ClosureBlocker[];
};

export function ClosureBlockersCard({ blockers, warnings = [] }: ClosureBlockersCardProps) {
  const getSeverityIcon = (severity: ClosureBlocker['severity']) => {
    switch (severity) {
      case 'blocking':
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />;
      case 'info':
        return <InfoCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />;
    }
  };

  const getSeverityStyles = (severity: ClosureBlocker['severity']) => {
    switch (severity) {
      case 'blocking':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTextColor = (severity: ClosureBlocker['severity']) => {
    switch (severity) {
      case 'blocking':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
        return 'text-blue-900';
    }
  };

  const getDescriptionColor = (severity: ClosureBlocker['severity']) => {
    switch (severity) {
      case 'blocking':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
    }
  };

  if (blockers.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[color:var(--text-primary)] mb-3">
            Блокирующие факторы
          </h4>
          <div className="space-y-3">
            {blockers.map((blocker) => (
              <div
                key={blocker.id}
                className={`rounded-lg border p-4 ${getSeverityStyles(blocker.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(blocker.severity)}
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-medium ${getTextColor(blocker.severity)}`}>
                      {blocker.title}
                    </h5>
                    <p className={`mt-1 text-sm ${getDescriptionColor(blocker.severity)}`}>
                      {blocker.description}
                    </p>
                    {blocker.actionRequired && (
                      <p className={`mt-2 text-sm font-medium ${getTextColor(blocker.severity)}`}>
                        {blocker.actionRequired}
                      </p>
                    )}
                    {blocker.actionUrl && (
                      <div className="mt-2">
                        <Link
                          href={blocker.actionUrl}
                          className={`text-sm font-medium underline ${getTextColor(blocker.severity)}`}
                        >
                          Перейти к исправлению →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[color:var(--text-primary)] mb-3">
            Предупреждения
          </h4>
          <div className="space-y-3">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                className={`rounded-lg border p-4 ${getSeverityStyles(warning.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(warning.severity)}
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-medium ${getTextColor(warning.severity)}`}>
                      {warning.title}
                    </h5>
                    <p className={`mt-1 text-sm ${getDescriptionColor(warning.severity)}`}>
                      {warning.description}
                    </p>
                    {warning.actionRequired && (
                      <p className={`mt-2 text-sm font-medium ${getTextColor(warning.severity)}`}>
                        {warning.actionRequired}
                      </p>
                    )}
                    {warning.actionUrl && (
                      <div className="mt-2">
                        <Link
                          href={warning.actionUrl}
                          className={`text-sm font-medium underline ${getTextColor(warning.severity)}`}
                        >
                          Перейти к исправлению →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
