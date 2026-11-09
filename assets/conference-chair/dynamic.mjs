import {wingDirect} from './wing.mjs';
import {shakerPositions} from './kitchen-shakers.mjs';
// Exact native construction loops for components whose count varies continuously.
export function buildDynamic(THREE,kind,p,templates,group,deformNormals){
 if(kind!=='scroll-sofa-nails')throw new Error(`Unknown dynamic construction ${kind}`);
 const template=templates.get('nail1')?.object;if(!template)throw new Error('Missing nail template');
 let count=0;const r=p.nail_size/.0045;
 function nail(location,forward){
  const g=template.geometry.clone(),pos=g.attributes.position,before=pos.array.slice();
  for(let i=0;i<pos.count;i++){const x=before[i*3],y=before[i*3+1],z=before[i*3+2],tip=Math.hypot(x,y)<.00011;pos.setXYZ(i,x*(tip?1:r),y*(tip?1:r),z*r);}
  deformNormals(THREE,g,before);pos.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
  const material=Array.isArray(template.material)?template.material.map(m=>m.clone()):template.material.clone();
  const o=new THREE.Mesh(g,material);o.name=`nail${++count}`;o.position.fromArray(location);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...forward));o.castShadow=o.receiveShadow=true;group.add(o);
 }
 const W=p.width,D=p.depth,S=p.seat_height,R=p.arm_roll_radius,L=p.leg_height;
 const baseFront=-(D/2-.025),baseBack=D/2-.025,armFront=baseFront+.01,armBack=baseBack-.03,rollZ=S-.025+R*.25,armCX=W/2-.19/2;
 for(let x=-(W/2-.19-.06);x<=W/2-.19-.06+1e-6;x+=.031)nail([x,baseFront-.004,L+.045],[0,-1,0]);
 for(const side of [-1,1]){
  const cx=side*armCX,panelZ=rollZ-R*.28,mid=R*1.18+.015;
  for(let step=0;step<11;step++){const a=(-60+step*12)*Math.PI/180;nail([cx+mid*Math.sin(a)*.78,armFront-.029,panelZ-mid*Math.cos(a)],[0,-1,0]);}
  for(const px of [-1,1])for(let z=L+.03;z<=panelZ+.005-.008;z+=.034)nail([cx+px*(.19/2-.0225),armFront-.027,z],[0,-1,0]);
  for(let y=armFront+.06;y<=armBack-.08;y+=.034)nail([side*(W/2+.003),y,rollZ-R*.55],[side,0,0]);
 }
 return count;
}

