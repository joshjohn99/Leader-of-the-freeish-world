import type { DiplomacyRecord } from '../../server/src/diplomacy/petrov.ts';
export type Decision = 'buy' | 'subsidize' | 'ration' | 'threaten' | 'wait';
export interface CrisisState {
  day: number;
  treasury: number;
  oil: number;
  approval: number;
  relations: number;
  supplierOil: number;
  supplierTreasury: number;
  price: number;
  subsidyDays: number;
}
export interface WorldEvent {
  readonly congress?: import('../../server/src/congress/congress.ts').CongressRecord;
  readonly announcement?: {readonly text:string};
  readonly timing?: 'conversation'|'day-action';
  readonly agenda?: import('../../server/src/agenda/agenda.ts').AgendaRecord;
  readonly news?: import('../../server/src/events/world-news.ts').NewsBulletin;
  readonly newsResponse?: import('../../server/src/events/world-news.ts').NewsResponse;
  readonly campaign?: import('../../server/src/campaign/campaign.ts').CampaignRecord;
  readonly sterling?: import('../../server/src/billionaires/sterling.ts').MaxRecord;
  readonly diplomacy?: DiplomacyRecord;
  readonly id: number;
  readonly decision: Decision;
  readonly messages: readonly string[];
  readonly after: Readonly<CrisisState>;
}
export interface World {
  readonly state: Readonly<CrisisState>;
  readonly events: readonly WorldEvent[];
}
