/**
 * Metrics abstraction layer
 * Provides a pluggable interface for recording application metrics
 */

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricsAdapter {
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value?: number, labels?: MetricLabels): void;

  /**
   * Record a gauge value
   */
  recordGauge(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Record a histogram value (for latencies, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Start timing an operation
   */
  startTimer(name: string, labels?: MetricLabels): () => void;
}

/**
 * In-memory metrics adapter (default)
 * Stores metrics in memory for development/testing
 */
class InMemoryMetricsAdapter implements MetricsAdapter {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, labels);
    };
  }

  private buildKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * Get all recorded metrics (for testing/debugging)
   */
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          },
        ])
      ),
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Console metrics adapter
 * Logs metrics to console (useful for debugging)
 */
class ConsoleMetricsAdapter implements MetricsAdapter {
  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    console.log(`[METRIC] Counter: ${name}`, { value, labels });
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    console.log(`[METRIC] Gauge: ${name}`, { value, labels });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    console.log(`[METRIC] Histogram: ${name}`, { value, labels });
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      console.log(`[METRIC] Timer: ${name}`, { duration, labels });
    };
  }
}

// Global metrics instance
let metricsAdapter: MetricsAdapter = new InMemoryMetricsAdapter();

/**
 * Set the global metrics adapter
 */
export function setMetricsAdapter(adapter: MetricsAdapter) {
  metricsAdapter = adapter;
}

/**
 * Get the current metrics adapter
 */
export function getMetricsAdapter(): MetricsAdapter {
  return metricsAdapter;
}

// Convenience functions that delegate to the global adapter

export function incrementCounter(
  name: string,
  value?: number,
  labels?: MetricLabels
) {
  metricsAdapter.incrementCounter(name, value, labels);
}

export function recordGauge(name: string, value: number, labels?: MetricLabels) {
  metricsAdapter.recordGauge(name, value, labels);
}

export function recordHistogram(
  name: string,
  value: number,
  labels?: MetricLabels
) {
  metricsAdapter.recordHistogram(name, value, labels);
}

export function startTimer(name: string, labels?: MetricLabels): () => void {
  return metricsAdapter.startTimer(name, labels);
}

// Export adapters
export { InMemoryMetricsAdapter, ConsoleMetricsAdapter };

// Common metric names
export const Metrics = {
  TRANSACTION_CREATED: 'economy.transaction.created',
  TRANSACTION_DURATION: 'economy.transaction.duration_ms',
  BALANCE_CALCULATED: 'economy.balance.calculated',
  ACCOUNT_CREATED: 'economy.account.created',
  CURRENCY_CREATED: 'economy.currency.created',
  WEBHOOK_SENT: 'economy.webhook.sent',
  WEBHOOK_FAILED: 'economy.webhook.failed',
  API_REQUEST: 'economy.api.request',
  API_ERROR: 'economy.api.error',
} as const;
