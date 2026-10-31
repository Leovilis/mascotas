import React from 'react';
import { ReportStatus } from '@/types';
import { getStatusBadge, cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const badge = getStatusBadge(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide',
        badge.colorClass,
        className
      )}
    >
      {status === 'ACTIVE' && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-xs"></span>
        </span>
      )}
      {badge.label}
    </span>
  );
}

