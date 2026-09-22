import {electionMarkup} from './election.ts';
import type { World } from '../shared/schemas/oil-crisis.ts';
import { createWorld } from '../server/src/world/oil-crisis.ts';
type MetricKey = 'approval'|'treasury'|'oil'|'relations'|'price';
export const metrics: { key:MetricKey; label:string; unit:string; color:string; domain?:[number,number] }[] = [
  { key:'approval',label:'Public approval',unit:'%',color:'#527c64',domain:[0,100] },
  { key:'treasury',label:'Treasury',unit:'funds',color:'#9e793d' },
  { key:'oil',label:'Oil reserves',unit:'oil',color:'#477b8e' },
  { key:'relations',label:'Petrovia relations',unit:'points',color:'#a05f53',domain:[-100,100] },
  { key:'price',label:'Oil asking price',unit:'funds / oil',color:'#7d6e97' },
];
export function chartSeries(world:World, key:MetricKey) {
  return [createWorld().state,...world.events.map(event=>event.after)].map(state=>({day:state.day,value:state[key]}));
}
export function chartMarkup(world:World,key:MetricKey,compact=false) {
  const metric=metrics.find(metric=>metric.key===key)!;
  const data=chartSeries(world,key); const last=data.at(-1)!;
  const prev=data.at(-2)??last; const delta=last.value-prev.value;
  const min=metric.domain?.[0]??0;
  const extent=Math.max(1,...data.map(point=>point.value))*1.1;
  const magnitude=10**Math.floor(Math.log10(extent));
  const niceMax=[1,2,5,10].find(step=>step*magnitude>=extent)!*magnitude;
  const max=metric.domain?.[1]??niceMax;
  const width=440,height=compact?110:186,left=38,right=19,top=20,bottom=compact?24:33;
  const x=(index:number)=>left+(data.length===1?0:index/(data.length-1))*(width-left-right);
  const y=(value:number)=>top+(max-value)/(max-min)*(height-top-bottom);
  const line=data.map((point,index)=>`${index?'L':'M'}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
  const label=metric.label; const suffix=key==='approval'?'%':` ${metric.unit}`;
  const grid=[max,(min+max)/2,min].map(value=>`<g><line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" stroke="#ddd7c9" stroke-dasharray="3 4"/><text x="${left-7}" y="${y(value)+4}" text-anchor="end">${Math.round(value)}</text></g>`).join('');
  const dayTicks=[0,...(data.length>2?[Math.floor((data.length-1)/2)]:[]),...(data.length>1?[data.length-1]:[])].map(i=>`<text x="${x(i)}" y="${height-5}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">Day ${data[i].day}</text>`).join('');
  const zero=min<0?`<line x1="${left}" x2="${width-right}" y1="${y(0)}" y2="${y(0)}" stroke="#baa98a"/>`:'';
  return `<article class="trend-card ${compact?'compact':''}" data-metric="${key}"><div class="trend-heading"><span>${label}</span><span class="trend-change">${delta>0?'+':''}${delta}${key==='approval'?' pp':''} since last day</span></div><div class="trend-value">${last.value}<small>${suffix}</small></div><svg class="trend-plot" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} from day 1 to day ${last.day}. Started at ${data[0].value}, now ${last.value} ${metric.unit}.">${grid}${zero}<path d="${line}" fill="none" stroke="${metric.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${data.map((point,i)=>`<circle tabindex="0" role="img" aria-label="Day ${point.day}: ${point.value} ${metric.unit}" cx="${x(i)}" cy="${y(point.value)}" r="${i===data.length-1?4.5:3}" fill="${metric.color}" stroke="#fbf8ef" stroke-width="2"><title>Day ${point.day}: ${point.value} ${metric.unit}</title></circle>`).join('')}${dayTicks}</svg>${data.length===1?'<p class="chart-empty">Starting position. Your first decision begins the trend.</p>':''}</article>`;
}
export function chartsPanel(world:World) {
  return `${electionMarkup(world)}<p class="chart-explainer">Every point is a recorded day. Hover or focus a point for its value. Approval and relations use fixed scales; other charts scale to their history.</p><div class="trend-grid">${metrics.map(metric=>chartMarkup(world,metric.key)).join('')}</div><details class="chart-data"><summary>View chart data as a table</summary><div class="table-scroll"><table><caption>Daily state, including the starting position</caption><thead><tr><th>Day</th>${metrics.map(m=>`<th>${m.label} (${m.unit})</th>`).join('')}</tr></thead><tbody>${[createWorld().state,...world.events.map(e=>e.after)].map(state=>`<tr><th>${state.day}</th>${metrics.map(m=>`<td>${state[m.key]}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}