// Original 0158 ring_data formula. The rare inner-height clamp must execute
// directly; a sampled response cannot learn a branch absent from training data.
export function directPositions(kind,p,state,basePositions){
 if(kind==='bench-socket-floor')return new Float32Array([0,0,0]);
 if(kind==='bench-socket-top')return new Float32Array([0,0,p.seat_height-.003]);
 if(kind==='corner-table-socket-floor')return new Float32Array([0,0,0]);
 if(kind==='corner-table-socket-top')return new Float32Array([0,p.radius/2-4*p.radius/(3*Math.PI),p.height]);
 if(typeof kind==='string'&&kind.startsWith('folding-chair-socket-'))return new Float32Array(kind.endsWith('floor')?[0,0,foldingChairLift(p,state)]:[0,.112,p.back_height+foldingChairLift(p,state)]);
 if(typeof kind==='string'&&kind.startsWith('playdesk-bin-'))return playDeskBin(Number(kind.slice(-1)),p,state,basePositions);
 if(typeof kind==='string'&&kind.startsWith('iron-frame-'))return ironFrame(kind,p,basePositions);
 if(typeof kind==='string'&&kind.startsWith('iron-slat-')){
  const a=new Float32Array(basePositions),dx=(p.width-.97)/2-(p.tube_radius-.019);
  for(let i=0;i<a.length;i+=3){a[i]+=Math.sign(a[i])*dx;a[i+2]+=p.frame_height-.34;}return a;
 }
 if(kind==='iron-bedspread')return ironBedspread(p);
 if(typeof kind==='string'&&kind.startsWith('iron-spindle-')){
  const [, ,end,indexText]=kind.split('-'),index=Number(indexText),x=(index-(p.spindle_count-1)/2)*Math.min(.12,(p.width-2*p.tube_radius-.16)/p.spindle_count),start=p.frame_height-.004,top=end==='head'?p.frame_height+(p.head_height-p.tube_radius-p.frame_height)*.84+.004:p.foot_height-p.tube_radius-.002;
  const oldStart=.336,oldTop=end==='head'?.34+(1.24-.019-.34)*.84+.004:.85-.019-.002;
  let lo=Infinity,hi=-Infinity;for(let i=0;i<basePositions.length;i+=3){lo=Math.min(lo,basePositions[i]);hi=Math.max(hi,basePositions[i]);}const out=new Float32Array(basePositions);
  for(let i=0;i<out.length;i+=3){out[i]+=x-(lo+hi)/2;out[i+1]+=(p.length/2-p.tube_radius-(2.03/2-.019))*(end==='head'?1:-1);out[i+2]+=out[i+2]<(oldStart+oldTop)/2?start-oldStart:top-oldTop;}return out;
 }
 if(typeof kind==='object'&&kind.kind==='one-wall-shaker')return shakerPositions(kind,p,state,basePositions);
 if(kind==='cabriole-socket-floor')return new Float32Array([0,0,0]);
 if(kind==='cabriole-socket-top')return new Float32Array([0,0,p.height]);
 if(typeof kind==='string'&&kind.startsWith('one-wall-kitchen-socket-')){
  const label=kind.slice('one-wall-kitchen-socket-'.length),back=p.depth/2;
  const points={floor:[0,0,0],top:[0,0,p.counter_height],mount:[0,back+.025,1.50],water:[-.375*p.width+.021*p.width/2.60,back+.010,.57],power:[p.width/8,back+.010,.42]};
  return new Float32Array(points[label]);
 }
 if(kind==='one-wall-kitchen-counter'){
  const corners=q=>{const w=q.width+.036,d=q.depth+.046,sx=-q.width*.375+.021*q.width/2.6,sy=-.05*q.depth/.61,hw=.561*q.width/2.6,hd=.380*q.depth/.61;return[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[sx-hw/2,sy-hd/2],[sx+hw/2,sy-hd/2],[sx+hw/2,sy+hd/2],[sx-hw/2,sy+hd/2]];};
  const before=corners({width:2.6,depth:.61}),after=corners(p),out=new Float32Array(basePositions);
  for(let i=0;i<out.length;i+=3){let best=0,distance=Infinity;for(let j=0;j<8;j++){const d=(out[i]-before[j][0])**2+(out[i+1]-before[j][1])**2;if(d<distance){distance=d;best=j;}}out[i]+=after[best][0]-before[best][0];out[i+1]+=after[best][1]-before[best][1];out[i+2]+=p.counter_height-.93-(out[i+2]<.915?p.worktop_thickness-.03:0);}return out;
 }
 if(kind==='kitchen-fixed-corner-counter'){
  const out=new Float32Array(basePositions);for(let i=0;i<out.length;i+=3){out[i]+=(out[i]<.0105?-.5:.5)*(p.width-3.2);out[i+1]+=.585*(p.depth-2);out[i+2]+=p.cab_h-.85;}return out;
 }
 if(typeof kind==='string'&&kind.startsWith('corner-desk-socket-')){const label=kind.slice('corner-desk-socket-'.length),w=p.main_length,L=p.return_length,C=p.return_depth,H=p.desktop_height,R=p.return_height;
  if(label==='floor')return new Float32Array([0,0,0]);if(label==='top')return new Float32Array([0,L/2-p.main_depth/2,H]);if(label==='return')return new Float32Array([-w/2+C/2,-L*.24,R]);if(label==='mount')return new Float32Array([-w/2+.037,L/2-.050,H-.024]);
  const i=Number(label.slice(-1)),step=(R-.024)/3,front=step-.003;return new Float32Array([-w/2+C-.018+.043+(state==='open'?p.drawer_extension*[1,.82,.64][i-1]:0),-L/2+L*p.drawer_bay_ratio/2,.003+(i-.5)*step+front*.40]);
 }

 if(typeof kind==='string'&&kind.startsWith('reading-power-')){const sign=kind.endsWith('0')?-1:1,result=new Float32Array(basePositions);for(let i=0;i<result.length;i+=3){result[i]+=sign*(p.length-1.86)*.25;result[i+2]+=p.height-.745;}return result;}

 if(typeof kind==='string'&&kind.startsWith('standing-socket-')){
  const height=p.low_height+{low:0,mid:.5,high:1}[state]*p.lift_travel;
  if(kind==='standing-socket-floor')return new Float32Array([0,0,0]);
  if(kind==='standing-socket-top')return new Float32Array([0,0,height]);
  if(kind==='standing-socket-mount')return new Float32Array([0,0,height-p.top_thickness]);
  return new Float32Array([p.width/2-.147,-p.depth/2-.009-.002*Math.sin(79*Math.PI/180),height-p.top_thickness-.018+.002*Math.cos(79*Math.PI/180)]);
 }
 if(kind==='standing-desk-worktop'){
  const fraction={low:0,mid:.5,high:1}[state],oldTop=.735+fraction*.44;
  const deltaHeight=p.low_height+fraction*p.lift_travel-oldTop,result=new Float32Array(basePositions);
  for(let i=0;i<result.length;i+=3){
   result[i]+=Math.sign(basePositions[i])*(p.width-1.6)/2;
   result[i+1]+=Math.sign(basePositions[i+1])*(p.depth-.75)/2;
   result[i+2]+=deltaHeight-(basePositions[i+2]<oldTop-.0125?p.top_thickness-.025:0);
  }
  return result;
 }
 if(typeof kind==='object'&&kind.kind.startsWith('wing-'))return wingDirect(kind,p,basePositions);
 if(typeof kind==='string'&&kind.startsWith('tatami-'))return tatamiSheet(kind,p);
 if(kind==='bar-chair-top-socket')return new Float32Array([0,0,p.height]);
 if(kind==='bar-chair-seat-socket')return new Float32Array([0,0,Math.min(p.seat_z,p.height-Math.min(p.back_height,p.height*.22)-.095)]);
 if(typeof kind==='object'&&kind.kind==='bar-chair-back-surface')return barChairBack(kind,p);
 if(typeof kind==='object'&&kind.kind==='wardrobe-text'){
  const h=p.height/1.9,x=(kind.pixelX-19)/480-.5,result=new Float32Array(basePositions.length);
  for(let i=0;i<result.length;i+=3){result[i]=(basePositions[i]-x*1.84)*h+x*p.width;result[i+1]=basePositions[i+1]+(.5-p.depth)/2;result[i+2]=(basePositions[i+2]-kind.zOffset)*h+kind.zOffset;}
  return result;
 }
 if(typeof kind==='string'&&kind.startsWith('drafting-chair-upright-'))return draftingChairUpright(kind.endsWith('left')?-1:1,p);
 if(typeof kind==='string'&&kind.startsWith('wardrobe-aperture-'))return wardrobeAperture(kind.slice(18),p);
 if(typeof kind==='string'&&kind.startsWith('dining-chair-seam-'))return diningChairSeam(kind.endsWith('left')?-1:1,p,basePositions);
 if(kind==='dining-chair-back')return diningChairBack(p);
 if(kind.startsWith('toy-bin-'))return toyBin(kind.slice(8),p,state);
 if(kind.startsWith('lazy-susan-ribbon-'))return lazySusanRibbon(Number(kind.slice(-1)),p);
 if(kind!=='floating-nightstand-halo')throw new Error(`Unknown direct geometry ${kind}`);
 const wall=p.wall_thickness,innerHW=p.width/2-wall,innerTop=p.height-wall,innerH=p.height-2*wall;
 const radius=Math.max(Math.min(p.corner_radius,.5*Math.min(p.width,p.height)-.005),wall+.004),innerR=Math.max(radius-wall,.004);
 const split=wall+p.drawer_fraction*innerH,cz=(split+innerTop)/2,hw=innerHW-.022,hh=(innerTop-split)/2-.022;
 const top=Math.min(Math.max(innerR-.022,.010),.85*hh,.85*hw),bottom=Math.min(.6*top+.006,.85*hh),y=p.depth/2-p.back_thickness-.004,vertices=[];
 function loop(w,h,radii){
  const centres=[[w-radii[0],cz+h-radii[0]],[-w+radii[1],cz+h-radii[1]],[-w+radii[2],cz-h+radii[2]],[w-radii[3],cz-h+radii[3]]];
  for(let i=0;i<4;i++)for(let j=0;j<=32;j++){const a=i*Math.PI/2+j*Math.PI/64;vertices.push(centres[i][0]+radii[i]*Math.cos(a),y,centres[i][1]+radii[i]*Math.sin(a));}
 }
 const radii=[top,top,bottom,bottom];loop(hw+.008,hh+.008,radii.map(r=>r+.008));loop(Math.max(hw-.006,.01),Math.max(hh-.006,.01),radii.map(r=>Math.max(r-.006,.004)));
 return new Float32Array(vertices);
}

