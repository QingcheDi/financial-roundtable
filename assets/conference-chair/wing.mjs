// 0131: original wing-back control cage, tuft relief and nearest-six button rules.
const clamp=x=>Math.max(0,Math.min(1,x));let cachedKey='',cachedValue=null;
function construction(p){
 const key=[p.width,p.depth,p.height,p.seat_height,p.leg_height,p.tuft_depth].join('|');if(key===cachedKey)return cachedValue;
 const sx=p.width/.86,sy=p.depth/.9,td=p.tuft_depth,k1=(p.seat_height-p.leg_height)/.33,k2=(p.height-p.seat_height)/.59,zm=z=>z<=.47?p.leg_height+(z-.14)*k1:p.seat_height+(z-.47)*k2;
 const half=[[-.295,-.160,.940,.500,.045,.045,.050,.030],[-.305,0,.972,.470,.055,.052,.060,.028],[-.325,.220,1,.420,.075,.062,.070,.026],[-.220,.300,1.022,.380,.090,.075,.085,.024],[-.110,.315,1.028,.380,.095,.085,.090,.024],[0,.320,1.030,.380,.095,.090,.095,.024]],stations=[...half,...half.slice(0,-1).reverse().map(s=>[-s[0],...s.slice(1)])].map(s=>[s[0]*sx,...s.slice(1)]),sampled=[];
 const point=i=>stations[Math.max(0,Math.min(stations.length-1,i))];
 for(let i=0;i<stations.length-1;i++)for(let n=0;n<5;n++){const t=n/5,t2=t*t,t3=t2*t,[a,b,c,d]=[point(i-1),point(i),point(i+1),point(i+2)];sampled.push(b.map((v,j)=>.5*(2*v+(-a[j]+c[j])*t+(2*a[j]-5*v+4*c[j]-d[j])*t2+(-a[j]+3*v-3*c[j]+d[j])*t3)));}sampled.push([...stations.at(-1)]);
 const buttons=[[-.150,.790],[-.075,.803],[0,.810],[.075,.803],[.150,.790]];
 function relief(x,z){
  let dh=-.035*Math.exp(-(((z-.60)/.15)**2))-.012*Math.exp(-(((z-.95)/.10)**2));
  for(const[bx,bz]of buttons){const dx=(x-bx*sx)/.032,dz=(z-bz)/.024,d2=dx*dx+dz*dz;if(d2<9){const d=Math.sqrt(d2),th=Math.atan2(dz,dx);dh+=td*Math.exp(-d2)*(1+.55*Math.cos(8*th)*Math.exp(-d));}}
  for(let i=0;i<buttons.length-1;i++){const ax=buttons[i][0]*sx,az=buttons[i][1],bx=buttons[i+1][0]*sx,bz=buttons[i+1][1],vx=bx-ax,vz=bz-az,L2=vx*vx+vz*vz,t=clamp(((x-ax)*vx+(z-az)*vz)/L2),px=ax+t*vx,pz=az+t*vz;dh+=.28*td*Math.exp(-((Math.hypot(x-px,z-pz)/.016)**2));}return dh;
 }
 function section(zt,zb,to,ti,rt,rb){
  const points=[],z0=zb+rb*.55,z1=zt-rt,hm=(to-ti)/2,A=(to+ti)/2;
  for(let j=0;j<16;j++)points.push([-ti,z0+(z1-z0)*(j/15)]);
  for(let j=1;j<=6;j++){const a=j/6;points.push([hm+A*Math.cos(Math.PI*(1-a)),zt-rt+rt*Math.sin(Math.PI*a)**.85]);}
  for(let j=1;j<=4;j++)points.push([to,zt-rt-(zt-rt-z0)*(j/4)]);
  for(let j=1;j<=8;j++){const a=j/8;points.push([hm+A*Math.cos(Math.PI*(1-a)),zb+rb*.55*(1-Math.sin(Math.PI*a))]);}return points;
 }
 const cage=[],front=[],tangents=[];
 for(let i=0;i<sampled.length;i++){const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(sampled.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;tangents.push([dx/length,dy/length]);}
 for(let i=0;i<sampled.length;i++){const st=sampled[i],[x,y]=st,[tx,ty]=tangents[i],nx=-ty,ny=tx,loop=section(...st.slice(2));for(let k=0;k<loop.length;k++){let[h,z]=loop[k];if(k<16&&Math.abs(x)<.28)h+=relief(x,z);const wx=x+nx*h,wy=y*sy+ny*h*sy,wz=zm(z);cage.push([wx,wy,wz]);if(k<16)front.push([wx,wz,wy]);}}
 const K=34,f=Math.fround;
 for(const[end,sign]of [[0,-1],[sampled.length-1,1]]){
  const ring=cage.slice(end*K,(end+1)*K),C=[0,1,2].map(j=>f(ring.reduce((s,v)=>s+v[j],0)/K));let T=[...tangents[end],0].map(f),L=f(Math.hypot(...T));T=T.map(x=>f(x/L));
  for(const[scale,distance]of [[.62,.022*.45],[.30,.022*.80]])for(const point of ring)cage.push(point.map((x,j)=>f(f(C[j]+f(f(f(x)-C[j])*scale))+f(T[j]*(sign*distance)))));
  cage.push(C.map((x,j)=>f(x+f(T[j]*(sign*.022)))));
 }
 const centres=buttons.map(([bx,bz])=>{const wx=bx*sx,wz=zm(bz),near=front.map((q,i)=>({q,i,d:(q[0]-wx)**2+(q[1]-wz)**2})).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,6),y=Math.max(...near.map(x=>x.q[2]));return[wx,y+.05*td*sy,wz];});
 cachedKey=key;cachedValue={cage:cage.map(v=>v.map(f)),centres};return cachedValue;
}
export function wingDirect(def,p,base){
 const c=construction(p);
 if(def.kind==='wing-button'){const centre=c.centres[def.index],out=new Float32Array(base.length);for(let i=0;i<base.length;i++)out[i]=base[i]-def.baseCenter[i%3]+centre[i%3];return out;}
 if(def.kind!=='wing-back')throw Error('Unknown wing-chair component');
 if(c.cage.length!==def.cageVertices)throw Error('Wing-back control cage changed');const s=def.stencil,out=new Float32Array(def.nativeVertices*3);
 for(let i=0;i<def.nativeVertices;i++)for(let j=0;j<3;j++){let sum=0;for(let k=s.offsets[i];k<s.offsets[i+1];k++)sum+=c.cage[s.indices[k]][j]*s.weights[k];out[3*i+j]=sum;}return out;
}
