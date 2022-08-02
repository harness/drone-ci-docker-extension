import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import pipelinesReducer from '../features/pipelinesSlice';

export const store = configureStore({
  reducer: {
    pipelines: pipelinesReducer
  }
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
