import {
  reportDiagnostic,
  setCrashReporter,
  type CrashReporter,
} from './diagnostics';

describe('diagnostics', () => {
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    setCrashReporter(undefined);
    consoleError.mockClear();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it('forwards errors and context to the configured crash reporter', () => {
    const reporter: CrashReporter = jest.fn();
    const error = new Error('boundary failure');
    const context = { source: 'ErrorBoundary' };

    setCrashReporter(reporter);
    reportDiagnostic(error, context);

    expect(reporter).toHaveBeenCalledWith(error, context);
    expect(consoleError).toHaveBeenCalled();
  });

  it('keeps diagnostics from throwing when the crash reporter fails', () => {
    setCrashReporter(() => {
      throw new Error('reporter failure');
    });

    expect(() =>
      reportDiagnostic(new Error('original failure'), {}),
    ).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('"event":"crash_reporter_failed"'),
    );
  });

  it('labels non-Error crash reporter failures as unknown', () => {
    const reporterFailure: unknown = 'reporter failure';
    setCrashReporter(() => {
      throw reporterFailure;
    });

    reportDiagnostic(new Error('original failure'), {});

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('"errorName":"UnknownError"'),
    );
  });

  it('does not log error details in production', () => {
    const originalEnvironment = process.env.EXPO_PUBLIC_ENV;
    process.env.EXPO_PUBLIC_ENV = 'production';

    try {
      reportDiagnostic(new Error('private diagnostic detail'), {
        source: 'ErrorBoundary',
      });

      const output = consoleError.mock.calls
        .map(([entry]) => String(entry))
        .join('\n');
      expect(output).toContain('"event":"mobile_diagnostic"');
      expect(output).not.toContain('private diagnostic detail');
    } finally {
      if (originalEnvironment === undefined) {
        delete process.env.EXPO_PUBLIC_ENV;
      } else {
        process.env.EXPO_PUBLIC_ENV = originalEnvironment;
      }
    }
  });

  it('logs error details during development without a crash reporter', () => {
    const originalEnvironment = process.env.EXPO_PUBLIC_ENV;
    process.env.EXPO_PUBLIC_ENV = 'development';

    try {
      reportDiagnostic(new Error('development diagnostic'), {
        source: 'ErrorBoundary',
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('"event":"mobile_diagnostic"'),
      );
    } finally {
      if (originalEnvironment === undefined) {
        delete process.env.EXPO_PUBLIC_ENV;
      } else {
        process.env.EXPO_PUBLIC_ENV = originalEnvironment;
      }
    }
  });
});
