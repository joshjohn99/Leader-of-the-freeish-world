import test from 'node:test';import assert from 'node:assert/strict';
import {relationships,RelationshipNetwork} from '../src/agents/relationships.ts';
import {createWorld,beginDay,replyToPetrov,replyToMax} from '../src/world/oil-crisis.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';import {maxTurn} from '../src/billionaires/sterling.ts';
import {officeHub} from '../../web/office-hub.ts';
test('relationships are reciprocal without exposing private messages',()=>{
 let world=createWorld();const offer=petrovTurn(world);world=replyToPetrov(world,'counter',offer.id,'default','secret Petrov message','private player wording');
 const max=relationships.forCharacter('max',world),petrov=relationships.forCharacter('petrov',world);
 assert.deepEqual(max.relationships,petrov.relationships);assert.equal(max.relationships.length,1);assert.doesNotMatch(JSON.stringify(max),/secret Petrov|private player/);assert.equal(max.publicDevelopments.length,0);
 const o=maxTurn(world);world=replyToMax(world,'fund',o.id,o.strategy,'secret Max message');
 assert.match(JSON.stringify(relationships.forCharacter('petrov',world)),/funded a temporary/);assert.doesNotMatch(JSON.stringify(relationships.forCharacter('petrov',world)),/secret Max/);
});
test('office offers separate public, diplomatic and business routes without advancing time',()=>{
 const world=beginDay(createWorld()),before=JSON.stringify(world),html=officeHub(world);
 for(const route of ['press','phone','max'])assert.ok(html.includes(`data-activity="${route}"`));
 assert.match(html,/TODAY’S AGENDA/);assert.equal(JSON.stringify(world),before);
 const n=new RelationshipNetwork().connect({a:'a',b:'b',kind:'known',facts:'They met.'});assert.throws(()=>n.connect({a:'b',b:'a',kind:'known',facts:'Again.'}));
});