function lazySusanRibbon(index,p){
 const angle=-Math.PI/2+(index-1)*2*Math.PI/3,nx=Math.cos(angle),ny=Math.sin(angle),tx=-ny,ty=nx;
 const outerRx=p.pedestal_width/2,offset=outerRx*2/3,low=.060,high=p.height-p.stone_thickness-.004,width=p.ribbon_width;
 const rx=outerRx-width/2,rz=(high-low)/2-width/2,cz=(low+high)/2,section=[],b=.0027;
 const corners=[[width/2-b,.048/2-b,0],[-width/2+b,.048/2-b,Math.PI/2],[-width/2+b,-.048/2+b,Math.PI],[width/2-b,-.048/2+b,3*Math.PI/2]];
 for(const [x,y,start]of corners)for(let j=0;j<4;j++){const a=start+Math.PI/2*j/3;section.push([x+b*Math.cos(a),y+b*Math.sin(a)]);}
 const vertices=[];
 for(let i=0;i<192;i++){
  const a=2*Math.PI*i/192,c=Math.cos(a),s=Math.sin(a),radialLength=Math.hypot(c/rx,s/rz),radialT=c/rx/radialLength,radialZ=s/rz/radialLength;
  for(const [u,v]of section)vertices.push(nx*(offset+v)+tx*(rx*c+radialT*u),ny*(offset+v)+ty*(rx*c+radialT*u),cz+rz*s+radialZ*u);
 }
 return new Float32Array(vertices);
}

// 0275: native hollow tub rings, rolled grip, draft and exact bounded nose drop.
// Vertex ordering follows _tub / _rounded_rectangle in the retained native source.
function toyBin(label,p,state){
 const [row,column]=label.split('-'),col=['left','centre','right'].indexOf(column);
 const t=p.panel_thickness,bay=(p.width-4*t)/3,pitch=(p.height-2*t)*.465;
 const h=Math.min(p.bin_height,pitch-.024),nominalD=p.depth-.036,lipW=bay-.004,bodyW=lipW-.044;
 const recess=Math.min(.014,nominalD*.0461),bodyD=nominalD-recess,cy=recess/2,r=p.corner_radius,wall=p.wall_thickness;
 const bottomW=bodyW-.017,bottomD=bodyD-.016,bottomR=r+.004,lipD=nominalD+.020,lipCy=-.004,lipR=r*.95,drop=Math.min(.003,h*.0223);
 const x=-p.width/2+t+bay/2+col*(bay+t),z=t+.010+(row==='upper'?pitch:0),extensions={lower:[.74,1,.65],upper:[1,.56,.78]};
 const y=-.007-(state==='open'?nominalD*p.slide_fraction*extensions[row][col]:0),vertices=[];
 function ring(w,d,radius,zz,center=cy,frontDrop=0){
  radius=Math.min(radius,w*.22,d*.22);
  const corners=[[w/2-radius,d/2-radius,0],[-w/2+radius,d/2-radius,Math.PI/2],[-w/2+radius,-d/2+radius,Math.PI],[w/2-radius,-d/2+radius,3*Math.PI/2]];
  function add(xx,yy){let blend=Math.max(0,Math.min(1,1-(yy+d/2)/Math.min(.018,d*.08)));blend=blend*blend*(3-2*blend);vertices.push(x+xx,y+center+yy,z+zz-frontDrop*blend);}
  for(let k=0;k<4;k++){
   const [cx,yy,start]=corners[k];
   for(let j=0;j<=10;j++){const a=start+j*Math.PI/20;add(cx+radius*Math.cos(a),yy+radius*Math.sin(a));}
   if(k===1||k===3){const [nx,ny,na]=corners[(k+1)%4],a=start+Math.PI/2,x0=cx+radius*Math.cos(a),y0=yy+radius*Math.sin(a),x1=nx+radius*Math.cos(na),y1=ny+radius*Math.sin(na);for(const q of [.18,.38,.62,.82])add(x0+(x1-x0)*q,y0+(y1-y0)*q);}
  }
 }
 for(const deg of [-90,-75,-60,-45,-30,-15,0]){const a=deg*Math.PI/180,reach=.009*Math.cos(a);ring(bottomW-.018+2*reach,bottomD-.018+2*reach,bottomR-.009+reach,.009+.009*Math.sin(a));}
 ring(bodyW-.002,bodyD-.002,r,h-.019);ring(bodyW,bodyD,r,h-.009);
 function flange(f,offset=0){ring(bodyW+(lipW-.005-bodyW)*f,bodyD+(lipD-.005-bodyD)*f,r+(lipR-.0025-r)*f,h+offset,cy+(lipCy-cy)*f,drop*f);}
 ring(bodyW+.001,bodyD+.001,r+.0005,h-.0085);flange(.84,-.009);
 for(const [delta,dz]of [[-.004,-.0117],[-.0015,-.0105],[.001,-.008],[.0015,-.0045],[.0007,-.001],[-.001,.0015],[-.004,.0028]])ring(lipW+delta,lipD+delta,lipR+delta/2,h+dz,lipCy,drop);
 flange(.85,.0023);flange(.12,.0003);
 ring(bodyW+.0005,bodyD+.0005,r+.00025,h);
 for(const [factor,dz]of [[.8,-.0007],[1.7,-.0022],[2,-.004]])ring(bodyW-wall*factor,bodyD-wall*factor,r-wall*factor/2,h+dz);
 ring(bodyW-.002-wall*2,bodyD-.002-wall*2,r-wall,h-.019);
 const iw=bottomW-2*wall,id=bottomD-2*wall;
 ring(iw,id,bottomR-wall,wall+.008);
 for(const deg of [0,-15,-30,-45,-60,-75,-90]){const a=deg*Math.PI/180,reach=.006*Math.cos(a);ring(iw-.012+2*reach,id-.012+2*reach,bottomR-wall-.006+reach,wall+.006+.006*Math.sin(a));}
 return new Float32Array(vertices);
}

