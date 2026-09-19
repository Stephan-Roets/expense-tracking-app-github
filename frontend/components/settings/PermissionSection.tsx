import { Check, X, ChevronDown } from 'lucide-react';
import { useUpdatePermission } from '@/hooks/usePermissions';

import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  type: string;
  keys: { key: string; label: string }[];
  roles: { name: string; tone: string; icon: LucideIcon }[];
  overrides: Record<string, Record<string, boolean>>;
  orgId: string;
  isOpen: boolean;
  onToggle: () => void;
  isIndividualMode?: boolean;
}

const DEFAULTS: Record<string, Record<string, Set<string>>> = {
  EXPENSE_CATEGORY: {
    FUEL_LOG: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    MECHANIC_SERVICE: new Set(['MANAGER','ADMIN']),
    MAINTENANCE_TOPUP: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    TIRES: new Set(['MANAGER','ADMIN']),
    CAR_WASH: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    INSURANCE_PREMIUM: new Set(['MANAGER','ADMIN']),
    VEHICLE_TRACKING: new Set(['MANAGER','ADMIN']),
    ETOLL_SANRAL: new Set(['MANAGER','ADMIN']),
    LICENSE_RENEWAL: new Set(['MANAGER','ADMIN']),
    PERSONAL_LICENSE: new Set(['MANAGER','ADMIN']),
    ROADWORTHY: new Set(['MANAGER','ADMIN']),
    OTHER_FIXED: new Set(['MANAGER','ADMIN']),
    PARKING: new Set(['DRIVER','MANAGER','ADMIN','RENTAL_CUSTOMER']),
  },
  VEHICLE_ASSIGNMENT: {
    ASSIGN_TO_DRIVER: new Set(['MANAGER','ADMIN']),
    ASSIGN_TO_MANAGER: new Set(['ADMIN']),
    RECLAIM_VEHICLE: new Set(['MANAGER','ADMIN']),
  },
  LOGBOOK: {
    VIEW_OWN_LOGBOOK: new Set(['DRIVER','ASSISTANT_HIGH','MANAGER','ADMIN','RENTAL_CUSTOMER']),
    VIEW_ALL_LOGBOOKS: new Set(['MANAGER','ADMIN']),
    EDIT_OWN_ENTRIES: new Set(['DRIVER','ASSISTANT_HIGH','MANAGER','ADMIN']),
    EDIT_ALL_ENTRIES: new Set(['ADMIN']),
    DELETE_OWN_ENTRIES: new Set(['DRIVER','ASSISTANT_HIGH','MANAGER','ADMIN']),
    DELETE_ALL_ENTRIES: new Set(['ADMIN']),
  },
  TAX_AUDIT: {
    ADD_OPENING_READING: new Set(['MANAGER','ADMIN']),
    ADD_CLOSING_READING: new Set(['MANAGER','ADMIN']),
    EDIT_READINGS: new Set(['ADMIN']),
    DELETE_READINGS: new Set(['ADMIN']),
  },
  EXPORT: {
    EXPORT_SARS_LOGBOOK: new Set(['ADMIN']),
    EXPORT_TRIPS: new Set(['MANAGER','ADMIN']),
    EXPORT_EMAIL: new Set(['ADMIN']),
  },
  FLEET_STATUS: {
    VIEW_FLEET_STATUS: new Set(['MANAGER','ADMIN']),
  }
};

