import { Request } from 'express';

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  search: string;
}

export const parsePagination = (req: Request): PaginationResult => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
  const skip = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  return { page, limit, skip, search };
};

export const parsePaginationParams = (query: any): PaginationResult => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string, 10) || 10));
  const skip = (page - 1) * limit;
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  return { page, limit, skip, search };
};

export const isPostgres = (): boolean => {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
};

export const buildStringFilter = (search: string) => {
  if (!search) return undefined;
  return {
    contains: search,
    ...(isPostgres() ? { mode: 'insensitive' as const } : {}),
  };
};

export const searchFilter = (search: string) => ({
  contains: search,
  ...(isPostgres() ? { mode: 'insensitive' as const } : {}),
});

export const formatPaginationResponse = <T>(
  data: T[],
  totalRecords: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

export const formatPaginatedResponse = formatPaginationResponse;