// 0194: exact rounded panel grids bent into the native padded horseshoe.
function diningChairBack(p){
 const half=[.46,.175,p.shell_thickness/2],radius=Math.min(.0215,half[2]*.88),vertices=[],shared=new Set();
 function axis(h,steps){const core=h-radius,a=[];for(let i=0;i<=steps;i++)a.push(-core+2*core*i/steps);for(const side of [-1,1])for(let j=1;j<=6;j++)a.push(side*(core+radius*j/6));return [...new Set(a.map(v=>Math.round(v*1e10)/1e10))].sort((a,b)=>a-b);}
 const axes=[axis(half[0],84),axis(half[1],24),axis(half[2],2)],offsetY=chairFootprintY(p);
 function point(q){
  // The rounded axis endpoint and the fixed face extent differ by < 0.1 nm.
  // Snap these boundary identities before hashing, so decimal half-ties cannot
  // create duplicate seam vertices and shift every subsequent vertex index.
  const key=q.map((v,i)=>Math.round((Math.abs(Math.abs(v)-half[i])<1e-9?Math.sign(v)*half[i]:v)*1e9)).join(',');if(shared.has(key))return;shared.add(key);
  const core=q.map((v,i)=>Math.max(-half[i]+radius,Math.min(half[i]-radius,v))),delta=q.map((v,i)=>v-core[i]),len=Math.hypot(...delta),rounded=q.map((v,i)=>core[i]+(len?delta[i]/len*radius:0));
  const pt=chairPanelPoint(p,rounded[0]/half[0],(rounded[1]/half[1]+1)/2,rounded[2]);vertices.push(pt[0],pt[1]-offsetY,pt[2]);
 }
 for(let fixed=0;fixed<3;fixed++){const[a,b]=[0,1,2].filter(i=>i!==fixed);for(const sign of [-1,1])for(const av of axes[a])for(const bv of axes[b]){const q=[0,0,0];q[fixed]=sign*half[fixed];q[a]=av;q[b]=bv;point(q);}}
 return new Float32Array(vertices);
}
function chairFootprintY(p){
 let low=Infinity,high=-Infinity;
 for(const side of [-1,1])for(const rear of [false,true]){
  const fy=-.039+p.seat_depth*(rear?.355:-.315)+p.leg_splay*(rear?2.17:-1.07),dx=-side*p.leg_splay*(rear?1.49:1),dy=p.leg_splay*(rear?-2.17:1.07),dz=p.seat_height-p.seat_thickness*.72,length=Math.hypot(dx,dy,dz),z=[dx/length,dy/length,dz/length],xy=Math.hypot(z[0],z[1]),x=[-z[1]/xy,z[0]/xy,0],y=[-z[2]*x[1],z[2]*x[0],z[0]*x[1]-z[1]*x[0]];
  for(let j=0;j<40;j++){const a=2*Math.PI*j/40,co=Math.cos(a),si=Math.sin(a),xx=.0094*Math.sign(co)*Math.abs(co)**(2/2.45),yy=.0094*.94*Math.sign(si)*Math.abs(si)**(2/2.45),zz=-(x[2]*xx+y[2]*yy)/z[2],worldY=fy+x[1]*xx+y[1]*yy+z[1]*zz;low=Math.min(low,worldY);high=Math.max(high,worldY);}
 }
 return (low+high)/2;
}

function chairPanelPoint(p,s,v,offset){
 s=Math.max(-1,Math.min(1,s));v=Math.max(0,Math.min(1,v));
  const u=Math.max(0,(Math.abs(s)-.855)/.145),w=Math.max(0,(v-.80)/.20);
  if(u>0&&w>0){s=Math.sign(s)*(.855+.145*u*Math.sqrt(Math.max(0,1-w*w/2)));v=.8+.2*w*Math.sqrt(Math.max(0,1-u*u/2));}
  const pad=.0045*Math.max(0,Math.sin(Math.PI*v))**1.3,depth=offset*(1+pad/(p.shell_thickness/2));
  const theta=s*p.back_wrap,rx=p.seat_width*(.504+.049*v),ry=p.seat_depth*(.437+.083*v),cy=-.022+.048*v;
  const lower=p.seat_height-p.seat_thickness*.66+.010*(.5+.5*Math.cos(theta))+.077*Math.exp(-(((theta-.805)/.205)**2)),t=(s+.10)/(s<-.10?.90:1.10),top=p.height-.185*Math.abs(t)**(t<0?3.20:1.80);
  const normal=[Math.sin(theta)/rx,Math.cos(theta)/ry,-.13],n=Math.hypot(...normal);
  return [rx*Math.sin(theta)+depth*normal[0]/n,cy+ry*Math.cos(theta)+depth*normal[1]/n,lower*(1-v)+top*v+depth*normal[2]/n];
}

