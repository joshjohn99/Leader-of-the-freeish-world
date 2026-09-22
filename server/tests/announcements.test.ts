import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,publishAnnouncement,decide,replay} from '../src/world/oil-crisis.ts';
import {campaignRules} from '../src/campaign/campaign.ts';
import {socialContext} from '../src/ai/social.ts';
import {pressSecretaryMarkup} from '../../web/press-secretary.ts';
import {broadcastFor} from '../../web/broadcasts.ts';
test('announcement records a public claim, advances a normal day, and replays',()=>{
 const start=createWorld(),text='We promise unicorns at every school.',world=publishAnnouncement(start,text);
 assert.deepEqual(world.state,decide(start,'wait').state);assert.equal(world.events[0].announcement?.text,text);assert.deepEqual(replay(world.events),world);
 assert.equal(campaignRules.context(world).announcements[0].text,text);assert.match(JSON.stringify(socialContext(world,[])),/unicorns/);
 assert.equal(broadcastFor(world.events[0]).speech,text);assert.equal(start.events.length,0);
});
test('announcements reject bad input, preserve election boundary, and escape rendered claims',()=>{
 for(const text of ['',null,'short','x'.repeat(801)])assert.throws(()=>publishAnnouncement(createWorld(),text));
 const world=publishAnnouncement(createWorld(),'<script>alert(1)</script>');assert.doesNotMatch(pressSecretaryMarkup(world),/<script>/);assert.match(pressSecretaryMarkup(world),/&lt;script&gt;/);
 let end=createWorld();for(let i=0;i<30;i++)end=decide(end,'wait');assert.throws(()=>publishAnnouncement(end,'My final announcement.'),/election has concluded/);
});