// Individual account assistant defaults (only used for SOLO mode)
const INDIVIDUAL_DEFAULTS: Record<string, Record<string, Set<string>>> = {
  EXPENSE_CATEGORY: {
    FUEL_LOG: new Set(['ASSISTANT_LOW','ASSISTANT_HIGH']),
    MECHANIC_SERVICE: new Set(['ASSISTANT_HIGH']),
    MAINTENANCE_TOPUP: new Set(['ASSISTANT_LOW','ASSISTANT_HIGH']),
    TIRES: new Set(['ASSISTANT_HIGH']),
    CAR_WASH: new Set(['ASSISTANT_LOW','ASSISTANT_HIGH']),
    INSURANCE_PREMIUM: new Set(['ASSISTANT_HIGH']),
    VEHICLE_TRACKING: new Set(['ASSISTANT_HIGH']),
    ETOLL_SANRAL: new Set(['ASSISTANT_HIGH']),
    LICENSE_RENEWAL: new Set(['ASSISTANT_HIGH']),
    PERSONAL_LICENSE: new Set(['ASSISTANT_HIGH']),
    ROADWORTHY: new Set(['ASSISTANT_HIGH']),
    OTHER_FIXED: new Set(['ASSISTANT_HIGH']),
    PARKING: new Set(['ASSISTANT_LOW','ASSISTANT_HIGH']),
  },
  LOGBOOK: {
    VIEW_OWN_LOGBOOK: new Set(['ASSISTANT_LOW','ASSISTANT_HIGH']),
    VIEW_ALL_LOGBOOKS: new Set([]),
    EDIT_OWN_ENTRIES: new Set(['ASSISTANT_HIGH']),
    EDIT_ALL_ENTRIES: new Set([]),
    DELETE_OWN_ENTRIES: new Set(['ASSISTANT_HIGH']),
    DELETE_ALL_ENTRIES: new Set([]),
  },
  TAX_AUDIT: {
    ADD_OPENING_READING: new Set(['ASSISTANT_HIGH']),
    ADD_CLOSING_READING: new Set(['ASSISTANT_HIGH']),
    EDIT_READINGS: new Set(['ASSISTANT_HIGH']),
    DELETE_READINGS: new Set(['ASSISTANT_HIGH']),
    VIEW_TAX_REPORTS: new Set(['ASSISTANT_HIGH']),
  },
  EXPORT: {
    EXPORT_SARS_LOGBOOK: new Set(['ASSISTANT_HIGH']),
    EXPORT_TRIPS: new Set(['ASSISTANT_HIGH']),
    EXPORT_EMAIL: new Set([]),
  }
};

const ROLE_TONES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
} as const;

function isDefaultAllowed(type: string, key: string, role: string, isIndividualMode?: boolean): boolean {
  const defaults = isIndividualMode ? INDIVIDUAL_DEFAULTS : DEFAULTS;
  return defaults[type]?.[key]?.has(role) ?? false;
}

function RoleBadge({ role }: { role: Props['roles'][number] }) {
  const Icon = role.icon;
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 px-0.5 text-center">
      <div className={`rounded-full p-1.5 ${ROLE_TONES[role.tone as keyof typeof ROLE_TONES]}`}>
        <Icon size={16} strokeWidth={2.2} className="text-current" />
      </div>
      <span className="w-full break-words text-[9px] font-bold leading-3 tracking-[0.04em] text-muted-foreground">
        {role.name}
      </span>
    </div>
  );
}

export function PermissionSection({ title, description, icon: Icon, type, keys, roles, overrides, orgId, isOpen, onToggle, isIndividualMode }: Props) {
  const update = useUpdatePermission();

  const isOverridden = (key: string, role: string) => overrides[key]?.[role] !== undefined;
  const getValue = (key: string, role: string) => overrides[key]?.[role] ?? isDefaultAllowed(type, key, role, isIndividualMode);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 bg-muted/35 px-5 py-4 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={`rounded-lg p-2 ${ROLE_TONES[roles[0]?.tone as keyof typeof ROLE_TONES] || ROLE_TONES.blue}`}>
            <Icon size={17} className="text-current" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="divide-y divide-border">
          {keys.map(({ key, label }) => {
            const hasOverride = roles.some((r) => isOverridden(key, r.name));
            return (
              <div key={key} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                <div className="flex-1 text-sm font-medium">
                  {label}
                  {hasOverride && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[600px] lg:shrink-0 lg:grid-cols-4 lg:gap-2">
                  {roles.map((role) => {
                    const enabled = getValue(key, role.name);
                    const over = isOverridden(key, role.name);
                    const RoleIcon = role.icon;
                    return (
                      <button
                        key={role.name}
                        aria-label={`${label}: ${role.name} ${enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => update.mutate({ type, key, role: role.name, allowed: !enabled, orgId })}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          enabled
                            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        } ${over ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <span className={`rounded-full p-1 ${ROLE_TONES[role.tone as keyof typeof ROLE_TONES]}`}>
                          <RoleIcon size={14} className="text-current" />
                        </span>
                        <span className="min-w-0 flex-1 text-left text-[10px] font-bold tracking-[0.04em] leading-tight">
                          {role.name === 'RENTAL_CUSTOMER' ? (
                            <>
                              RENTAL<br />CUSTOMER
                            </>
                          ) : role.name === 'ASSISTANT_LOW' ? (
                            <>
                              ASSISTANT<br />LOW
                            </>
                          ) : role.name === 'ASSISTANT_HIGH' ? (
                            <>
                              ASSISTANT<br />HIGH
                            </>
                          ) : role.name}
                        </span>
                        {enabled ? <Check size={15} /> : <X size={15} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
