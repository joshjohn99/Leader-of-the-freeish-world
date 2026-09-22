import type {World} from '../../../shared/schemas/oil-crisis.ts';
export interface CharacterRelationship {a:string;b:string;kind:string;facts:string}
export class RelationshipNetwork {
 private links:CharacterRelationship[]=[];
 connect(link:CharacterRelationship){if(this.links.some(l=>[l.a,l.b].sort().join(':')===[link.a,link.b].sort().join(':')))throw Error('Relationship already registered');this.links.push(Object.freeze({...link}));return this;}
 forCharacter(id:string,world:World){return {relationships:this.links.filter(l=>l.a===id||l.b===id),publicDevelopments:world.events.filter(e=>e.diplomacy?.reply==='accept'||e.sterling?.reply==='fund'||e.sterling?.reply==='humiliate').slice(-6).map(e=>({day:e.after.day,fact:e.diplomacy?.reply==='accept'?'Freedoma signed an oil purchase with Petrovia.':e.sterling?.reply==='fund'?'Freedoma funded a temporary Volt Motors bus pilot.':'Freedoma publicly mocked Max Sterling.'})),boundary:'Knowing someone does not reveal private talks. No secret deal, backchannel message, alliance, or favor has occurred unless explicitly recorded.'};}
}
export const relationships=new RelationshipNetwork().connect({a:'max',b:'petrov',kind:'Business acquaintances',facts:'Max Sterling and Viktor Petrov met at a fictional international investment summit. Max wants access to markets; Petrov values export revenue. They know each other, but neither owes the other a favor. Electric buses may reduce oil demand, creating competing interests.'});
