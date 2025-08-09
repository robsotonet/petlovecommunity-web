import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CorrelationContext } from '../../../types/enterprise';
import { generateCorrelationId, generateSessionId } from '../../utils/correlationUtils';

interface CorrelationState {
  currentContext: CorrelationContext;
  history: CorrelationContext[];
}

const initialContext: CorrelationContext = {
  correlationId: generateCorrelationId(),
  sessionId: generateSessionId(),
  timestampMs: Date.now(),
};

const initialState: CorrelationState = {
  currentContext: initialContext,
  history: [initialContext],
};

const correlationSlice = createSlice({
  name: 'correlation',
  initialState,
  reducers: {
    setCorrelationContext: (state, action: PayloadAction<Partial<CorrelationContext>>) => {
      const newContext: CorrelationContext = {
        ...state.currentContext,
        ...action.payload,
        timestampMs: Date.now(),
      };
      state.currentContext = newContext;
      state.history.push(newContext);
      
      // Keep only last 100 correlation contexts
      if (state.history.length > 100) {
        state.history = state.history.slice(-100);
      }
    },
    
    createChildCorrelation: (state, action: PayloadAction<{ userId?: string }>) => {
      const childContext: CorrelationContext = {
        correlationId: generateCorrelationId(),
        parentCorrelationId: state.currentContext.correlationId,
        sessionId: state.currentContext.sessionId,
        userId: action.payload.userId || state.currentContext.userId,
        timestampMs: Date.now(),
      };
      state.currentContext = childContext;
      state.history.push(childContext);
    },
    
    setUserId: (state, action: PayloadAction<string>) => {
      state.currentContext.userId = action.payload;
    },
  },
});

export const { setCorrelationContext, createChildCorrelation, setUserId } = correlationSlice.actions;
export default correlationSlice.reducer;