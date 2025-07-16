import type { Card } from "@shared/schema";

export interface HandRank {
  rank: number;
  description: string;
  cards: Card[];
  kickers: Card[];
}

export class HandEvaluator {
  private static getRankValue(rank: Card['rank']): number {
    const values: Record<Card['rank'], number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };
    return values[rank];
  }

  static evaluateHand(cards: Card[]): HandRank {
    // Sort cards by rank (highest first)
    const sortedCards = [...cards].sort((a, b) => 
      this.getRankValue(b.rank) - this.getRankValue(a.rank)
    );
    
    // Check for each hand type (best to worst)
    return this.checkRoyalFlush(sortedCards) ||
           this.checkStraightFlush(sortedCards) ||
           this.checkFourOfAKind(sortedCards) ||
           this.checkFullHouse(sortedCards) ||
           this.checkFlush(sortedCards) ||
           this.checkStraight(sortedCards) ||
           this.checkThreeOfAKind(sortedCards) ||
           this.checkTwoPair(sortedCards) ||
           this.checkOnePair(sortedCards) ||
           this.checkHighCard(sortedCards);
  }

  static compareHands(hand1: HandRank, hand2: HandRank): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }

    // Same rank, compare by main cards then kickers
    const allCards1 = [...hand1.cards, ...hand1.kickers];
    const allCards2 = [...hand2.cards, ...hand2.kickers];

    for (let i = 0; i < Math.max(allCards1.length, allCards2.length); i++) {
      const card1Value = allCards1[i] ? this.getRankValue(allCards1[i].rank) : 0;
      const card2Value = allCards2[i] ? this.getRankValue(allCards2[i].rank) : 0;
      
      if (card1Value !== card2Value) {
        return card1Value - card2Value;
      }
    }

    return 0; // Exact tie
  }

  private static checkRoyalFlush(cards: Card[]): HandRank | null {
    const straightFlush = this.checkStraightFlush(cards);
    if (straightFlush && this.getRankValue(straightFlush.cards[0].rank) === 14) {
      return {
        rank: 10,
        description: "Royal Flush",
        cards: straightFlush.cards,
        kickers: []
      };
    }
    return null;
  }

  private static checkStraightFlush(cards: Card[]): HandRank | null {
    const flush = this.checkFlush(cards);
    const straight = this.checkStraight(cards);
    
    if (flush && straight) {
      // Find the actual straight flush cards
      const suitGroups = this.groupBySuit(cards);
      for (const suit in suitGroups) {
        const suitCards = suitGroups[suit];
        if (suitCards.length >= 5) {
          const straightInSuit = this.findStraight(suitCards);
          if (straightInSuit) {
            return {
              rank: 9,
              description: "Straight Flush",
              cards: straightInSuit,
              kickers: []
            };
          }
        }
      }
    }
    return null;
  }

  private static checkFourOfAKind(cards: Card[]): HandRank | null {
    const rankGroups = this.groupByRank(cards);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 4) {
        const fourCards = rankGroups[rank].slice(0, 4);
        const kickers = cards.filter(c => c.rank !== rank).slice(0, 1);
        
        return {
          rank: 8,
          description: "Four of a Kind",
          cards: fourCards,
          kickers
        };
      }
    }
    return null;
  }

  private static checkFullHouse(cards: Card[]): HandRank | null {
    const rankGroups = this.groupByRank(cards);
    let threeOfAKind: Card[] | null = null;
    let pair: Card[] | null = null;

    // Find three of a kind first
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 3) {
        threeOfAKind = rankGroups[rank].slice(0, 3);
        break;
      }
    }

    if (threeOfAKind) {
      // Find pair (different rank)
      for (const rank in rankGroups) {
        if (rank !== threeOfAKind[0].rank && rankGroups[rank].length >= 2) {
          pair = rankGroups[rank].slice(0, 2);
          break;
        }
      }

      if (pair) {
        return {
          rank: 7,
          description: "Full House",
          cards: [...threeOfAKind, ...pair],
          kickers: []
        };
      }
    }
    return null;
  }

  private static checkFlush(cards: Card[]): HandRank | null {
    const suitGroups = this.groupBySuit(cards);
    
    for (const suit in suitGroups) {
      if (suitGroups[suit].length >= 5) {
        const flushCards = suitGroups[suit]
          .sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))
          .slice(0, 5);
        
        return {
          rank: 6,
          description: "Flush",
          cards: flushCards,
          kickers: []
        };
      }
    }
    return null;
  }

  private static checkStraight(cards: Card[]): HandRank | null {
    const straightCards = this.findStraight(cards);
    if (straightCards) {
      return {
        rank: 5,
        description: "Straight",
        cards: straightCards,
        kickers: []
      };
    }
    return null;
  }

  private static checkThreeOfAKind(cards: Card[]): HandRank | null {
    const rankGroups = this.groupByRank(cards);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 3) {
        const threeCards = rankGroups[rank].slice(0, 3);
        const kickers = cards.filter(c => c.rank !== rank)
          .sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))
          .slice(0, 2);
        
        return {
          rank: 4,
          description: "Three of a Kind",
          cards: threeCards,
          kickers
        };
      }
    }
    return null;
  }

  private static checkTwoPair(cards: Card[]): HandRank | null {
    const rankGroups = this.groupByRank(cards);
    const pairs: Card[][] = [];

    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 2) {
        pairs.push(rankGroups[rank].slice(0, 2));
      }
    }

    if (pairs.length >= 2) {
      // Sort pairs by rank value
      pairs.sort((a, b) => this.getRankValue(b[0].rank) - this.getRankValue(a[0].rank));
      const twoPairCards = [...pairs[0], ...pairs[1]];
      const kickers = cards.filter(c => 
        c.rank !== pairs[0][0].rank && c.rank !== pairs[1][0].rank
      ).slice(0, 1);

      return {
        rank: 3,
        description: "Two Pair",
        cards: twoPairCards,
        kickers
      };
    }
    return null;
  }

  private static checkOnePair(cards: Card[]): HandRank | null {
    const rankGroups = this.groupByRank(cards);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 2) {
        const pairCards = rankGroups[rank].slice(0, 2);
        const kickers = cards.filter(c => c.rank !== rank)
          .sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))
          .slice(0, 3);
        
        return {
          rank: 2,
          description: "One Pair",
          cards: pairCards,
          kickers
        };
      }
    }
    return null;
  }

  private static checkHighCard(cards: Card[]): HandRank {
    const highCards = cards
      .sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank))
      .slice(0, 5);
    
    return {
      rank: 1,
      description: "High Card",
      cards: [highCards[0]],
      kickers: highCards.slice(1)
    };
  }

  private static groupByRank(cards: Card[]): Record<string, Card[]> {
    return cards.reduce((groups, card) => {
      if (!groups[card.rank]) {
        groups[card.rank] = [];
      }
      groups[card.rank].push(card);
      return groups;
    }, {} as Record<string, Card[]>);
  }

  private static groupBySuit(cards: Card[]): Record<string, Card[]> {
    return cards.reduce((groups, card) => {
      if (!groups[card.suit]) {
        groups[card.suit] = [];
      }
      groups[card.suit].push(card);
      return groups;
    }, {} as Record<string, Card[]>);
  }

  private static findStraight(cards: Card[]): Card[] | null {
    const uniqueRanks = Array.from(new Set(cards.map(c => this.getRankValue(c.rank)))).sort((a, b) => b - a);
    
    // Check for regular straight
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      const straight = uniqueRanks.slice(i, i + 5);
      if (straight[0] - straight[4] === 4) {
        // Found a straight, get the actual cards
        const straightCards: Card[] = [];
        straight.forEach(rankValue => {
          const card = cards.find(c => this.getRankValue(c.rank) === rankValue);
          if (card) straightCards.push(card);
        });
        return straightCards;
      }
    }

    // Check for A-2-3-4-5 straight (wheel)
    if (uniqueRanks.includes(14) && uniqueRanks.includes(5) && 
        uniqueRanks.includes(4) && uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
      const wheelCards: Card[] = [];
      [5, 4, 3, 2, 14].forEach(rankValue => {
        const card = cards.find(c => this.getRankValue(c.rank) === rankValue);
        if (card) wheelCards.push(card);
      });
      return wheelCards;
    }

    return null;
  }
}
