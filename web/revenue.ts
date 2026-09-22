import type {World} from '../shared/schemas/oil-crisis.ts';
import {revenueOutlook} from '../server/src/economy/revenue.ts';
export function revenueMarkup(world:World){
 const r=revenueOutlook(world);
 return `<section class="treasury-income" aria-label="Treasury income"><div><span class="income-label">TREASURY INCOME</span><strong>${r.nextDay?`F$${r.amount} arrives on day ${r.nextDay}`:'No further deposits this term'}</strong></div><p>Tax receipts every ${r.interval} days, plus F$${r.dailyRevenue} daily revenue. Deposits arrive automatically before overnight bills.${r.last?`<br><span>Last deposit: +F$${r.last.amount} on day ${r.last.day}.</span>`:''}</p></section>`;
}