// Exact native seam centreline with transported baseline tube rings. Blender's
// discretized circular frame may twist differently; independent full vertex-set
// comparisons bound this finite-ring approximation (radius is only 0.55 mm).
function diningChairSeam(side,p,base){
 const defaults={height:.852,seat_height:.505,seat_width:.510,seat_depth:.425,shell_thickness:.048,seat_thickness:.058,leg_splay:.059,back_wrap:1.94};
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
 function points(params){const shift=chairFootprintY(params);return Array.from({length:66},(_,i)=>{const q=chairPanelPoint(params,side*.970,.055+.89*i/65,params.shell_thickness/2+.00015);q[1]-=shift;return q;});}
 const a=points(defaults),b=points(p),ta=a.map((q,i)=>unit(sub(a[Math.min(i+1,65)],a[Math.max(i-1,0)]))),tb=b.map((q,i)=>unit(sub(b[Math.min(i+1,65)],b[Math.max(i-1,0)]))),out=new Float32Array(base.length);
 for(let i=0;i<base.length;i+=3){const v=Array.from(base.subarray(i,i+3));let index=0,distance=Infinity;for(let j=0;j<66;j++){const d=Math.hypot(...sub(v,a[j]));if(d<distance){distance=d;index=j;}}
  const q=sub(v,a[index]),c=cross(ta[index],tb[index]),den=1+ta[index].reduce((s,x,j)=>s+x*tb[index][j],0),cq=cross(c,q),ccq=cross(c,cq);
  for(let j=0;j<3;j++)out[i+j]=b[index][j]+q[j]+cq[j]+ccq[j]/den;
 }
 return out;
}

// 0164: ray/capsule intersections, rectangular outer corners, deep reveals.
function wardrobeAperture(label,p){
 const [which,part]=label.split('-'),[py0,py1,cellTop,cellBottom]={upper:[38,179,24,187],middle:[194,291,187,300],round:[307,363,300,378]}[which];
 const X=v=>(v-19)/480*p.width-p.width/2,Z=v=>(506-v)/498*p.height;
 const x0=X(209)+.0023/2,x1=X(284)-.0023/2,z0=Z(cellBottom),z1=Z(cellTop),cx=X(247),zc=(Z(py0)+Z(py1))/2,width=56*p.width/480,height=Z(py0)-Z(py1),radius=width/2,stem=(height-width)/2;
 const front=-p.depth/2-.003,rear=front+Math.min(.29,p.depth*.62),tau=2*Math.PI,angles=Array.from({length:96},(_,i)=>i*tau/96);
 for(const[x,z]of [[x0,z0],[x1,z0],[x1,z1],[x0,z1]])angles.push((Math.atan2(z-zc,x-cx)%tau+tau)%tau);
 const sorted=[...new Set(angles.map(a=>Math.round(a*1e10)/1e10))].sort((a,b)=>a-b),inner=[],outer=[];
 for(const angle of sorted){const dx=Math.cos(angle),dz=Math.sin(angle),c=stem*(dz>=0?1:-1),distance=Math.abs(dx)>1e-9&&Math.abs(radius*dz/dx)<=stem?radius/Math.abs(dx):c*dz+Math.sqrt(Math.max(0,radius*radius-c*c*dx*dx));inner.push([cx+dx*distance,zc+dz*distance]);
  const tx=Math.abs(dx)>1e-9?(dx>0?x1-cx:x0-cx)/dx:1e9,tz=Math.abs(dz)>1e-9?(dz>0?z1-zc:z0-zc)/dz:1e9,t=Math.min(tx,tz);outer.push([cx+dx*t,zc+dz*t]);
 }
 const out=[];if(part==='back'){for(const y of [rear,rear+.012])for(const[x,z]of inner)out.push(x,y,z);}
 else{for(const ring of [outer,inner])for(const[x,z]of ring)out.push(x,front,z);for(const y of [front+.0016,rear])for(const[x,z]of inner)out.push(cx+(x-cx)*.986,y,zc+(z-zc)*.997);}
 return new Float32Array(out);
}

// 0178 native swept mounting tube, including its tangent-frame branch.
function draftingChairUpright(sign,p){
 const x=sign*.063*p.seat_width/.535,h=p.seat_height,points=[[x,.115,h-.052],[x,.202,h-.020],[x,p.seat_depth*.44-.011,h+.047]],out=[];
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
 for(let i=0;i<3;i++){const t=norm(sub(points[Math.min(i+1,2)],points[Math.max(i-1,0)]));let c=cross(t,[0,0,1]);if(Math.hypot(...c)<.01)c=cross(t,[0,1,0]);c=norm(c);const n=norm(cross(t,c));for(let j=0;j<8;j++){const a=j*2*Math.PI/8;out.push(...points[i].map((v,k)=>v+.011*(Math.cos(a)*c[k]+Math.sin(a)*n[k])));}}
 return new Float32Array(out);
}

