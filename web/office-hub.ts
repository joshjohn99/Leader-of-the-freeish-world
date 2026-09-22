import {agendaMarkup} from './agenda.ts';
import type {World} from '../shared/schemas/oil-crisis.ts';
export function officeHub(world:World){return agendaMarkup(world);}
