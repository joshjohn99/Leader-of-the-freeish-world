import {strategicState,stageLabel,currentStrategicTurn} from '../server/src/diplomacy/strategic.ts';
import type { World } from '../shared/schemas/oil-crisis.ts';
import type { AgentVoice } from '../server/src/ai/claude.ts';
import { escapeHtml as e } from './conversation.ts';
export function diplomacyLane(world:World,voice:AgentVoice|undefined,busy:boolean,active:boolean){
 const s=strategicState(world);if(s){const turn=currentStrategicTurn(world)?.strategic?.command;return `<div class="lane-label">DIPLOMACY · PRIVATE CONVERSATION</div><button id="resume-diplomacy" class="diplomat-thread ${active?'selected':''}"><span class="diplomat-avatar">VP</span><span><b>Viktor Petrov <small>Petrovia</small></b><em>${e(stageLabel[s.stage])} · ${e(s.treaty?.status??'No agreement')}</em><p>${e((turn?.kind==='turn'?turn.voice.line:'Trade, Bellara, security, and your next agreement.').slice(0,140))}</p></span><span class="lane-arrow">↗</span></button>`;}
 const talks=world.events.filter(event=>event.diplomacy),last=talks.at(-1);
 const status=busy?'Petrov is considering your move…':voice?'Petrov has replied · your turn':last?.diplomacy?.reply==='accept'?'Deal signed · conversation available':talks.length?'Negotiation in progress':'Secure line available';
 return `<div class="lane-label">DIPLOMACY · PRIVATE CONVERSATION</div><button id="resume-diplomacy" class="diplomat-thread ${active?'selected':''}"><span class="diplomat-avatar">VP</span><span><b>Viktor Petrov <small>Petrovia</small></b><em>${status}</em><p>${e((voice?.line??last?.diplomacy?.playerLine??'Your next reply could change the deal.').slice(0,140))}</p></span><span class="lane-arrow">↗</span></button><div class="lane-footer"><span>${talks.length} recorded exchanges</span><span>${active?'Conversation open':'Open conversation →'}</span></div>`;
}
