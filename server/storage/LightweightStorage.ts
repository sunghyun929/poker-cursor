// Ultra-lightweight storage for Render's 512MB memory limit
import * as fs from 'fs';
import * as path from 'path';
import { GameState } from '../../shared/schema';

export class LightweightStorage {
  private gameStates: Map<string, GameState>;
  private dataDir: string;
  private cleanupInterval?: NodeJS.Timeout;
  private saveTimeout?: NodeJS.Timeout;
  private readonly MAX_GAMES = 10; // 최대 10개 게임만 유지
  private readonly MAX_AGE_MINUTES = 15; // 15분 이상 된 게임 삭제

  constructor() {
    this.dataDir = path.join(process.cwd(), 'game-data');
    this.gameStates = new Map();
    
    // Create data directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadGameStates();
    this.startCleanup();
  }

  private loadGameStates(): void {
    try {
      const filePath = path.join(this.dataDir, 'games.json');
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const gameArray = JSON.parse(data);
        this.gameStates = new Map(gameArray);
        console.log(`Loaded ${this.gameStates.size} games`);
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  private saveGameStates(): void {
    // Debounced save to reduce I/O
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      try {
        const gameArray = Array.from(this.gameStates.entries());
        const filePath = path.join(this.dataDir, 'games.json');
        fs.writeFileSync(filePath, JSON.stringify(gameArray));
      } catch (error) {
        console.error('Error saving games:', error);
      }
    }, 1000); // Save after 1 second of inactivity
  }

  private startCleanup(): void {
    // 더 자주 정리 (2분마다)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  private cleanup(): void {
    let removed = 0;
    const roomsToDelete: string[] = [];
    const now = Date.now();
    const maxAgeMs = this.MAX_AGE_MINUTES * 60 * 1000;

    this.gameStates.forEach((gameState, roomCode) => {
      const activePlayers = gameState.players.filter(p => p.chips > 0 && p.isActive);
      
      // 더 적극적인 정리 조건
      const isInactive = 
        activePlayers.length === 0 || 
                        gameState.stage === 'ended' || 
        (gameState.stage === 'waiting' && activePlayers.length < 2) ||
        (gameState.lastActivity && (now - gameState.lastActivity) > maxAgeMs);

      if (isInactive) {
        roomsToDelete.push(roomCode);
        removed++;
      }
    });

    // 최대 게임 수 제한
    if (this.gameStates.size > this.MAX_GAMES) {
      const gamesToRemove = this.gameStates.size - this.MAX_GAMES;
      const sortedGames = Array.from(this.gameStates.entries())
        .sort(([, a], [, b]) => {
          const aAge = a.lastActivity || 0;
          const bAge = b.lastActivity || 0;
          return aAge - bAge;
        });
      
      for (let i = 0; i < gamesToRemove; i++) {
        roomsToDelete.push(sortedGames[i][0]);
        removed++;
      }
    }

    roomsToDelete.forEach(roomCode => {
      this.gameStates.delete(roomCode);
    });

    if (removed > 0) {
      console.log(`Cleaned up ${removed} inactive games (${this.gameStates.size} remaining)`);
      this.saveGameStates();
      
      if (global.gc) {
        global.gc();
      }
    }
  }

  setGameState(roomCode: string, gameState: GameState): void {
    this.gameStates.set(roomCode, gameState);
    this.saveGameStates();
  }

  getGameState(roomCode: string): GameState | undefined {
    return this.gameStates.get(roomCode);
  }

  deleteGameState(roomCode: string): void {
    this.gameStates.delete(roomCode);
    this.saveGameStates();
  }

  getAllActiveRooms(): string[] {
    const activeRooms: string[] = [];
    this.gameStates.forEach((gameState, roomCode) => {
      const activePlayers = gameState.players.filter(p => p.chips > 0 && p.isActive);
      if (activePlayers.length > 0 && gameState.stage !== 'ended') {
        activeRooms.push(roomCode);
      }
    });
    return activeRooms;
  }

  getMemoryStats(): { totalGames: number; activeGames: number } {
    const totalGames = this.gameStates.size;
    const activeGames = this.getAllActiveRooms().length;
    return { totalGames, activeGames };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}
