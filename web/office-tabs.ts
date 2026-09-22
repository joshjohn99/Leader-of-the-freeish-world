/** Add a route here to expose another persistent office tab. */
export const officeTabs:readonly {panel:string;label:string}[]=[
 {panel:'briefing',label:'Your Office'},
 {panel:'press',label:'On the Record'},
 {panel:'secretary',label:'Press Secretary'},
 {panel:'congress',label:'Congress'},
];
export function mountOfficeTabs(host:HTMLElement,navigate:(panel:string)=>void){
 const buttons=officeTabs.map(tab=>{const button=document.createElement('button');button.type='button';button.textContent=tab.label;button.dataset.panel=tab.panel;button.onclick=()=>navigate(tab.panel);host.append(button);return button;});
 return {update(panel:string,enabled:boolean){for(const button of buttons){button.disabled=!enabled&&button.dataset.panel!=='briefing';if(button.dataset.panel===panel)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}};
}
