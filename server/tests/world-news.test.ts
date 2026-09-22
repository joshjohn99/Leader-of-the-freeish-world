import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,decide,replay,respondToNews} from '../src/world/oil-crisis.ts';
import {WorldEventEngine,worldEventEngine,newsOptions} from '../src/events/world-news.ts';
import {newsMarkup} from '../../web/world-news.ts';
test('world bulletins are deterministic, spaced out, and do not fabricate resource losses',()=>{
 let w=createWorld();const expected=worldEventEngine.next(w);assert.deepEqual(worldEventEngine.next(w),expected);
 w=decide(w,'wait');assert.deepEqual(w.events[0].news,expected);assert.equal(w.state.oil,2);
 const first=w.events[0].news;w=decide(w,'wait');assert.equal(w.events[1].news,undefined);w=decide(w,'wait');w=decide(w,'wait');assert.ok(w.events[3].news);assert.notEqual(w.events[3].news!.kind,first!.kind);assert.deepEqual(replay(w.events),w);
});
test('PNN responses cost resources once and replay; legacy saves remain readable',()=>{
 const w=decide(createWorld(),'wait'),id=w.events[0].news!.id;
 const next=respondToNews(w,id,'relief');assert.equal(next.state.treasury,w.state.treasury-6+3);assert.equal(newsOptions(next,id).length,0);assert.throws(()=>respondToNews(next,id,'relief'));assert.deepEqual(replay(next.events),next);
 const legacy=decide(createWorld(),'wait',false);assert.equal(legacy.events[0].news,undefined);assert.deepEqual(replay(legacy.events),legacy);
});
test('event registry rejects duplicate definitions and news UI exposes confirmed facts',()=>{
 const engine=new WorldEventEngine();const definition={id:'test',headline:'A verified event',facts:'A meeting happened.',stakes:'Talks may continue.'};engine.register(definition);assert.throws(()=>engine.register(definition));
 const w=decide(createWorld(),'wait');const before=JSON.stringify(w);const html=newsMarkup(w);assert.match(html,/No automatic resource change/);assert.match(html,/data-news-action/);assert.equal(JSON.stringify(w),before);assert.throws(()=>respondToNews(w,'invented','monitor'));
});
