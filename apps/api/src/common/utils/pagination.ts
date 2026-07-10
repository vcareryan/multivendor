import type { ApiListResponse } from '@utanstore/shared';

export interface PageParams {
  page?: number | string;
  pageSize?: number | string;
}

export function parsePage(params: PageParams): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildListResponse<T>(data: T[], total: number, page: number, pageSize: number): ApiListResponse<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  };
}
