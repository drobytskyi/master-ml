export interface Metric {
  Timestamp: string;
  Average: number;
  Unit: string;
}

export interface ResourceDecision {
  action: 'Scale Up' | 'Scale Down' | 'No Action';
  resources?: {
    instanceType: string;
  };
  time: string;
  reason?: string;
}
