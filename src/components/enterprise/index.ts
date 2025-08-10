// Enterprise Components
// Real-time communication and enterprise features

export {
  SignalRProvider,
  useSignalRContext,
  usePetAdoptionEvents,
  useServiceBookingEvents,
  useEventRSVPEvents,
  useNotificationEvents,
  useSocialInteractionEvents,
  useSignalRConnectionStatus,
  useSignalRGroups,
} from './SignalRProvider';

// Enterprise Error Boundaries
export {
  CorrelationErrorBoundary,
  withCorrelationErrorBoundary,
} from './CorrelationErrorBoundary';

export {
  TransactionErrorBoundary,
  withTransactionErrorBoundary,
} from './TransactionErrorBoundary';

// Enterprise component types are defined inline