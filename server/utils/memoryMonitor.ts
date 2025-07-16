// Memory monitoring utility for Render's 512MB limit
export class MemoryMonitor {
  private static readonly MEMORY_LIMIT_MB = 400; // 80% of 512MB limit
  private static logInterval?: NodeJS.Timeout;

  static startMonitoring() {
    // Check memory every 5 minutes
    this.logInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5 * 60 * 1000);
    
    // Initial check
    this.checkMemoryUsage();
  }

  static checkMemoryUsage() {
    const usage = process.memoryUsage();
    const rssInMB = Math.round(usage.rss / 1024 / 1024);
    const heapUsedInMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalInMB = Math.round(usage.heapTotal / 1024 / 1024);

    console.log(`Memory: RSS ${rssInMB}MB, Heap ${heapUsedInMB}/${heapTotalInMB}MB`);

    if (rssInMB > this.MEMORY_LIMIT_MB) {
      console.warn(`⚠️  Memory usage high: ${rssInMB}MB (limit: 512MB)`);
      this.forceGarbageCollection();
    }
  }

  private static forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }

  static stopMonitoring() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }
  }
}
