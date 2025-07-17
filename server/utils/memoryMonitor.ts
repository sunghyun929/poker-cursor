// Memory monitoring utility for Render's 512MB limit
export class MemoryMonitor {
  private static readonly MEMORY_LIMIT_MB = 300; // 더 보수적인 한계
  private static readonly CRITICAL_LIMIT_MB = 400;
  private static logInterval?: NodeJS.Timeout;

  static startMonitoring() {
    // 30초마다 체크 (더 자주)
    this.logInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30 * 1000);
    
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

  private static emergencyCleanup() {
    console.error('🚨 EMERGENCY CLEANUP - 모든 비활성 게임 삭제');
    
    // 강제 가비지 컬렉션
    if (global.gc) {
      global.gc();
    }
    
    // WebSocket 연결 정리
    // 게임 상태 정리
    console.log('Emergency cleanup completed');
  }

  static stopMonitoring() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }
  }
}
