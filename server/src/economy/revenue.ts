import type {World} from '../../../shared/schemas/oil-crisis.ts';
import {TERM_DAYS} from '../election/election.ts';

/** Prototype tax receipts, independent of dialogue, popularity, and spending. */
export const REVENUE_BALANCE=Object.freeze({amount:45,interval:3,dailyRevenue:3});
export interface TreasuryDeposit {readonly kind:'tax-receipts-v1';readonly day:number;readonly amount:number}
export function scheduledDeposit(day:number):TreasuryDeposit|undefined {
 if(!Number.isInteger(day)||day<REVENUE_BALANCE.interval||day>TERM_DAYS||day%REVENUE_BALANCE.interval!==0)return;
 return Object.freeze({kind:'tax-receipts-v1',day,amount:REVENUE_BALANCE.amount});
}
export function revenueOutlook(world:World){
 const nextDay=(Math.floor(world.state.day/REVENUE_BALANCE.interval)+1)*REVENUE_BALANCE.interval;
 const last=world.events.findLast(e=>e.treasuryDeposit)?.treasuryDeposit;
 return {amount:REVENUE_BALANCE.amount,interval:REVENUE_BALANCE.interval,dailyRevenue:REVENUE_BALANCE.dailyRevenue,nextDay:nextDay<=TERM_DAYS?nextDay:null,last};
}
