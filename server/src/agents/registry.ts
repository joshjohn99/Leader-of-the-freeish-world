import type {SocialInteraction} from '../../../shared/schemas/social.ts';
import type {World} from '../../../shared/schemas/oil-crisis.ts';
export interface AgentContext {world:World;cabinetPromise?:number;congressPromise?:number;interactions:SocialInteraction[];cabinetMessages?:import('./cabinet.ts').CabinetMessage[]}
export interface AgentConfig {key:string;model:string;workspaceId:string}
export interface WorldAgent {readonly id:string;respond(context:AgentContext,config:AgentConfig):Promise<object>}
export class CharacterAgent implements WorldAgent {
 readonly id:string;private generate:(context:AgentContext,config:AgentConfig)=>Promise<object>;
 constructor(id:string,generate:(context:AgentContext,config:AgentConfig)=>Promise<object>){this.id=id;this.generate=generate;}
 respond(context:AgentContext,config:AgentConfig){return this.generate(context,config);}
}
export class AgentRegistry {
 private agents=new Map<string,WorldAgent>();
 register(agent:WorldAgent){if(this.agents.has(agent.id))throw Error('Duplicate agent');this.agents.set(agent.id,agent);return this;}
 has(id:string){return this.agents.has(id);}
 respond(id:string,context:AgentContext,config:AgentConfig){const agent=this.agents.get(id);if(!agent)throw Error('Unknown agent');return agent.respond(context,config);}
}
