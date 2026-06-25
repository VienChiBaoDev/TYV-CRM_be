import type { PaginatedMeta } from '../interfaces/paginated-response.interface';

export function buildPaginatedMeta(page: number, limit: number, total: number): PaginatedMeta {
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

// Hàm này dùng để phân trang dữ liệu trả về từ database dựa trên page và limit ví dụ page = 1, limit = 10 thì sẽ trả về 10 dữ liệu từ 1 đến 10 nếu page = 2, limit = 10 thì sẽ trả về 10 dữ liệu từ 11 đến 20
// Chính là offset = (page - 1) * limit và limit là số lượng dữ liệu trả về
export function paginateArray<T>(items: T[], page: number, limit: number): T[] {
  const skip = (page - 1) * limit;
  return items.slice(skip, skip + limit);
}
