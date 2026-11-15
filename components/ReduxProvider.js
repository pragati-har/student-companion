'use client';

import { Provider } from 'react-redux';
import { store }    from '@/store';

/**
 * Thin wrapper to provide the Redux store to the client tree.
 * Must be a Client Component since the Redux Provider uses context.
 */
export function ReduxProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
