export type CrisisStage='quiet'|'border_pressure'|'incursion'|'regional_war'|'ceasefire'|'withdrawal';
export type Posture='pragmatic'|'prestige'|'pressure';
export interface TreatyTerms {
 quantity:number;price:number;days:3;territory:'none'|'halt'|'withdraw';
 observers:boolean;restraint:boolean;recognition:'none'|'statement'|'summit';verifiedFirst:boolean;
}
export interface Treaty {
 serial:number;terms:TreatyTerms;signedDay:number;throughDay:number;
 status:'active'|'suspended'|'expired'|'breached';reason:string;delivered:number;paid:number;
}
export interface StrategicState {
 seed:number;stage:CrisisStage;stageSince:number;tension:number;trust:number;breaches:number;
 disruption:number;homeland:'safe'|'threatened'|'attacked';lastAttackDay:number;
 sanctionsUntil:number;readinessUntil:number;aidUntil:number;deploymentUntil:number;
 treaty?:Treaty;serial:number;proposal?:TreatyTerms;lastQuestion?:string;posture:Posture;
 suspectedBreachDay?:number;lastViolationDay:number;lastDelivery:string;
}
export interface StrategicReply {id:string;title:string;line:string}
export interface StrategicVoice {candidate:Posture;line:string;replies:StrategicReply[];source:'claude'|'offline'}
export type StrategicCommand=
 |{kind:'init';seed:number}
 |{kind:'turn';context:string;voice:StrategicVoice}
 |{kind:'reply';turnId:number;choiceId:string}
 |{kind:'sign';turnId:number}
 |{kind:'end_call'}
 |{kind:'suspend'}
 |{kind:'spot'}
 |{kind:'order';order:SecurityOrder};
export type SecurityOrder='sanctions'|'lift_sanctions'|'readiness'|'aid'|'deployment'|'humanitarian'|'peace_talks';
export interface StrategicReport {source:'PNN'|'BULL';headline:string;facts:string;certainty:'confirmed'|'unverified'}
export interface StrategicRecord {
 command:StrategicCommand|{kind:'overnight';day:number};
 snapshot:StrategicState;
 offer?:TreatyTerms;
 reports:StrategicReport[];
}
export const STRATEGIC_BALANCE=Object.freeze({
 contractDays:3 as const,reserve:12,defaultQuantity:6,maxQuantity:10,minPrice:1,maxPrice:6,
 observerCost:2,crisisStartDay:3,initialTension:40,incursionThreshold:55,warThreshold:75,homelandThreshold:85,
 stageMinimumDays:2,breachMin:5,breachMax:65,
 initialTrust:50,quietTension:25,trustDamaged:35,trustEstablished:65,
 bargaining:Object.freeze({trustDivisor:25,relationsDivisor:15,tightTreasury:45,income:2,supply:2,summit:4,statement:2,restraint:2,halt:4,withdrawal:8,warWithdrawal:10,observers:7}),
 trustChanges:Object.freeze({signature:3,compliance:2,suspension:10,incompatible:15,missedPayment:8,breach:20}),
 relationsChanges:Object.freeze({suspend:-5,purchase:5,sanctions:-8,aid:-4,deployment:-8,peace:2,breach:-8}),
 pressure:Object.freeze({pragmatic:6,prestige:3,pressure:9,sanctions:3,readiness:4,aid:4,deployment:7,imposeSanctions:5,liftSanctions:3,peaceTalks:8,compliance:12,breach:15}),
 compliance:Object.freeze({base:18,tensionDivisor:4,trustDivisor:4,priorBreach:8,observers:10,recognition:5,pressure:8,highRisk:35,watchRisk:18}),
 disruption:Object.freeze({breach:6,war:3,incursion:2,attack:8,recovery:2,humanitarian:10}),
 homelandRisk:Object.freeze({readiness:10,normal:30,cooldown:3}),sanctionsDailyLoss:4,
 orderDuration:3,deploymentDailyTreasury:2,deploymentDailyOil:1,
 regionalWarDailyCost:2,regionalWarDailyApproval:1,attackCost:5,attackOil:2,attackApproval:4,
});
export const SECURITY_ORDERS=Object.freeze([
 {id:'sanctions' as const,title:'Impose economic sanctions',cost:4,oil:0,hint:'Three days. Stops oil trade, removes up to F$4 from Petrovia each night, and raises tension.'},
 {id:'lift_sanctions' as const,title:'Lift economic sanctions',cost:0,oil:0,hint:'Reopens trade negotiations. Suspended treaties need a new agreement.'},
 {id:'readiness' as const,title:'Raise defensive readiness',cost:6,oil:0,hint:'Three days of deterrence and stronger protection against attacks on Freedoma.'},
 {id:'aid' as const,title:'Support Bellara’s defense',cost:5,oil:0,hint:'Three days of resistance support. Slows Petrovia’s pressure; relations fall.'},
 {id:'deployment' as const,title:'Authorize a limited defensive deployment',cost:10,oil:2,hint:'Three days of deterrence. Also uses F$2 and one barrel each night; ends early if upkeep cannot be paid.'},
 {id:'humanitarian' as const,title:'Fund humanitarian assistance',cost:4,oil:0,hint:'Reduces recorded civilian disruption by ten. Does not stop the war.'},
 {id:'peace_talks' as const,title:'Open a peace initiative',cost:0,oil:0,hint:'Reduces tension by eight. A proposal for talks does not create a ceasefire.'},
]);
