export type DateNightEvent = {
  id: string;
  relationshipId: string;
  day: string;
  description?: string;
  createdByUserId: string;
  createdAt: string;
};

export type DateNightEventListFilters = {
  month: string;
  cursor?: string;
  limit?: number;
};

export type DateNightEventListResponse = {
  earliestEventDayId: string | null;
  latestEventDayId: string | null;
  items: DateNightEvent[];
  nextCursor?: string;
};

export type CreateDateNightEventInput = {
  day: string;
  description?: string;
  today?: string;
};
