export type TorrentDetail = {
  id: number;
  hash: string;
};

export type Magnet = {
  id: number;
  magnet: string;
  name: string;
  ready: true;
};
export type MagnetsResponse<T> = {
  magnets: T[];
};

export type File = {
  n: string;
  e?: File[];
  l?: string;
};
export type MagnetFile = {
  id: string;
  files: File[];
};

export type AllDebridResponse<T> = {
  status: "success" | "error";
  data: T;
};

export type OrderBy = "uploaded_at" | "seeders" | "downloads";
