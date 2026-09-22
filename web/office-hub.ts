import {revenueMarkup} from './revenue.ts';
import {agendaMarkup} from './agenda.ts';
import type {World} from '../shared/schemas/oil-crisis.ts';
export function officeHub(world:World){return revenueMarkup(world)+agendaMarkup(world);}
