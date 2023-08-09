/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import * as os from 'os';

export type PulsePerformanceStatisticalData = {
  loadAverage?: number[];
  freeMemory?: number;
  totalMemory?: number;
  cpuInfo?: os.CpuInfo[];
  systemUptime?: number;
  nodeProcessUptime?: number;
  networkInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
  osType?: string;
  osRelease?: string;
  processMemoryUsage?: NodeJS.MemoryUsage;
  requestTime?: number;
  totalRequests?: number;
};

export interface MonitoringOptions {
  monitorLoadAverage?: boolean;
  monitorFreeMemory?: boolean;
  monitorTotalMemory?: boolean;
  monitorCpuInfo?: boolean;
  monitorSystemUptime?: boolean;
  monitorNodeProcessUptime?: boolean;
  monitorNetworkInterfaces?: boolean;
  monitorOsType?: boolean;
  monitorOsRelease?: boolean;
  monitorProcessMemoryUsage?: boolean;
  monitorRequestTime?: boolean;
}

export type PulsePerformanceHistory = {
  loadAverage?: number[][];
  freeMemory?: number[];
  totalMemory?: number[];
  cpuInfo?: os.CpuInfo[][];
  systemUptime?: number[];
  nodeProcessUptime?: number[];
  networkInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[][]>;
  osType?: string[];
  osRelease?: string[];
  processMemoryUsage?: NodeJS.MemoryUsage[];
  requestTime?: number[];
};

export class PulsePerformance {
  private interval: number = 1000;
  private poller: NodeJS.Timer | null = null;
  private stats: PulsePerformanceStatisticalData = {};
  private options: MonitoringOptions;
  private history: PulsePerformanceHistory = {};
  private maxHistorySize: number = 300;

  /**
   * Constructs the PulsePerformance class with the specified options and interval.
   * @param pollingIntervalMS - Time in milliseconds for the polling interval.
   * @param options - The monitoring options.
   */
  constructor(pollingIntervalMS: number = 1000, options: MonitoringOptions = {}) {
    this.interval = pollingIntervalMS;
    this.options = {
      monitorLoadAverage: true,
      monitorFreeMemory: true,
      monitorTotalMemory: true,
      monitorCpuInfo: true,
      monitorSystemUptime: true,
      monitorNodeProcessUptime: true,
      monitorNetworkInterfaces: true,
      monitorOsType: true,
      monitorOsRelease: true,
      monitorProcessMemoryUsage: true,
      monitorRequestTime: true,
      ...options,
    };
  }

  private addToHistory<T extends keyof PulsePerformanceHistory>(key: T, value: any) {
    if (!this.history[key]) {
      // @ts-ignore
      this.history[key] = [];
    }

    // @ts-ignore
    if (this.history[key].length >= this.maxHistorySize) {
      // @ts-ignore
      this.history[key].shift(); // Remove the oldest data point
    }

    // @ts-ignore
    this.history[key].push(value);
  }

  /**
   * Logs the request time to history
   * @param duration - The request time in milliseconds.
   */
  public logRequestTime(duration: number) {
    if (this.options.monitorRequestTime) {
      this.stats.totalRequests = (this.stats.totalRequests || 0) + 1;

      this.stats.requestTime = duration;
      this.addToHistory('requestTime', this.stats.requestTime);
    }
  }

  /**
   * Stops monitoring the system performance.
   * @param dataPoints - The number of data points to use when calculating the average.
   * @returns The average request time in milliseconds.
   */
  public getAverageRequestTime(dataPoints: number = this.maxHistorySize): number | null {
    return this.computeAverage(this.history.requestTime, dataPoints);
  }

  /**
   * Starts monitoring the system performance.
   * @param callback - Optional callback to handle stats.
   */
  public startMonitoring(callback?: (stats: PulsePerformanceStatisticalData) => void) {
    if (this.poller) {
      this.stopMonitoring();
    }

    this.poller = setInterval(() => {
      if (this.options.monitorLoadAverage) {
        this.stats.loadAverage = os.loadavg();
        this.addToHistory('loadAverage', this.stats.loadAverage);
      }

      if (this.options.monitorFreeMemory) {
        this.stats.freeMemory = os.freemem();
        this.addToHistory('freeMemory', this.stats.freeMemory);
      }

      if (this.options.monitorTotalMemory) {
        this.stats.totalMemory = os.totalmem();
        this.addToHistory('totalMemory', this.stats.totalMemory);
      }

      if (this.options.monitorCpuInfo) {
        this.stats.cpuInfo = os.cpus();
        this.addToHistory('cpuInfo', this.stats.cpuInfo);
      }

      if (this.options.monitorSystemUptime) {
        this.stats.systemUptime = os.uptime();
        this.addToHistory('systemUptime', this.stats.systemUptime);
      }

      if (this.options.monitorNodeProcessUptime) {
        this.stats.nodeProcessUptime = process.uptime();
        this.addToHistory('nodeProcessUptime', this.stats.nodeProcessUptime);
      }

      if (this.options.monitorNetworkInterfaces) {
        this.stats.networkInterfaces = os.networkInterfaces();
        this.addToHistory('networkInterfaces', this.stats.networkInterfaces);
      }

      if (this.options.monitorOsType) {
        this.stats.osType = os.type();
        this.addToHistory('osType', this.stats.osType);
      }

      if (this.options.monitorOsRelease) {
        this.stats.osRelease = os.release();
        this.addToHistory('osRelease', this.stats.osRelease);
      }

      if (this.options.monitorProcessMemoryUsage) {
        this.stats.processMemoryUsage = process.memoryUsage();
        this.addToHistory('processMemoryUsage', this.stats.processMemoryUsage);
      }

      if (callback) {
        callback({ ...this.stats }); // Send a shallow copy to the callback to prevent mutation
      }
    }, this.interval);
  }

