import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { correlationMiddleware } from './middleware/correlationMiddleware';
import { transactionMiddleware } from './middleware/transactionMiddleware';
import { idempotencyMiddleware } from './middleware/idempotencyMiddleware';
import { petApi } from '../api/petApi';
import { serviceApi } from '../api/serviceApi';
import correlationSlice from './slices/correlationSlice';
import transactionSlice from './slices/transactionSlice';

export const store = configureStore({
  reducer: {
    correlation: correlationSlice,
    transaction: transactionSlice,
    [petApi.reducerPath]: petApi.reducer,
    [serviceApi.reducerPath]: serviceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['signalr/connected', 'signalr/disconnected'],
        ignoredPaths: ['transaction.activeTransactions', 'transaction.completedTransactions'],
      },
    })
      .concat(correlationMiddleware)
      .concat(transactionMiddleware)
      .concat(idempotencyMiddleware)
      .concat(petApi.middleware)
      .concat(serviceApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;