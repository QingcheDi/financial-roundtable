// Exact native rectangular frame/panel dimensions, bounded rail clamps and rigid joints.
export function shakerPositions(def,p,state,base){
 const name=def.name.replace(/\.(solid_frame|recessed_panel)$/,''),panel=def.name.endsWith('.recessed_panel'),top=p.counter_height-p.worktop_thickness-.006;
 let cx,cy,lo,hi,width,origin=[0,0,0],angle=0;
 if(name.startsWith('drawer_')||name==='storage_top_drawer'){
  const storage=name==='storage_top_drawer',index=storage?3:Number(name.slice(-1))-1,h=top-.116,splits=[.114,.114+h*.47,.114+h*.75,top];
  lo=storage?top-.163:splits[index]+.002;hi=storage?top:splits[index+1]-.003;width=p.width/4-.009;cx=p.width*(storage?.375:-.125);cy=-p.depth/2-.010;origin[1]=Math.fround(state==='open'?-p.drawer_extension*(storage?.79:1):0);
 }else{
  let side,center,hingeY;
  if(name.startsWith('wall_door_')){const i=Number(name.slice(-1))-1,um=p.width*.970/4;center=-p.width*.970/2+um*(i+.5);width=um-.007;hingeY=p.depth/2-.365;lo=p.upper_bottom+(i===2?.245:0)+.003;hi=p.overall_height-.003;side=i===1?'left':'right';}
  else{const sink=name==='sink_door';center=p.width*(sink?-.375:.375);width=p.width/4-.007;hingeY=-p.depth/2-.010;lo=.114;hi=sink?top:top-.169;side=sink?'left':'right';}
  const direction=side==='left'?1:-1;origin=[Math.fround(center-direction*width/2),Math.fround(hingeY),Math.fround(lo)];cx=direction*width/2;cy=0;hi-=lo;lo=0;angle=Math.fround(state==='open'?-direction*p.door_open_angle*Math.PI/180:0);
 }
 const height=hi-lo,frame=Math.min(p.frame_width,height*.245),cz=(lo+hi)/2,boxes=panel?[{center:[cx,cy+.003,cz],dimensions:[width-2*frame+.008,.009,height-2*frame+.008]}]:[
  {center:[cx-width/2+frame/2,cy,cz],dimensions:[frame,.022,height]},
  {center:[cx+width/2-frame/2,cy,cz],dimensions:[frame,.022,height]},
  {center:[cx,cy,lo+frame/2],dimensions:[width-2*frame,.022,frame]},
  {center:[cx,cy,hi-frame/2],dimensions:[width-2*frame,.022,frame]}
 ];
 const ref=def.states[state],m=ref.inverse,out=new Float32Array(base.length),cos=Math.cos(angle),sin=Math.sin(angle);
 if(ref.owners.length*3!==base.length)throw Error('Native shaker binding count mismatch');
 for(let i=0;i<base.length;i+=3){const x=base[i],y=base[i+1],z=base[i+2],local=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]],owner=ref.owners[i/3],a=ref.boxes[owner],b=boxes[owner],v=local.map((x,k)=>b.center[k]+x-a.center[k]+Math.sign(x-a.center[k])*(b.dimensions[k]-a.dimensions[k])/2);
  out[i]=origin[0]+cos*v[0]-sin*v[1];out[i+1]=origin[1]+sin*v[0]+cos*v[1];out[i+2]=origin[2]+v[2];
 }return out;
}
