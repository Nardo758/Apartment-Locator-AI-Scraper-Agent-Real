export type Json = any;

export interface QueueItem {
  id?: number;
  external_id?: string;
  url?: string;
  property_name?: string;
  website_name?: string;
  region?: string;
  [key: string]: unknown;
}

export interface CostItem {
  date: string;
  properties_scraped?: number;
  ai_requests?: number;
  tokens_used?: number;
  estimated_cost?: number;
  details?: Record<string, unknown>;
}

export type SystemEventData = Record<string, unknown>;

export type BatchJob = Record<string, unknown>;

export interface RecentActivity {
  timestamp: string;
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface Dashboard {
  getStatus?: () => unknown;
}

export interface ScrapingQueueRow {
  id?: number;
  external_id?: string;
  url?: string;
  queue_id?: number;
  status?: string;
  [k: string]: unknown;
}
