export type SexCoinSide = 'heads' | 'tails';

export type SexCoinFlip = {
  id: string;
  relationshipId: string;
  day: string;
  memberUserIds: string[];
  createdByUserId: string;
  guess: SexCoinSide;
  outcome: SexCoinSide;
  createdAt: string;
};

export type FlipSexCoinInput = {
  today?: string;
  memberUserIds: string[];
  guess: SexCoinSide;
};

export type FlipSexCoinResponse = {
  coinFlip: SexCoinFlip;
  status: SexDailyStatus;
};

export type SexEvent = {
  id: string;
  relationshipId: string;
  day: string;
  memberUserIds: string[];
  createdByUserId: string;
  createdAt: string;
};

export type SexEventListFilters = {
  month: string;
  cursor?: string;
  limit?: number;
};

export type SexEventListResponse = {
  earliestEventDayId: string | null;
  items: SexEvent[];
  nextCursor?: string;
};

export type CreateSexEventInput = {
  day: string;
  today?: string;
  memberUserIds: string[];
};

export type SexDailyStatus = {
  today: string;
  memberUserIds: string[];
  lastSexEvent: SexEvent | null;
  daysSinceLastSex: number | null;
  coinFlip: SexCoinFlip | null;
  requiresCoinFlip: boolean;
  canHaveSex: boolean;
};