  /**
   * Returns average free memory over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageFreeMemory(dataPoints: number = this.maxHistorySize): number | null {
    if (this.history.freeMemory && this.history.freeMemory.length >= dataPoints) {
      const lastDataPoints = this.history.freeMemory.slice(-dataPoints);
      const sum = lastDataPoints.reduce((acc, val) => acc + val, 0);
      return sum / dataPoints;
    }
    return null;
  }

  /**
   * Returns average load average over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageLoadAverage(dataPoints: number = this.maxHistorySize): number[] | null {
    if (this.history.loadAverage && this.history.loadAverage.length >= dataPoints) {
      const lastDataPoints = this.history.loadAverage.slice(-dataPoints);
      const sums = [0, 0, 0];
      lastDataPoints.forEach((load) => {
        sums[0] += load[0];
        sums[1] += load[1];
        sums[2] += load[2];
      });
      return sums.map((sum) => sum / dataPoints);
    }
    return null;
  }

  /**
   * Returns average total memory over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageTotalMemory(dataPoints: number = this.maxHistorySize): number | null {
    return this.computeAverage(this.history.totalMemory, dataPoints);
  }

  /**
   * Returns average system uptime over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageSystemUptime(dataPoints: number = this.maxHistorySize): number | null {
    return this.computeAverage(this.history.systemUptime, dataPoints);
  }

  /**
   * Returns average node process uptime over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageNodeProcessUptime(dataPoints: number = this.maxHistorySize): number | null {
    return this.computeAverage(this.history.nodeProcessUptime, dataPoints);
  }

  /**
   * Returns average cpu user time over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageCpuUserTime(dataPoints: number = this.maxHistorySize): number | null {
    if (this.history.cpuInfo && this.history.cpuInfo.length >= dataPoints) {
      const lastDataPoints = this.history.cpuInfo.slice(-dataPoints);
      let totalUserTime = 0;
      lastDataPoints.forEach((cpus) => {
        cpus.forEach((cpu) => {
          totalUserTime += cpu.times.user;
        });
      });
      return totalUserTime / (dataPoints * lastDataPoints[0].length); // divide by total number of cores over all datapoints
    }
    return null;
  }

  /**
   * Returns average cpu system time over the last n data points.
   * @param dataPoints Number of last data points to consider for average.
   * @returns The average of the last data points or null if not enough data.
   */
  public getAverageProcessMemoryUsage(dataPoints: number = this.maxHistorySize): NodeJS.MemoryUsage | null {
    if (this.history.processMemoryUsage && this.history.processMemoryUsage.length >= dataPoints) {
      const lastDataPoints = this.history.processMemoryUsage.slice(-dataPoints);
      const sumMemory: NodeJS.MemoryUsage = { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
      lastDataPoints.forEach((mem) => {
        sumMemory.rss += mem.rss;
        sumMemory.heapTotal += mem.heapTotal;
        sumMemory.heapUsed += mem.heapUsed;
        sumMemory.external += mem.external;
        sumMemory.arrayBuffers += mem.arrayBuffers;
      });
      for (const key in sumMemory) {
        sumMemory[key as keyof NodeJS.MemoryUsage] /= dataPoints;
      }
      return sumMemory;
    }
    return null;
  }

  private computeAverage(values?: number[], dataPoints: number = this.maxHistorySize): number | null {
    if (values && values.length >= dataPoints) {
      const lastDataPoints = values.slice(-dataPoints);
      const sum = lastDataPoints.reduce((acc, val) => acc + val, 0);
      return sum / dataPoints;
    }
    return null;
  }

  /**
   * Returns the current performance statistics. Stats will be empty if monitoring is not active.
   * @returns The current performance statistics.
   */
  public getStats(): PulsePerformanceStatisticalData {
    return { ...this.stats }; // Return a shallow copy to ensure stats are read-only outside the class
  }

  /**
   * Resets the performance statistics.
   */
  public resetStats() {
    this.stats = {};
  }

  /**
   * Stops monitoring the system performance.
   */
  public stopMonitoring() {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }
  }
}
