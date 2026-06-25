import type { PaginatedMeta } from '../interfaces/paginated-response.interface';

export function buildPaginatedMeta(
  page: number,
  limit: number,
  total: number,
): PaginatedMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginateArray<T>(items: T[], page: number, limit: number): T[] {
  const skip = (page - 1) * limit;
  return items.slice(skip, skip + limit);
}