// 0134: the native unthickened control sheet plus transported, fixed-metre
// solidify/bevel offsets. This bounded approximation is surface-verified.
function barChairBack(def,p){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
 function sheetNormals(vertices){const normals=vertices.map(()=>[0,0,0]);for(let row=0;row<16;row++)for(let col=0;col<80;col++){const a=row*81+col,ids=[a,a+1,a+82,a+81],points=ids.map(i=>vertices[i]);let normal=[0,0,0];for(let i=0;i<4;i++){const q=points[i],n=points[(i+1)%4];normal[0]+=(q[1]-n[1])*(q[2]+n[2]);normal[1]+=(q[2]-n[2])*(q[0]+n[0]);normal[2]+=(q[0]-n[0])*(q[1]+n[1]);}normal=unit(normal);for(let i=0;i<4;i++){const u=unit(sub(points[(i+3)%4],points[i])),v=unit(sub(points[(i+1)%4],points[i])),angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));for(let j=0;j<3;j++)normals[ids[i]][j]+=normal[j]*angle;}}return normals.map(unit);}
 const h=p.height,w=p.seat_width,d=Math.max(p.seat_depth,.38),bh=Math.min(p.back_height,h*.22),vertices=[];
 for(let row=0;row<=16;row++)for(let col=0;col<=80;col++){const u=2*col/80-1,v=row/16,wing=Math.max(0,(Math.abs(u)-.72)/.28)**1.35,top=h-.115*(h/1.10)*wing,bottom=h-bh-.038*wing,topDepth=d*(.49+.05*(1-Math.min(Math.abs(u)/.72,1)**2)-.30*wing),y=topDepth-d*.08*(1-v)*(1-wing)-.004*Math.sin(Math.PI*v)*(1-u*u);vertices.push([u*w*.485,y,bottom+(top-bottom)*v].map(Math.fround));}
 const baseline=def._calculatedNormals??(def._calculatedNormals=sheetNormals(def.rawPositions)),calculated=sheetNormals(vertices),normals=def.normals.map((v,i)=>{const a=baseline[i],b=calculated[i],axis=cross(a,b),c=dot(a,b),x=cross(axis,v),y=cross(axis,x);return unit(v.map((t,j)=>t+x[j]+y[j]/(1+c)));}),out=new Float32Array((def.nodeBindings.length+(def.refinementEdges?.length??0))*3);
 def.nodeBindings.forEach(([i,offset],index)=>{const row=Math.floor(i/81),col=i%81,z=normals[i];let x=sub(vertices[row*81+Math.min(80,col+1)],vertices[row*81+Math.max(0,col-1)]);x=unit(x.map((v,j)=>v-z[j]*dot(x,z)));const y=cross(z,x);for(let j=0;j<3;j++)out[3*index+j]=vertices[i][j]+x[j]*offset[0]+y[j]*offset[1]+z[j]*offset[2];});
 for(const[index,[a,b]]of(def.refinementEdges??[]).entries())for(let j=0;j<3;j++)out[(def.nodeBindings.length+index)*3+j]=(out[a*3+j]+out[b*3+j])/2;
 let useReference=false;
 if(def.bevelTopology){
  const solid=[...vertices.map((v,i)=>v.map((x,j)=>Math.fround(x+.009*normals[i][j]))),...vertices.map((v,i)=>v.map((x,j)=>Math.fround(x-.009*normals[i][j])))];
  const faceNormals=def.bevelTopology.faces.map(ids=>{const n=[0,0,0];for(let i=0;i<ids.length;i++){const a=solid[ids[i]],b=solid[ids[(i+1)%ids.length]];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}return unit(n);});
  useReference=def.bevelTopology.edgeFaces.every((faces,i)=>(faces.length===2&&dot(faceNormals[faces[0]],faceNormals[faces[1]])<Math.cos(Math.PI/6))===Boolean(def.bevelTopology.defaultSelection[i]));
 }
 def._usesDefaultBevel=useReference;
 const corrections=useReference&&def.referenceCorrectiveValues?def.referenceCorrectiveValues:def.correctiveValues;
 if(corrections){
  const entries=Object.entries(def.correctionAxes),cells=entries.map(([key,axis])=>{const value=key==='seat_depth'?Math.max(p[key],.38):p[key];let index=0;while(index<axis.length-2&&value>axis[index+1])index++;return[index,Math.max(0,Math.min(1,(value-axis[index])/(axis[index+1]-axis[index])))];});
  for(let corner=0;corner<16;corner++){let index=0,weight=1;for(let dimension=0;dimension<4;dimension++){const upper=(corner>>dimension)&1;index=index*entries[dimension][1].length+cells[dimension][0]+upper;weight*=upper?cells[dimension][1]:1-cells[dimension][1];}if(weight<1e-14)continue;const offset=index*out.length;for(let j=0;j<out.length;j++)out[j]+=weight*corrections[offset+j];}
 }
 return out;
}

