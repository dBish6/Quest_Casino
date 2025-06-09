export type HttpResponse<TData extends object = {}> = {
  message: string;
  success?: true;
} & TData;

export interface ErrorResponse {
  name: string;
  message?: string;
  ERROR: string;
  allow?: boolean;
}

export type SocketResponse<TData extends object = {}> = Omit<HttpResponse, "success"> & {
  status: string;
} & TData;
