import * as THREE from 'three';

export function createOffice(host: HTMLElement, onSelect: (object: string) => void) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#cbd3cb');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
  const material = (color: string, roughness = .7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const green = material('#526453'), trim = material('#d8d0b7'), darkwood = material('#423025'), gold = material('#bda16a', .35, .7);
  const cream = material('#eee4cc'), black = material('#252b29', .5), leather = material('#344238', .8);
  function woodTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#785239'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i++) {
      const x = (i * 73) % 256; ctx.strokeStyle = `rgba(40,19,7,${.03 + (i % 5) * .02})`;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 12, 80, x - 8, 190, x + 3, 256); ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; return map;
  }
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: .48 });
  function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x,y,z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, top = r) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top,r,h,32), mat); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); return mesh;
  }
  function sphere(r: number, mat: THREE.Material, x:number,y:number,z:number) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r,24,16),mat); mesh.position.set(x,y,z); mesh.castShadow=true; scene.add(mesh); return mesh;
  }
  function sign(text: string, w: number, h: number, color: string, bg: string) {
    const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=256;
    const ctx=canvas.getContext('2d')!; ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=color;
    ctx.font='48px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map}));
  }
  scene.add(new THREE.HemisphereLight('#edf2dc','#70654f',2.1));
  const sun = new THREE.DirectionalLight('#fff0c4',4); sun.position.set(-3,8,-6); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:30}); sun.shadow.bias=-.0005; scene.add(sun);
  const fill=new THREE.DirectionalLight('#f3e3c8',1.3);fill.position.set(4,4,7);scene.add(fill);
  // Parquet floor and a broad oval rug.
  box(15,.12,13,wood,0,-.1,0);
  for(let x=-7;x<7;x+=.8) for(let z=-5;z<6;z+=2) box(.012,.006,1.98,darkwood,x,.001,z+(Math.round(x*10)%2)*.4);
  const rug=cylinder(4.2,.022,material('#727c68'),0,.025,.2);rug.scale.z=.7;
  const rugInner=cylinder(3.93,.024,material('#a9a68a'),0,.03,.2);rugInner.scale.z=.7;
  const rugCenter=cylinder(3.83,.024,material('#777f6a'),0,.04,.2);rugCenter.scale.z=.7;
  // Back wall is built around actual window openings, so daylight reaches the desk.
  box(15,1.05,.25,green,0,.52,-4.5);box(15,.65,.25,trim,0,4.6,-4.5);
  for(const x of [-7,-4.6,-1.55,1.55,4.6,7]) box(x===-7||x===7?1:.35,3.4,.3,green,x,2.7,-4.5);
  box(15,.13,.4,trim,0,1.12,-4.32);box(15,.16,.5,trim,0,4.22,-4.32);
  box(.25,4.9,10,green,-7.35,2.4,.35);
  box(.15,.15,10,trim,-7.17,.18,.35);box(.2,.22,10,trim,-7.17,4.5,.35);
  // Pane frames, drapery and park outside.
  for(const x of [-3.05,0,3.05]) {
    for(const dx of [-1.35,0,1.35]) box(.065,2.95,.12,cream,x+dx,2.67,-4.42);
    for(const y of [1.23,2.65,4.1]) box(2.76,.07,.13,cream,x,y,-4.4);
    box(3.05,.08,.5,trim,x,1.17,-4.2);
  }
  const curtain=material('#c6b894');
  for(const x of [-4.78,4.78]) {
    cylinder(.34,3.4,curtain,x,2.55,-4.05,.45);
    for(let i=0;i<6;i++) cylinder(.075,3.45,curtain,x-.3+i*.12,2.56,-3.87);
    cylinder(.37,.12,gold,x,2.0,-4.05);
  }
  box(50,.1,30,material('#899b6e'),0,-.17,-19);
  for(let i=0;i<18;i++) { const x=-13+i*1.5,z=-9-(i%3)*2;
    cylinder(.14,2.8,darkwood,x,1.2,z);sphere(1.2+(i%3)*.18,material(i%2?'#6f885e':'#78966c'),x,2.9,z);
  }
  // Executive desk with solid pedestals, inset panels and brass pulls.
  box(5.5,.21,2.45,wood,0,1.65,.25);box(5.65,.085,2.55,darkwood,0,1.53,.25);
  for(const x of [-1.95,1.95]) {
    box(1.25,1.4,2.03,wood,x,.76,.25);box(1.34,.14,2.14,darkwood,x,.1,.25);
    box(1.05,1.09,.04,darkwood,x,.78,1.28);box(.9,.96,.06,wood,x,.78,1.32);
    for(let y=.36;y<1.4;y+=.4){box(1.08,.015,.02,darkwood,x,y,1.36);box(.28,.035,.07,gold,x,y+.13,1.39);}
  }
  box(2.6,.7,.12,wood,0,1.06,.72);
  const deskSeal=cylinder(.3,.035,gold,0,1.1,.81);deskSeal.rotation.x=Math.PI/2;
  const emblem=sign('✦',.42,.16,'#3f422c','#bda16a');emblem.position.set(0,1.1,.84);scene.add(emblem);
  // Green leather writing pad, folded briefing, pen and nameplate.
  box(2.05,.025,1.18,leather,0,1.78,.22);
  const folder=box(.8,.035,1.02,material('#d6bb82'),-.55,1.812,.12); folder.rotation.y=-.12;
  const paper=box(.64,.014,.8,cream,-.53,1.838,.1);paper.rotation.y=-.12;
  const paperText=sign('MORNING BRIEF',.5,.12,'#384d3d','#eee4cc');paperText.rotation.x=-Math.PI/2;paperText.position.set(-.52,1.85,-.1);scene.add(paperText);
  const pen=box(.035,.035,.55,gold,.47,1.82,.23);pen.rotation.y=.32;
  box(1.18,.22,.22,darkwood,0,1.89,1.14);
  const nameplate=sign('THE PRESIDENT',1.1,.17,'#ead396','#423025');nameplate.position.set(0,1.9,1.26);scene.add(nameplate);
  // Desk phone and receiver.
  const phone=new THREE.Group();phone.position.set(1.8,1.81,.42);scene.add(phone);
  box(.57,.09,.76,black,0,0,0,phone);
  box(.62,.10,.17,black,0,.12,-.2,phone);
  box(.14,.12,.27,black,-.26,.08,-.2,phone);box(.14,.12,.27,black,.26,.08,-.2,phone);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(.07,.012,.08,trim,(col-1)*.12,.055,.03+row*.13,phone);
  // Brass green-shaded banker's lamp.
  cylinder(.24,.045,gold,-1.86,1.8,-.35);cylinder(.028,.68,gold,-1.86,2.13,-.35);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.76,32,1,false,0,Math.PI),material('#2d5542',.25));shade.rotation.z=Math.PI/2;shade.position.set(-1.86,2.48,-.3);shade.castShadow=true;scene.add(shade);
  const bulb=new THREE.PointLight('#ffcf7b',1.5,3);bulb.position.set(-1.86,2.3,-.3);scene.add(bulb);
  // Mug.
  cylinder(.12,.22,cream,.93,1.89,-.34);cylinder(.096,.005,material('#302217'),.93,2.006,-.34);
  // Presidential chair behind desk.
  box(1.1,.17,1,leather,0,.99,-1.6);box(1.05,1.4,.22,leather,0,1.7,-2.02);
  for(const x of [-.57,.57]){box(.12,.12,.9,darkwood,x,1.32,-1.6);box(.07,.4,.07,gold,x,1.12,-1.3);}
  cylinder(.08,.7,gold,0,.55,-1.6);box(1,.06,.08,black,0,.19,-1.6);box(.08,.06,1,black,0,.19,-1.6);
  // Side credenza, books and abstract official portrait.
  box(1.25,2.9,2.8,darkwood,-6.65,1.48,-1.9);
  for(const y of [.25,1.05,1.85,2.65])box(1.28,.09,2.85,wood,-6.62,y,-1.9);
  for(let i=0;i<11;i++)for(let shelf=0;shelf<3;shelf++) {
    box(.7,.43+(i%3)*.1,.13,material(['#4a6558','#b09b70','#884e38','#d1c4a1'][i%4]),-6.28,.5+shelf*.8,-3.1+i*.23);
  }
  // Flags flanking the windows, original fictional design.
  for(const x of [-5.25,5.25]) {
    cylinder(.4,.09,darkwood,x,.05,-3.2);cylinder(.032,3.9,gold,x,1.98,-3.2);sphere(.08,gold,x,3.98,-3.2);
    const flag=new THREE.Group();scene.add(flag);
    box(1.05,1.6,.025,material(x<0?'#223e4c':'#eee2c6'),x+.48,3.05,-3.2,flag);
    box(1.05,.28,.029,material('#9c4e3e'),x+.48,2.65,-3.18,flag);
    const star=sign('✦',.5,.28,x<0?'#d6be82':'#315343',x<0?'#223e4c':'#eee2c6');star.position.set(x+.48,3.3,-3.17);flag.add(star);
  }
  // Potted plant.
  cylinder(.36,.62,material('#c0ad8b'),5.5,.31,.2,.45);
  for(let i=0;i<7;i++) {const a=i*2.4;const leaf=sphere(.38,material('#49694b'),5.5+Math.cos(a)*.36,1.05+(i%3)*.23,.2+Math.sin(a)*.3);leaf.scale.set(.5,1.5,.6);leaf.rotation.z=Math.cos(a)*.7;}
  const hotspots=[{object:folder,name:'briefing'},{object:paper,name:'briefing'},{object:phone,name:'phone'}];
  const ray=new THREE.Raycaster(); const pointer=new THREE.Vector2();
  let base=new THREE.Vector3(7.7,5.7,10.1), target=new THREE.Vector3(-.1,1.2,-.5), offsetX=0, offsetY=0;
  const presets={office:[[7.7,5.7,10.1],[-.1,1.2,-.5]],desk:[[3.4,3.7,5],[0,1.6,0]],window:[[1.9,3.4,5.3],[0,2.1,-3.8]]};
  function render(){camera.position.copy(base).add(new THREE.Vector3(offsetX,offsetY,0));camera.lookAt(target);renderer.render(scene,camera);}
  const observer=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();});observer.observe(host);
  let down: {x:number;y:number;ox:number;oy:number}|null=null;
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY,ox:offsetX,oy:offsetY};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!down)return;offsetX=THREE.MathUtils.clamp(down.ox-(event.clientX-down.x)*.012,-3,3);offsetY=THREE.MathUtils.clamp(down.oy+(event.clientY-down.y)*.008,-1,2);render();});
  canvas.addEventListener('pointerup',event=>{
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<6){const bounds=canvas.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);ray.setFromCamera(pointer,camera);
      for(const hit of ray.intersectObjects(hotspots.map(x=>x.object),true)){let current:THREE.Object3D|null=hit.object;while(current){const found=hotspots.find(h=>h.object===current);if(found){onSelect(found.name);current=null;break;}current=current.parent;}break;}}
    down=null;
  });
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector<HTMLElement>('#scene-error')!.hidden=false;});
  return {setView(name:string){const preset=presets[name as keyof typeof presets];if(!preset)return;base.fromArray(preset[0]);target.fromArray(preset[1]);offsetX=offsetY=0;render();}};
}
