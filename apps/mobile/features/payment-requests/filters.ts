import type {
  PaymentRequestStatus,
  PaymentRequestSummary,
} from '@expo-50sdk-template/shared-types';

export type PaymentRequestStatusFilter = PaymentRequestStatus | 'all';

export type PaymentRequestFilters = {
  search: string;
  category?: string;
  status: PaymentRequestStatusFilter;
  createdByUserId?: string;
  minimumAmountMinorUnits: number | null | undefined;
  maximumAmountMinorUnits: number | null | undefined;
  fromPurchaseDate?: string | null;
  toPurchaseDate?: string | null;
};

export type PaymentRequestSortField = 'date' | 'name' | 'amount';
export type PaymentRequestSortOrder = 'ascending' | 'descending';

export function parseAmountFilter(value: string): number | null | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export function parseDateFilter(value: string): string | null | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

export function filterPaymentRequests(
  requests: PaymentRequestSummary[],
  filters: PaymentRequestFilters,
): PaymentRequestSummary[] {
  const {
    search,
    category,
    status,
    createdByUserId,
    minimumAmountMinorUnits,
    maximumAmountMinorUnits,
    fromPurchaseDate,
    toPurchaseDate,
  } = filters;

  if (
    minimumAmountMinorUnits === null ||
    maximumAmountMinorUnits === null ||
    fromPurchaseDate === null ||
    toPurchaseDate === null
  ) {
    return [];
  }
  if (
    (minimumAmountMinorUnits !== undefined &&
      maximumAmountMinorUnits !== undefined &&
      minimumAmountMinorUnits > maximumAmountMinorUnits) ||
    (fromPurchaseDate !== undefined &&
      toPurchaseDate !== undefined &&
      fromPurchaseDate > toPurchaseDate)
  ) {
    return [];
  }

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const normalizedCategory = category?.trim().toLocaleLowerCase() ?? '';

  return requests.filter((request) => {
    const matchesText =
      !normalizedSearch ||
      request.title.toLocaleLowerCase().includes(normalizedSearch) ||
      request.categories.some((category) =>
        category.toLocaleLowerCase().includes(normalizedSearch),
      );
    const matchesCategory =
      !normalizedCategory ||
      request.categories.some((requestCategory) =>
        requestCategory.toLocaleLowerCase().includes(normalizedCategory),
      );
    const matchesStatus = status === 'all' || request.status === status;
    const matchesCreator =
      !createdByUserId || request.createdByUserId === createdByUserId;
    const matchesMinimum =
      minimumAmountMinorUnits === undefined ||
      request.amountMinorUnits >= minimumAmountMinorUnits;
    const matchesMaximum =
      maximumAmountMinorUnits === undefined ||
      request.amountMinorUnits <= maximumAmountMinorUnits;
    const purchaseDate = request.purchaseDate.slice(0, 10);
    const matchesFromPurchaseDate =
      fromPurchaseDate === undefined || purchaseDate >= fromPurchaseDate;
    const matchesToPurchaseDate =
      toPurchaseDate === undefined || purchaseDate <= toPurchaseDate;

    return (
      matchesText &&
      matchesCategory &&
      matchesStatus &&
      matchesCreator &&
      matchesMinimum &&
      matchesMaximum &&
      matchesFromPurchaseDate &&
      matchesToPurchaseDate
    );
  });
}

export function sortPaymentRequestItems<ItemT>(
  items: readonly ItemT[],
  getRequest: (item: ItemT) => PaymentRequestSummary,
  sortField: PaymentRequestSortField,
  sortOrder: PaymentRequestSortOrder,
): ItemT[] {
  const direction = sortOrder === 'ascending' ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftRequest = getRequest(left);
    const rightRequest = getRequest(right);
    let comparison = 0;

    switch (sortField) {
      case 'date':
        comparison = leftRequest.purchaseDate.localeCompare(
          rightRequest.purchaseDate,
        );
        break;
      case 'name':
        comparison = leftRequest.title
          .toLocaleLowerCase()
          .localeCompare(rightRequest.title.toLocaleLowerCase());
        break;
      case 'amount':
        comparison =
          leftRequest.amountMinorUnits - rightRequest.amountMinorUnits;
        break;
    }

    return comparison === 0
      ? leftRequest.id.localeCompare(rightRequest.id)
      : comparison * direction;
  });
}