// 0152: authored pad relief and arc-length-resampled falling throw, with native
// angle-weighted sheet normals and Blender SIMPLE solidify's two offset layers.
function solidifySheet(points,columns,rows,thickness,offset,even=false){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
 const normals=points.map(()=>[0,0,0]),adjacent=even?points.map(()=>[]):null;
 for(let row=0;row<rows-1;row++)for(let col=0;col<columns-1;col++){
  const a=row*columns+col,ids=[a,a+1,a+columns+1,a+columns],vs=ids.map(i=>points[i]);let n=[0,0,0];
  for(let i=0;i<4;i++){const p=vs[i],q=vs[(i+1)%4];n[0]+=(p[1]-q[1])*(p[2]+q[2]);n[1]+=(p[2]-q[2])*(p[0]+q[0]);n[2]+=(p[0]-q[0])*(p[1]+q[1]);}n=unit(n);
  for(let i=0;i<4;i++){const u=unit(sub(vs[(i+3)%4],vs[i])),v=unit(sub(vs[(i+1)%4],vs[i])),angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));for(let j=0;j<3;j++)normals[ids[i]][j]+=n[j]*angle;if(even)adjacent[ids[i]].push({normal:n,angle:Math.max(Math.PI-angle,1.192092896e-7)});}
 }
 normals.forEach((n,i)=>normals[i]=unit(n));const out=new Float32Array(points.length*6);
 const factors=even?adjacent.map((faces,i)=>faces.reduce((v,f)=>v+f.angle/Math.max(Math.abs(dot(normals[i],f.normal)),1e-4),0)/faces.reduce((v,f)=>v+f.angle,0)):points.map(()=>1);
 for(let layer=0;layer<2;layer++){const distance=thickness*(offset+(layer===0?1:-1))/2;for(let i=0;i<points.length;i++)for(let j=0;j<3;j++)out[3*(layer*points.length+i)+j]=points[i][j]+normals[i][j]*distance*factors[i];}return out;
}
function ironArch(p,head){
 const hx=p.width/2-p.tube_radius,y=(p.length/2-p.tube_radius)*(head?1:-1),top=(head?p.head_height:p.foot_height)-p.tube_radius,r=Math.min(.14*p.width/.97,hx-.02,top-.05),points=[[-hx,y,0],[-hx,y,top-r]];
 for(let i=1;i<=28;i++){const a=Math.PI-Math.PI/2*i/28;points.push([-hx+r+r*Math.cos(a),y,top-r+r*Math.sin(a)]);}
 points.push([hx-r,y,top]);for(let i=1;i<=28;i++){const a=Math.PI/2*(1-i/28);points.push([hx-r+r*Math.cos(a),y,top-r+r*Math.sin(a)]);}points.push([hx,y,0]);return points;
}
function ironFrame(kind,p,base){
 const q={width:.97,length:2.03,head_height:1.24,foot_height:.85,tube_radius:.019},head=kind==='iron-frame-head',before=ironArch(q,head),after=ironArch(p,head),out=new Float32Array(base.length);
 for(let i=0;i<base.length;i+=3){let index=0,minimum=Infinity;for(let k=0;k<before.length;k++){const d=before[k].reduce((s,v,j)=>s+(base[i+j]-v)**2,0);if(d<minimum){minimum=d;index=k;}}for(let j=0;j<3;j++)out[i+j]=after[index][j]+(base[i+j]-before[index][j])*p.tube_radius/.019;}return out;
}
function ironBedspread(p){
 const hx=p.width/2-p.tube_radius,ly=p.length/2-p.tube_radius,sx=hx-.026+.042,syf=ly-.031+.033,syh=ly-.031+.004,top=p.frame_height+.013+p.mattress_thickness+.006,ww=2*sx,lw=syf+syh,points=[];
 const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
 for(let j=0;j<=72;j++)for(let i=0;i<=72;i++){
  const y=-syf+lw*j/72,x=-sx+2*sx*i/72;let dome=0;if(Math.abs(x)<sx-.045&&y>-syf+.04&&y<syh-.008)dome=.005*(1-(x/(sx-.04))**2)*(1-(y/syh)**2);
  const ts=smooth((Math.abs(x)-(sx-.048))/.048),sd=ts*(p.drape_depth+.012*Math.sin(2*Math.PI*4*y/lw+.9)),tf=smooth((-y-(syf-.040))/.040),fd=tf*(1.05*p.drape_depth+.014*Math.sin(2*Math.PI*5*x/ww+2.1)),th=smooth((y-(syh-.036))/.030),hd=th*.035;
  const wrinkle=.0035*Math.sin(x*31+.7)*Math.sin(y*27+1.9)*Math.max(ts,tf,th),deep=Math.max(sd,fd)+.35*Math.min(sd,fd)+hd,z=Math.max(top+dome+wrinkle-deep,.04);points.push([x,y,z].map(Math.fround));
 }
 return solidifySheet(points,73,73,.0026,0,true);
}
function tatamiSheet(kind,p){
 const w=p.width,l=p.length,ph=p.platform_height,qt=p.quilt_thickness,rim=p.rim_width,qw=w-2*rim-.008,y0=-(l/2-rim-.004),y1=l/2-.08,points=[];
 if(kind.startsWith('tatami-quilt-')){
  const side=Number(kind.slice(-1)),x0=side?.008:-qw/2,x1=side?qw/2:-.008,cw=(x1-x0)/3,ch=(y1-y0)/6;
  for(let j=0;j<48;j++)for(let i=0;i<34;i++){const u=i/33,v=j/47,x=x0+(x1-x0)*u,y=y0+(y1-y0)*v,fu=((x-x0)/cw)%1,fv=((y-y0)/ch)%1,edge=Math.min(x-x0,x1-x,y-y0,y1-y),fade=Math.min(1,edge/.05),puff=(Math.sin(Math.PI*fu)*Math.sin(Math.PI*fv))**.85,z=ph+qt+.006*puff*(.3+.7*fade)-.004*(1-fade)+.0012*Math.sin(2*Math.PI*(3*u+2*v))*fade;points.push([x,y,z].map(Math.fround));}
  return solidifySheet(points,34,48,qt,-1);
 }
 const top=ph+qt+.016,path=[[-Math.min(.6,qw/2-.1),top],[qw/2-.06,top],[qw/2+.015,ph+.008],[w/2-.015,ph+.008],[w/2+.004,ph-.012],[w/2+.007,.024],[w/2-.045,.009]],lengths=[0];
 for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
 for(let j=0;j<44;j++)for(let i=0;i<80;i++){
  const s=i/79,t=j/43,target=s*lengths.at(-1);let k=0;while(k<path.length-2&&target>lengths[k+1])k++;const f=(target-lengths[k])/(lengths[k+1]-lengths[k]);let x=path[k][0]+(path[k+1][0]-path[k][0])*f,z=path[k][1]+(path[k+1][1]-path[k][1])*f;const y=-l/2+rim+.3+t*p.throw_band,wave=Math.sin(2*Math.PI*7*t+1.3*Math.sin(2*Math.PI*s*2.2)),fade=Math.min(1,s/.05);let ax,az;
  if(z>ph+qt+.005){ax=.003;az=.003;}else if(z>ph-.015){ax=.002;az=.0015;}else{const progress=Math.min(1,(ph-.015-z)/Math.max(ph-.04,1e-6));ax=.005+.013*progress**1.2;az=0;}
  x+=fade*ax*wave;z+=fade*az*Math.sin(2*Math.PI*7*t+.9);if(z<.06)z-=fade*.005*(.5+.5*Math.sin(2*Math.PI*7*t+1.2))*(.06-z)/.06;z=Math.max(z,.006);points.push([x,y,z].map(Math.fround));
 }
 return solidifySheet(points,80,44,.0045,0);
}

