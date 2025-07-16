import { PokerGame } from "./PokerGame";
import { IStorage } from "../storage";
import { GameState, PlayerAction } from "@shared/schema";
import { LightweightStorage } from "../storage/LightweightStorage";

export class GameManager {
  private games: Map<string, PokerGame> = new Map();
  private storage: IStorage;
  private lightweightStorage: LightweightStorage;
  public onGameStateChange?: (roomCode: string, gameState: GameState) => void;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.lightweightStorage = new LightweightStorage();
    this.loadExistingGames();
  }

  private async loadExistingGames(): Promise<void> {
    try {
      console.log('Loading existing games from storage...');
      
      // Load active games from lightweight storage
      const activeRooms = this.lightweightStorage.getAllActiveRooms();
      for (const roomCode of activeRooms) {
        const gameState = this.lightweightStorage.getGameState(roomCode);
        if (gameState && gameState.players.length > 0) {
          // Recreate game instance from saved state
          const game = new PokerGame(roomCode, {
            maxPlayers: gameState.maxPlayers,
            smallBlind: gameState.smallBlind,
            bigBlind: gameState.bigBlind
          });
          
          // Restore the full game state
          game.restoreGameState(gameState);
          this.games.set(roomCode, game);
          
          // Set up state change callback
          game.setOnStateChange((state) => {
            this.lightweightStorage.setGameState(roomCode, state);
            if (this.onGameStateChange) {
              this.onGameStateChange(roomCode, state);
            }
          });
        }
      }
      
      const stats = this.lightweightStorage.getMemoryStats();
      console.log(`Restored ${this.games.size} active games (${stats.totalGames} total in storage)`);
    } catch (error) {
      console.error('Error loading existing games:', error);
    }
  }

  async createGame(roomCode, options) {
    const game = new PokerGame(roomCode, options);
    
    // Set up state change callback for lightweight storage
    game.setOnStateChange((gameState) => {
      this.lightweightStorage.setGameState(roomCode, gameState);
      this.onGameStateChange?.(roomCode, gameState);
    });
    
    this.games.set(roomCode, game);
    this.lightweightStorage.setGameState(roomCode, game.getGameState());
  }

  async addPlayer(roomCode, playerId, playerName) {
    let game = this.games.get(roomCode);
    
    // If game not found in memory, try to restore from lightweight storage
    if (!game) {
      const storedGameState = this.lightweightStorage.getGameState(roomCode);
      if (storedGameState) {
        // Recreate the game from stored state
        game = new PokerGame(roomCode, {
          maxPlayers: storedGameState.maxPlayers,
          smallBlind: storedGameState.smallBlind,
          bigBlind: storedGameState.bigBlind
        });
        
        // Restore the game state
        game.restoreGameState(storedGameState);
        
        // Set up state change callback for lightweight storage
        game.setOnStateChange((gameState) => {
          this.lightweightStorage.setGameState(roomCode, gameState);
          this.onGameStateChange?.(roomCode, gameState);
        });
        
        this.games.set(roomCode, game);
        console.log(`Restored game ${roomCode} from lightweight storage`);
      } else {
        return { success: false, error: "Game not found" };
      }
    }

    const result = game.addPlayer(playerId, playerName);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async removePlayer(roomCode, playerId) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.removePlayer(playerId);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async handlePlayerAction(roomCode, playerId, action) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.handlePlayerAction(playerId, action);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async startGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.startGame();
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async confirmWinner(roomCode, playerId) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.confirmWinner(playerId);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async updateGameSettings(roomCode, playerId, settings) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.updateGameSettings(playerId, settings);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async increaseBlind(roomCode, playerId, newBigBlind) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.increaseBlind(playerId, newBigBlind);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async startNextHand(roomCode, playerId) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.startNextHand(playerId);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  async resetToSettings(roomCode, playerId) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    const result = game.resetToSettings(playerId);
    if (result.success) {
      this.lightweightStorage.setGameState(roomCode, game.getGameState());
      return { success: true, gameState: game.getGameState() };
    }

    return { success: false, error: result.error };
  }

  getGame(roomCode) {
    return this.games.get(roomCode);
  }
}
