const viewer = document.querySelector('#model');
const plan = document.querySelector('#plan-canvas');
const planImage = document.querySelector('#plan-image');
const errorBox = document.querySelector('#model-error');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const roomButtons = [...document.querySelectorAll('[data-room]')];
const modes = {cutaway: 'assets/cutaway.glb?v=closet-2', full: 'assets/full.glb?v=closet-2'};
let mode = 'cutaway', modelMode = 'cutaway', loaded = false;
let planScale = 1, panX = 0, panY = 0, toastTimer;
const pointers = new Map();
let pinchDistance = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rooms = {
  hall: ['2.75m 0.4m -4.2m', '30deg 42deg 10m'],
  bedroom: ['2.17m 0.4m -6.90m', '35deg 45deg 7.5m'],
  kitchen: ['1.14m 0.4m -1.3m', '35deg 45deg 6.5m'],
  bath: ['3.30m 0.4m -0.85m', '30deg 40deg 5.5m'],
  closet: ['4.96m 0.4m -6.95m', '35deg 35deg 5.5m']
};
function toast(message) {
  const box = document.querySelector('#toast');
  box.textContent = message; box.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
}
function settle() { if (reducedMotion && loaded) viewer.jumpCameraToGoal(); }
function clearRoom() { roomButtons.forEach(b => b.classList.remove('selected')); }
function transformPlan() { planImage.style.transform = `translate(${panX}px,${panY}px) scale(${planScale})`; }
function resetView() {
  clearRoom();
  if (mode === 'plan') { planScale=1; panX=0; panY=0; transformPlan(); return; }
  viewer.cameraTarget='auto auto auto';
  const radius=matchMedia('(max-width:700px)').matches?115:105;
  viewer.cameraOrbit=mode === 'full' ? `30deg 35deg ${radius+5}%` : `30deg 50deg ${radius}%`; settle();
}
function setMode(next, reset=true) {
  if (!['cutaway','full','plan'].includes(next)) next='cutaway';
  mode=next;
  modeButtons.forEach(button => {const active=button.dataset.mode===next;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const isPlan=next==='plan'; viewer.hidden=isPlan; plan.hidden=!isPlan;
  errorBox.hidden=true;
  document.querySelector('#view-label').textContent={cutaway:'01 / ОБЩИЙ ВИД',full:'02 / ПОЛНАЯ ВЫСОТА',plan:'03 / РАЗМЕРНЫЙ ПЛАН'}[next];
  document.querySelector('#scale-note').textContent=isPlan ? 'Размеры в миллиметрах' : 'Размеры в метрах';
  document.querySelector('.desktop-help').textContent=isPlan ? 'Тяните, чтобы перемещать · Колесо — масштаб' : 'Тяните, чтобы вращать · Колесо — масштаб · Shift + тяните — перемещение';
  document.querySelector('.mobile-help').textContent=isPlan ? 'Тяните, чтобы перемещать · Два пальца — масштаб' : 'Один палец — вращать · Два — масштаб и перемещение';
  if (!isPlan && modelMode!==next) {loaded=false;viewer.src=modes[next];modelMode=next;}
  if (reset) resetView();
  const url=new URL(location.href);if(next==='cutaway')url.searchParams.delete('view');else url.searchParams.set('view',next);
  history.replaceState({},'',url);
}
modeButtons.forEach(button => button.addEventListener('click',()=>setMode(button.dataset.mode)));
viewer.addEventListener('load',()=>{loaded=true;errorBox.hidden=true;});
viewer.addEventListener('error',()=>{loaded=false;if(mode!=='plan')errorBox.hidden=false;});
document.querySelector('#retry').addEventListener('click',()=>{errorBox.hidden=true;const src=modes[modelMode];viewer.removeAttribute('src');requestAnimationFrame(()=>viewer.src=src);});
customElements.whenDefined('model-viewer').catch(()=>{errorBox.hidden=false;});
setTimeout(()=>{if(!customElements.get('model-viewer')){document.querySelector('#load-text').textContent='3D-просмотрщик не загрузился';errorBox.hidden=mode==='plan';}},16000);
roomButtons.forEach(button=>button.addEventListener('click',()=>{
  if(mode!=='cutaway')setMode('cutaway');
  clearRoom();button.classList.add('selected');
  const [target,orbit]=rooms[button.dataset.room];viewer.cameraTarget=target;viewer.cameraOrbit=orbit;settle();
}));
function zoom(factor){
  if(mode==='plan'){planScale=Math.min(6,Math.max(.6,planScale*factor));transformPlan();return;}
  if(!loaded)return;
  const orbit=viewer.getCameraOrbit();viewer.cameraOrbit=`${orbit.theta}rad ${orbit.phi}rad ${Math.min(35,Math.max(2,orbit.radius/factor))}m`;settle();
}
document.querySelector('#zoom-in').addEventListener('click',()=>zoom(1.3));
document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1/1.3));
document.querySelector('#reset').addEventListener('click',resetView);
document.querySelector('#top-view').addEventListener('click',()=>{if(mode==='plan'){resetView();return;}clearRoom();viewer.cameraTarget='auto auto auto';viewer.cameraOrbit='0deg 0deg 105%';settle();});
document.querySelector('#fullscreen').addEventListener('click',async()=>{
  const panel=document.querySelector('.viewer-panel');
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(panel.requestFullscreen)await panel.requestFullscreen();else toast('На этом устройстве используйте масштаб страницы');}catch{toast('Полноэкранный режим недоступен');}
});
document.querySelector('#share').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);toast('Ссылка скопирована — можно отправлять');}
  catch{if(navigator.share){try{await navigator.share({title:document.title,url:location.href});}catch{}}else toast('Скопируйте ссылку из адресной строки');}
});
plan.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY<0?1.12:1/1.12);},{passive:false});
plan.addEventListener('pointerdown',event=>{plan.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});pinchDistance=0;plan.classList.add('dragging');});
plan.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  const previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===1){panX+=event.clientX-previous.x;panY+=event.clientY-previous.y;transformPlan();}
  else if(pointers.size===2){const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoom(distance/pinchDistance);pinchDistance=distance;}
});
function release(event){pointers.delete(event.pointerId);pinchDistance=0;if(!pointers.size)plan.classList.remove('dragging');}
plan.addEventListener('pointerup',release);plan.addEventListener('pointercancel',release);
plan.addEventListener('keydown',event=>{if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.3);}else if(event.key==='-'){event.preventDefault();zoom(1/1.3);}else if(event.key==='0'){event.preventDefault();resetView();}});
setMode(new URL(location.href).searchParams.get('view')||'cutaway');
