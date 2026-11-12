import {Engine,Scene,FreeCamera,Vector3,HemisphericLight,DirectionalLight,MeshBuilder,StandardMaterial,Color3,DynamicTexture,Texture,Mesh} from '@babylonjs/core';
import './style.css';
type Dir=0|1|2|3;
type Point={x:number;z:number};
type Save={x:number;z:number;dir:Dir;turn:number;hp:number;food:number;water:number;inventory:string[];doorOpen:boolean;zombie:Point;items:Point[]};
const MAP=['###############','#.............#','#..##D###.....#','#..#....#.....#','#..#....#.....#','#..#....#.....#','#..######.....#','#.............#','#.............#','###############'];
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
const initial=():Save=>({x:5,z:4,dir:0,turn:0,hp:100,food:100,water:100,inventory:[],doorOpen:false,zombie:{x:12,z:7},items:[{x:6,z:4},{x:3,z:7}]});
let state:Save=initial();try{const s=localStorage.getItem('rot-save');if(s)state={...initial(),...JSON.parse(s)}}catch{}
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`<div class="shell"><header><b>ROT</b><span id="clock"></span></header><main class="view"><canvas id="game"></canvas><div class="overlay" id="location"></div><div class="crosshair">+</div><section id="modal" class="modal hidden"></section></main><section class="hud"><span id="health"></span><span id="needs"></span></section><div id="log" class="log" aria-live="polite">You wake to an unnatural silence.</div><nav class="toolbar"><button data-action="interact">USE</button><button data-action="attack">ATTACK</button><button data-action="inventory">PACK</button><button data-action="wait">WAIT</button></nav><nav class="pad" aria-label="Movement"><button data-action="left">↶</button><button class="forward" data-action="forward">↑</button><button data-action="right">↷</button><button data-action="strafeLeft">←</button><button data-action="back">↓</button><button data-action="strafeRight">→</button></nav></div>`;
const el=(id:string)=>document.getElementById(id)!;
const canvas=el('game') as HTMLCanvasElement;
const engine=new Engine(canvas,true,{stencil:false},true);
const scene=new Scene(engine);scene.clearColor=Color3.FromHexString('#66756b').toColor4();
const camera=new FreeCamera('eye',new Vector3(state.x*2,1.55,state.z*2),scene);camera.fov=1.17;camera.minZ=.05;camera.maxZ=90;camera.inputs.clear();scene.activeCamera=camera;
new HemisphericLight('sky',new Vector3(0,1,0),scene).intensity=.85;
new DirectionalLight('sun',new Vector3(-.6,-1,.4),scene).intensity=.65;
function mat(name:string,hex:string){const m=new StandardMaterial(name,scene);const t=new DynamicTexture('pixel-'+name,{width:32,height:32},scene,false);const ctx=t.getContext();const rgb=Color3.FromHexString(hex);let seed=1234;for(let y=0;y<32;y++)for(let x=0;x<32;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const f=.76+(seed%40)/100;ctx.fillStyle='rgb('+Math.floor(rgb.r*255*f)+','+Math.floor(rgb.g*255*f)+','+Math.floor(rgb.b*255*f)+')';ctx.fillRect(x,y,1,1)}t.update();t.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);m.diffuseTexture=t;return m}
const wall=mat('wall','#667065'),floor=mat('floor','#5d5a4c'),grass=mat('grass','#4a6343'),wood=mat('wood','#765b40'),roof=mat('roof','#77776a'),red=mat('enemy','#784a42'),loot=mat('loot','#b0a078');
function box(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial){const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;return mesh}
const decorations:Mesh[]=[];
function clearDynamic(){for(const mesh of decorations)mesh.dispose();decorations.length=0}
function blocked(x:number,z:number){if(x<0||z<0||z>=MAP.length||x>=MAP[0].length)return true;const t=MAP[z][x];return t==='#'||(t==='D'&&!state.doorOpen)}
function draw(){clearDynamic();for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++){const t=MAP[z][x];const indoors=z>=3&&z<=6&&x>=4&&x<=8;decorations.push(box('ground',2,.12,2,x*2,-.12,z*2,indoors?floor:grass));if(t==='#')decorations.push(box('wall',2,2.8,2,x*2,1.4,z*2,wall));if(t==='D'&&!state.doorOpen)decorations.push(box('door',1.65,2.45,.25,x*2,1.23,z*2,wood));if(indoors)decorations.push(box('ceiling',2,.1,2,x*2,2.85,z*2,roof))}for(const item of state.items)decorations.push(box('supply',.55,.45,.55,item.x*2,.25,item.z*2,loot));if(state.zombie.x>=0){const m=box('zombie',.9,1.7,.65,state.zombie.x*2,.85,state.zombie.z*2,red);decorations.push(m)}}
function facing(){const d=dirs[state.dir];return {x:state.x+d[0],z:state.z+d[1]}}
function message(s:string){el('log').textContent=s}
function hud(){el('clock').textContent='DAY 1 · '+String(8+Math.floor(state.turn/60)).padStart(2,'0')+':'+String(state.turn%60).padStart(2,'0');el('health').textContent='HP '+state.hp+'/100';el('needs').textContent='FOOD '+state.food+' · WATER '+state.water;el('location').textContent=['N','E','S','W'][state.dir]+' · '+state.x+','+state.z}
function save(){localStorage.setItem('rot-save',JSON.stringify(state))}
function zombieTurn(){const z=state.zombie;if(z.x<0)return;const distance=Math.abs(z.x-state.x)+Math.abs(z.z-state.z);if(distance===1){state.hp=Math.max(0,state.hp-8);message('The infected strikes you. -8 HP');return}if(distance>7)return;const options=[{x:z.x+Math.sign(state.x-z.x),z:z.z},{x:z.x,z:z.z+Math.sign(state.z-z.z)}].filter(p=>!blocked(p.x,p.z)&&!(p.x===state.x&&p.z===state.z));if(options.length)state.zombie=options[0]}
function advance(cost=1){state.turn+=cost;state.food=Math.max(0,100-Math.floor(state.turn/18));state.water=Math.max(0,100-Math.floor(state.turn/12));for(let i=0;i<cost;i++)zombieTurn();save();hud();draw()}
let busy=false;
function animate(target:Vector3,yaw:number){busy=true;const from=camera.position.clone(),startYaw=camera.rotation.y;let diff=yaw-startYaw;while(diff>Math.PI)diff-=2*Math.PI;while(diff< -Math.PI)diff+=2*Math.PI;const begin=performance.now();function frame(now:number){const t=Math.min(1,(now-begin)/150),ease=t*t*(3-2*t);camera.position=Vector3.Lerp(from,target,ease);camera.rotation.y=startYaw+diff*ease;if(t<1)requestAnimationFrame(frame);else busy=false}requestAnimationFrame(frame)}
function cameraTarget(){return new Vector3(state.x*2,1.55,state.z*2)}
function modal(){const m=el('modal');m.classList.remove('hidden');m.innerHTML='<h2>BACKPACK</h2><p>'+ (state.inventory.join(', ')||'Empty')+'</p><p>Health: '+state.hp+' · Food: '+state.food+' · Water: '+state.water+'</p><button id="close">CLOSE</button><button id="save">SAVE</button><button id="reset">NEW GAME</button>';el('close').onclick=()=>m.classList.add('hidden');el('save').onclick=()=>{save();message('Game saved.');m.classList.add('hidden')};el('reset').onclick=()=>{state=initial();m.classList.add('hidden');draw();hud();animate(cameraTarget(),Math.PI);save()}}
function action(a:string){if(busy||state.hp===0)return;if(a==='inventory'){modal();return}if(!el('modal').classList.contains('hidden'))return;const oldDir=state.dir;
if(a==='left')state.dir=((state.dir+3)%4) as Dir;
else if(a==='right')state.dir=((state.dir+1)%4) as Dir;
else if(['forward','back','strafeLeft','strafeRight'].includes(a)){const index=a==='forward'?state.dir:a==='back'?(state.dir+2)%4:a==='strafeLeft'?(state.dir+3)%4:(state.dir+1)%4;const [dx,dz]=dirs[index];if(blocked(state.x+dx,state.z+dz)){message('Your way is blocked.');return}state.x+=dx;state.z+=dz;message('You move cautiously.');advance()}
else if(a==='interact'){const p=facing();if(MAP[p.z]?.[p.x]==='D'){state.doorOpen=!state.doorOpen;message(state.doorOpen?'You open the door.':'You close the door.');advance()}else{const idx=state.items.findIndex(i=>i.x===p.x&&i.z===p.z||i.x===state.x&&i.z===state.z);if(idx>=0){state.items.splice(idx,1);state.inventory.push('Supplies');message('You collect supplies.');advance()}else message('Nothing to interact with.')}}
else if(a==='attack'){const p=facing();if(p.x===state.zombie.x&&p.z===state.zombie.z){state.zombie={x:-1,z:-1};message('The infected collapses.')}else message('You strike at empty air.');advance()}
else if(a==='wait'){message('You wait and listen.');advance()}
if(state.dir!==oldDir||a==='forward'||a==='back'||a.startsWith('strafe'))animate(cameraTarget(),Math.PI-state.dir*Math.PI/2);hud()}
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action!)));
window.addEventListener('keydown',e=>{if(e.repeat)return;const key:Record<string,string>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',d:'right',q:'strafeLeft',e:'strafeRight',f:'interact',' ':'wait',Tab:'inventory'};if(key[e.key]){e.preventDefault();action(key[e.key])}});
window.addEventListener('resize',()=>engine.resize());new ResizeObserver(()=>engine.resize()).observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
camera.rotation.y=state.dir*Math.PI/2;draw();hud();engine.runRenderLoop(()=>scene.render());
