import test from 'node:test';import assert from 'node:assert/strict';
import {conversationMarkup} from '../../web/conversation.ts';
import {createWorld} from '../src/world/oil-crisis.ts';
test('pending AI negotiation does not present canned choices as the new response',()=>{
 const html=conversationMarkup(createWorld(),undefined,'offline',true);
 assert.doesNotMatch(html,/data-reply=/);assert.match(html,/Considering/);
});
test('offline negotiation shows its failure reason and a local retry',()=>{
 const html=conversationMarkup(createWorld(),undefined,'offline',false,'Claude is rate limiting requests.');
 assert.match(html,/Claude is rate limiting requests/);assert.match(html,/id="petrov-retry"/);
});
