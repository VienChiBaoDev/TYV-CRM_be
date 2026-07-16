export const PATIENT_SERVICE_BLOCKED_ACTION = {
  COLLECT_PAYMENT: 'collect_payment',
  REFUND: 'refund',
  UPDATE: 'update',
} as const;

export type PatientServiceBlockedAction =
  (typeof PATIENT_SERVICE_BLOCKED_ACTION)[keyof typeof PATIENT_SERVICE_BLOCKED_ACTION];

export const PATIENT_SERVICE_BLOCKED_ACTION_LABEL: Record<
  PatientServiceBlockedAction,
  string
> = {
  [PATIENT_SERVICE_BLOCKED_ACTION.COLLECT_PAYMENT]: 'thu thanh toán',
  [PATIENT_SERVICE_BLOCKED_ACTION.REFUND]: 'hoàn tiền',
  [PATIENT_SERVICE_BLOCKED_ACTION.UPDATE]: 'cập nhật',
};
