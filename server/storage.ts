import { 
  users, 
  pokerGames, 
  gameParticipants,
  type User, 
  type InsertUser,
  type PokerGame,
  type InsertPokerGame,
  type GameParticipant,
  type InsertGameParticipant,
  type GameState
} from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createPokerGame(game: InsertPokerGame): Promise<PokerGame>;
  getPokerGame(id: number): Promise<PokerGame | undefined>;
  getPokerGameByRoomCode(roomCode: string): Promise<PokerGame | undefined>;
  updatePokerGame(id: number, updates: Partial<PokerGame>): Promise<PokerGame | undefined>;
  
  createGameParticipant(participant: InsertGameParticipant): Promise<GameParticipant>;
  getGameParticipants(gameId: number): Promise<GameParticipant[]>;
  updateGameParticipant(id: number, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined>;
  
  // Game state management
  setGameState(roomCode: string, gameState: GameState): Promise<void>;
  getGameState(roomCode: string): Promise<GameState | undefined>;
  deleteGameState(roomCode: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pokerGames: Map<number, PokerGame>;
  private gameParticipants: Map<number, GameParticipant>;
  private gameStates: Map<string, GameState>;
  private currentUserId: number;
  private currentGameId: number;
  private currentParticipantId: number;
  private dataDir: string;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'game-data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.users = new Map();
    this.pokerGames = new Map();
    this.gameParticipants = new Map();
    this.gameStates = new Map();
    this.currentUserId = 1;
    this.currentGameId = 1;
    this.currentParticipantId = 1;

    // Load only game states (not users/participants for memory efficiency)
    this.loadGameStatesOnly();
    
    // Start memory cleanup every 30 minutes
    this.startMemoryCleanup();
  }

  private loadGameStatesOnly(): void {
    try {
      // Only load game states to minimize memory usage
      const gameStatesFile = path.join(this.dataDir, 'gameStates.json');
      if (fs.existsSync(gameStatesFile)) {
        const data = fs.readFileSync(gameStatesFile, 'utf8');
        const gameStatesArray = JSON.parse(data);
        this.gameStates = new Map(gameStatesArray);
        console.log(`Loaded ${this.gameStates.size} game states`);
      }
    } catch (error) {
      console.error('Error loading game states:', error);
    }
  }

  private startMemoryCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveGames();
    }, 30 * 60 * 1000); // 30분마다 정리
  }

  private cleanupInactiveGames(): void {
    let cleaned = 0;

    const roomCodesToDelete: string[] = [];
    this.gameStates.forEach((gameState, roomCode) => {
      // 활성 플레이어가 없거나 대기/종료 상태인 게임 삭제
      const activePlayers = gameState.players.filter((p: any) => p.chips > 0);
      const isOld = gameState.stage === 'waiting' || gameState.stage === 'ended';
      
      if (activePlayers.length === 0 || isOld) {
        roomCodesToDelete.push(roomCode);
        cleaned++;
      }
    });

    roomCodesToDelete.forEach(roomCode => {
      this.gameStates.delete(roomCode);
    });

    if (cleaned > 0) {
      console.log(`Memory cleanup: removed ${cleaned} inactive games`);
      this.saveGameStatesOnly();
    }
  }

  private saveGameStatesOnly(): void {
    try {
      const gameStatesArray = Array.from(this.gameStates.entries());
      fs.writeFileSync(
        path.join(this.dataDir, 'gameStates.json'),
        JSON.stringify(gameStatesArray, null, 2)
      );
    } catch (error) {
      console.error('Error saving game states:', error);
    }
  }

  // Removed heavy saveData method to reduce memory usage

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPokerGame(insertGame: InsertPokerGame): Promise<PokerGame> {
    const id = this.currentGameId++;
    const game: PokerGame = { 
      id,
      roomCode: insertGame.roomCode,
      maxPlayers: insertGame.maxPlayers || 6,
      smallBlind: insertGame.smallBlind || 10,
      bigBlind: insertGame.bigBlind || 20,
      isActive: true,
      createdAt: new Date()
    };
    this.pokerGames.set(id, game);
    return game;
  }

  async getPokerGame(id: number): Promise<PokerGame | undefined> {
    return this.pokerGames.get(id);
  }

  async getPokerGameByRoomCode(roomCode: string): Promise<PokerGame | undefined> {
    return Array.from(this.pokerGames.values()).find(
      (game) => game.roomCode === roomCode
    );
  }

  async updatePokerGame(id: number, updates: Partial<PokerGame>): Promise<PokerGame | undefined> {
    const game = this.pokerGames.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.pokerGames.set(id, updatedGame);
    return updatedGame;
  }

  async createGameParticipant(insertParticipant: InsertGameParticipant): Promise<GameParticipant> {
    const id = this.currentParticipantId++;
    const participant: GameParticipant = { 
      id,
      gameId: insertParticipant.gameId,
      playerId: insertParticipant.playerId,
      playerName: insertParticipant.playerName,
      chips: insertParticipant.chips || 1000,
      position: insertParticipant.position,
      isActive: true
    };
    this.gameParticipants.set(id, participant);
    return participant;
  }

  async getGameParticipants(gameId: number): Promise<GameParticipant[]> {
    return Array.from(this.gameParticipants.values()).filter(
      (participant) => participant.gameId === gameId
    );
  }

  async updateGameParticipant(id: number, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined> {
    const participant = this.gameParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, ...updates };
    this.gameParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async setGameState(roomCode: string, gameState: GameState): Promise<void> {
    this.gameStates.set(roomCode, gameState);
    this.saveGameStatesOnly(); // Save only game states for memory efficiency
  }

  async getGameState(roomCode: string): Promise<GameState | undefined> {
    return this.gameStates.get(roomCode);
  }

  async deleteGameState(roomCode: string): Promise<void> {
    this.gameStates.delete(roomCode);
    this.saveGameStatesOnly(); // Save only game states for memory efficiency
  }
}

export const storage = new MemStorage();