// Preserve the native 0.7 mm manufactured-edge profiles while translating the
// eight authored hollow-bin rings; full native surfaces verify the approximation.
const playDeskMappings=new WeakMap();
function playDeskBin(index,p,state,base){
 const original={desk_width:1.1,desk_depth:.5,desk_height:.62,storage_width:.385,panel_thickness:.021,seat_height:.333,seat_diameter:.328,drawer_extension:.22};
 const points=q=>{
  const t=q.panel_thickness,cheek=t*1.5,right=q.desk_width/2-.024-cheek/2,left=right-q.storage_width+cheek,cx=(left+right)/2;
  const width=q.storage_width-3*t-.012,depth=q.desk_depth-.080,top=q.desk_height-t-.018,pitch=(top-q.desk_height*.20+.008)/3,height=pitch-.020;
  const dy=(-.021-q.seat_diameter/2-.0001032/(q.desk_height-t+.002))/2,cy=-.006-dy-(state==='open'?q.drawer_extension*[1,.64,.32][index]:0),bottom=top-index*pitch-height;
  const specs=[[width-.015,depth-.016,.019,0],[width-.008,depth-.010,.021,.003],[width-.005,depth-.007,.022,.008],[width,depth,.024,height-.004],[width,depth,.024,height],[width-.0064,depth-.0064,.021,height],[width-.0104,depth-.0124,.019,.011],[width-.017,depth-.019,.017,.0045]],vertices=[];
  for(const[w,d,r,z]of specs)for(const[x,y,a]of[[w/2-r,d/2-r,0],[-w/2+r,d/2-r,90],[-w/2+r,-d/2+r,180],[w/2-r,-d/2+r,270]])for(let n=0;n<=12;n++){const angle=(a+90*n/12)*Math.PI/180;vertices.push([cx-(-.009+.0000888/(q.desk_height-t+.002))/2+x+r*Math.cos(angle),cy+y+r*Math.sin(angle),bottom+z]);}
  return vertices;
 };
 const before=points(original),after=points(p),out=new Float32Array(base);
 let cache=playDeskMappings.get(base.buffer);if(!cache){cache=new Map();playDeskMappings.set(base.buffer,cache);}const key=state+':'+index+':'+base.byteOffset;let mapping=cache.get(key);
 if(!mapping){mapping=new Uint32Array(base.length/3);for(let i=0;i<base.length;i+=3){let distance=Infinity;for(let k=0;k<before.length;k++){const d=(base[i]-before[k][0])**2+(base[i+1]-before[k][1])**2+(base[i+2]-before[k][2])**2;if(d<distance){distance=d;mapping[i/3]=k;}}}cache.set(key,mapping);}
 for(let i=0;i<out.length;i+=3){const chosen=mapping[i/3];for(let j=0;j<3;j++)out[i+j]+=after[chosen][j]-before[chosen][j];}
 return out;
}

// Original 0139 four-bar intersection, branch selection and floor-clearance rule.
function foldingChairLift(p,state){
 const P=[0,.255],H=[.045,.445],F0=[-.090,.368],r=.24,angle=5*Math.PI/180,S0=[H[0]-r*Math.cos(angle),H[1]-r*Math.sin(angle)],length=Math.hypot(S0[0]-F0[0],S0[1]-F0[1]);
 const a=[p.frame_spread,.012-P[1]],b=[-p.frame_spread,.012-P[1]],phi=Math.atan2(b[0]*a[1]-b[1]*a[0],b[0]*a[0]+b[1]*a[1])*({unfolded:0,half_open:.5,folded:1}[state]);
 const rot=(v,x)=>[Math.cos(x)*v[0]-Math.sin(x)*v[1],Math.sin(x)*v[0]+Math.cos(x)*v[1]],relative=rot([F0[0]-P[0],F0[1]-P[1]],phi),F=relative.map((x,i)=>x+P[i]),d=Math.hypot(F[0]-H[0],F[1]-H[1]),along=(r*r-length*length+d*d)/(2*d),h=Math.sqrt(Math.max(r*r-along*along,0)),direction=[(F[0]-H[0])/d,(F[1]-H[1])/d],base=H.map((x,i)=>x+along*direction[i]),perp=[-direction[1],direction[0]],plus=base.map((x,i)=>x+h*perp[i]),minus=base.map((x,i)=>x-h*perp[i]);
 const dist=q=>Math.hypot(q[0]-S0[0],q[1]-S0[1]),S=dist(minus)<=dist(plus)?minus:plus,u0=[S0[0]-H[0],S0[1]-H[1]],u=[S[0]-H[0],S[1]-H[1]],theta=Math.atan2(u0[0]*u[1]-u0[1]*u[0],u0[0]*u[0]+u0[1]*u[1]),mid=F.map((x,i)=>(x+S[i])/2);
 let low=0;for(const raw of[[-p.frame_spread,.012],[-p.frame_spread*.52,.098],[-.06,.19]])low=Math.min(low,P[1]+rot(raw.map((x,i)=>x-P[i]),phi)[1]-.012);
 for(const raw of[mid,F,S])low=Math.min(low,raw[1]-.02);
 for(const corner of[[-p.seat_depth,-.024],[-p.seat_depth,0],[0,-.024]])low=Math.min(low,H[1]+rot(corner,theta)[1]);return Math.max(0,.006-low);
}
