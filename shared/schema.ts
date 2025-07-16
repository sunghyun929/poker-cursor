import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const pokerGames = pgTable("poker_games", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  maxPlayers: integer("max_players").notNull().default(6),
  smallBlind: integer("small_blind").notNull().default(10),
  bigBlind: integer("big_blind").notNull().default(20),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameParticipants = pgTable("game_participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
  chips: integer("chips").notNull().default(1000),
  position: integer("position").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPokerGameSchema = createInsertSchema(pokerGames).pick({
  roomCode: true,
  maxPlayers: true,
  smallBlind: true,
  bigBlind: true,
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants).pick({
  gameId: true,
  playerId: true,
  playerName: true,
  chips: true,
  position: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPokerGame = z.infer<typeof insertPokerGameSchema>;
export type PokerGame = typeof pokerGames.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;
export type GameParticipant = typeof gameParticipants.$inferSelect;

// Game state types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
  cards: Card[];
  currentBet: number;
  hasActed: boolean;
  hasFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  lastAction?: {
    type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allIn';
    amount?: number;
  };
}

export interface GameState {
  id: string;
  roomCode: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  currentBet: number;
  minRaise: number;
  stage: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended' | 'settings';
  currentPlayerIndex: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  isActive: boolean;
  hostPlayerId?: string; // Room host player ID
  gameSettings?: {
    startingChips: number;
    initialSmallBlind: number;
    initialBigBlind: number;
  };
  blindIncrease?: {
    pending: boolean;
    newBigBlind?: number;
  };
  lastAction?: {
    playerId: string;
    action: string;
    amount?: number;
    winningHand?: {
      rank: number;
      description: string;
      cards: Card[];
      kickers: Card[];
    };
  };
  showdownHands?: Array<{
    playerId: string;
    playerName: string;
    holeCards: Card[]; // Player's 2 hole cards
    hand: {
      rank: number;
      description: string;
      cards: Card[]; // Best 5 cards that make the hand
      kickers: Card[];
    };
    isWinner: boolean;
    totalWinnings?: number; // Amount won by this player
  }>;
  winnerConfirmations?: string[]; // Player IDs who have confirmed
  lastGameWinner?: {
    playerId: string;
    playerName: string;
  }; // Winner of the last completed game
}

export interface PlayerAction {
  type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allIn';
  amount?: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'gameState' | 'playerJoined' | 'playerLeft' | 'playerAction' | 'gameEnd' | 'error' | 'joinGame' | 'leaveGame' | 'startGame' | 'confirmWinner' | 'updateSettings' | 'increaseBlind' | 'startNextHand' | 'resetToSettings' | 'chatMessage' | 'sendMessage' | 'reconnect' | 'ping' | 'pong';
  data: any;
}
