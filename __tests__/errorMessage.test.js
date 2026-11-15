const { getErrorMessage } = require('../lib/errorMessage');

describe('getErrorMessage', () => {
  test('returns a string error unchanged', () => {
    expect(getErrorMessage('Request failed.')).toBe('Request failed.');
  });

  test('returns the message from a standard Error', () => {
    expect(getErrorMessage(new Error('Network unavailable.'))).toBe('Network unavailable.');
  });

  test('extracts the message from a serialized Redux error without rendering its stack', () => {
    expect(getErrorMessage({
      name: 'SyntaxError',
      message: 'Unexpected response.',
      stack: 'private stack details',
    })).toBe('Unexpected response.');
  });

  test('uses the fallback for errors without a readable message', () => {
    expect(getErrorMessage({ stack: 'private stack details' }, 'Request failed.')).toBe('Request failed.');
  });

  test('never returns an error object that could be rendered as a React child', () => {
    expect(getErrorMessage({ name: 'Error', message: { detail: 'failure' }, stack: 'private' }))
      .toBe('Something went wrong. Please try again.');
  });
});
