declare module 'webpack-bundle-analyzer' {
  export class BundleAnalyzerPlugin {
    constructor(options?: {
      analyzerMode?: 'server' | 'static' | 'disabled' | 'json';
      analyzerHost?: string;
      analyzerPort?: number | 'auto';
      reportFilename?: string;
      reportTitle?: string;
      defaultSizes?: 'stat' | 'parsed' | 'gzip' | 'brotli';
      openAnalyzer?: boolean;
      generateStatsFile?: boolean;
      statsFilename?: string;
      statsOptions?: Record<string, unknown>;
      logLevel?: 'info' | 'warn' | 'error' | 'silent';
    });
  }
}
