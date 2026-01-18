import { cn } from '@/lib/utils';
import { useProjectContracts } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import type { ProjectContract } from '../../types';
import {
  FileTextIcon,
  CalendarIcon,
  DollarSignIcon,
  UserIcon,
  MailIcon,
  PlusIcon,
  ExternalLinkIcon,
} from 'lucide-react';

interface ContractsTabProps {
  projectId: string;
}

export function ContractsTab({ projectId }: ContractsTabProps) {
  const { data: contracts, isLoading } = useProjectContracts(projectId);

  const activeContracts = contracts?.filter(c => c.status === 'active') ?? [];
  const totalValue = contracts?.reduce((sum, c) => sum + c.contract_value, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <div className="text-sm text-white/50 mb-1">Total Contracts</div>
          <div className="text-2xl font-mono font-bold text-white">{contracts?.length ?? 0}</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <div className="text-sm text-white/50 mb-1">Active</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{activeContracts.length}</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <div className="text-sm text-white/50 mb-1">Total Value</div>
          <div className="text-2xl font-mono font-bold text-cyan-400">${totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Contracts</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Contract
        </button>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : contracts?.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <FileTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No contracts added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts?.map((contract: ProjectContract) => {
            const startDate = new Date(contract.start_date);
            const endDate = new Date(contract.end_date);
            const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
            const isExpired = daysRemaining < 0;

            return (
              <div
                key={contract.id}
                className="p-5 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-white/40">{contract.contract_number}</span>
                      <StatusBadge status={contract.status} size="sm" />
                      {isExpiringSoon && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          Expires in {daysRemaining}d
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{contract.client_name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-white">
                      ${contract.contract_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/40">{contract.currency}</div>
                  </div>
                </div>

                {/* Contract Details Grid */}
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <CalendarIcon className="w-4 h-4 text-white/30" />
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Period</div>
                      {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <DollarSignIcon className="w-4 h-4 text-white/30" />
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Price/Page</div>
                      {contract.price_per_page ? `$${contract.price_per_page.toFixed(3)}` : 'Fixed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <FileTextIcon className="w-4 h-4 text-white/30" />
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Type</div>
                      {contract.contract_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <FileTextIcon className="w-4 h-4 text-white/30" />
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Pages</div>
                      {contract.minimum_pages?.toLocaleString() ?? '0'} - {contract.maximum_pages?.toLocaleString() ?? '∞'}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                {(contract.client_contact_name || contract.client_contact_email) && (
                  <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-sm text-white/50">
                    {contract.client_contact_name && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {contract.client_contact_name}
                      </span>
                    )}
                    {contract.client_contact_email && (
                      <a
                        href={`mailto:${contract.client_contact_email}`}
                        className="flex items-center gap-1 hover:text-cyan-400"
                      >
                        <MailIcon className="w-3 h-3" />
                        {contract.client_contact_email}
                      </a>
                    )}
                    <button className="ml-auto flex items-center gap-1 text-cyan-400 hover:underline">
                      View Details <ExternalLinkIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Deliverables */}
                {contract.deliverables && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-xs text-white/40 uppercase mb-2">Deliverables</div>
                    <p className="text-sm text-white/60">{contract.deliverables}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
