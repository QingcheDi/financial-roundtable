// Clockwise ear clipping with a reversing sweep and float32 predicates.
// Nonplanar polygon caps must be tessellated after their vertices change.
// The numerical behavior is checked against independently evaluated native faces.
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b);
const dot=(a,b)=>add(add(mul(a[0],b[0]),mul(a[1],b[1])),mul(a[2],b[2]));
const minus=(a,b)=>a.map((v,i)=>sub(v,b[i]));
const cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
function project(points){
 let normal=[0,0,0];
 for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i];for(let k=0;k<3;k++)normal[k]=add(normal[k],mul(sub(a[(k+1)%3],b[(k+1)%3]),add(a[(k+2)%3],b[(k+2)%3])));}
 const length=dot(normal,normal);normal=length>1e-35?normal.map(v=>-mul(v,f(1/f(Math.sqrt(length))))):[0,0,-1];
 const planar=add(mul(normal[0],normal[0]),mul(normal[1],normal[1]));let u,v;
 if(planar>1.1920928955078125e-7){const d=f(1/f(Math.sqrt(planar)));u=[mul(normal[1],d),mul(-normal[0],d),0];v=[mul(-normal[2],u[1]),mul(normal[2],u[0]),sub(mul(normal[0],u[1]),mul(normal[1],u[0]))];}
 else{u=[normal[2]<0?-1:1,0,0];v=[0,1,0];}
 return points.map(p=>[dot(u,p),dot(v,p)]);
}
function turn(a,b,c){const x=sub(b[0],c[0]),y=sub(b[1],c[1]),u=sub(a[0],c[0]),v=sub(a[1],c[1]);return Math.sign(sub(mul(x,v),mul(u,y)));}
function clip(points,precomputed){
 const n=points.length,next=Int32Array.from({length:n},(_,i)=>(i+1)%n),previous=Int32Array.from({length:n},(_,i)=>(i+n-1)%n),kind=Int8Array.from({length:n},(_,i)=>turn(points[(i+n-1)%n],points[i],points[(i+1)%n]));
 let concave=Array.from(kind).filter(x=>x!==1).length,head=0,start=0,count=n,reverse=false;const triangles=[];
 function ear(i,accept){
  if(concave===0)return true;if(kind[i]!==accept)return false;
  const a=previous[i],c=next[i],vertices=[points[i],points[c],points[a]],lo=[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1]))],hi=[Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];
  const edges=vertices.map((p,j)=>{const q=vertices[(j+1)%3],x=sub(q[0],p[0]),y=sub(q[1],p[1]);return[x,y,sub(mul(x,p[1]),mul(p[0],y))];});
  for(let j=next[c];j!==a;j=next[j]){
   if(kind[j]===1)continue;const p=points[j];if(p[0]<lo[0]||p[0]>hi[0]||p[1]<lo[1]||p[1]>hi[1])continue;
   const inside=precomputed?edges.every(([x,y,k])=>add(sub(mul(y,p[0]),mul(x,p[1])),k)>=0):vertices.every((v,k)=>turn(v,vertices[(k+1)%3],p)>=0);
   if(inside)return false;
  }
  return true;
 }
 while(count>3){
  let selected=-1;
  for(const accept of[1,0]){let i=start;for(let visited=0;visited<count;visited++){if(ear(i,accept)){selected=i;break;}i=reverse?previous[i]:next[i];}if(selected>=0)break;}
  if(selected<0){let i=start;for(let visited=0;visited<count;visited++){if(kind[i]!==-1){selected=i;break;}i=next[i];}if(selected<0)selected=i;}
  const a=previous[selected],b=next[selected];triangles.push([a,selected,b]);if(kind[selected]!==1)concave--;next[a]=b;previous[b]=a;if(head===selected)head=b;count--;
  for(const i of[a,b])if(kind[i]!==1){kind[i]=turn(points[previous[i]],points[i],points[next[i]]);if(kind[i]===1)concave--;}
  start=reverse?previous[a]:next[b];if(kind[start]!==1){start=reverse?previous[start]:next[start];reverse=!reverse;}
 }
 triangles.push([head,next[head],next[next[head]]]);return triangles;
}
export function triangulateNative(vertices,faces,{precomputed=true}={}){
 const points=vertices.map(p=>p.map(f)),result=[];
 for(const face of faces){
  if(face.length===3){result.push(face);continue;}
  if(face.length===4){const[a,b,c,d]=face,p=points[a],ac=minus(points[c],p);if(dot(cross(minus(points[b],p),ac),cross(minus(points[d],p),ac))>0)result.push([a,b,d],[b,c,d]);else result.push([a,b,c],[a,c,d]);continue;}
  if(face.length<3)continue;
  for(const tri of clip(project(face.map(i=>points[i])),precomputed))result.push(tri.map(i=>face[i]));
 }
 return result;
}
