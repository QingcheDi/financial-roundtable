import {buildCantilever,Upholstery} from './cantilever-raw.mjs';
import {triangulateNative} from './native-tessellation.mjs';
import {deformNormals} from './parametric.mjs';
const references=new WeakMap(),defaults={seat_width:.53,seat_depth:.51,seat_height:.415,back_height:.334,back_recline:8,tube_diameter:.021,channel_depth:.00035,channel_count:15};
export function socketPositions(kind,p){const pad=new Upholstery(p);return new Float32Array(kind.endsWith('floor')?[0,0,0]:kind.endsWith('seat')?[0,-.065,p.seat_height]:[0,pad.spine(pad.length)[0][1],pad.top_z]);}
export function buildChair(THREE,library,p,templates,group){
 let ref=references.get(library);if(!ref){ref={};for(const[name,raw]of Object.entries(buildCantilever(defaults))){const lookup=new Map();for(let fi=0;fi<raw.faces.length;fi++){const tag=raw.faceTags[fi],key=tag.slice(0,-1).join('|')+'|'+raw.faces[fi].length;if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push({fi,value:tag.at(-1)});}ref[name]=lookup;}references.set(library,ref);}
 const raw=buildCantilever(p);
 for(const[name,part]of Object.entries(raw)){
  const old=templates.get(name).object,reference=library.parts[name],lookup=ref[name],positions=[],before=[],normal=[],uv=[],index=[];
  for(let fi=0;fi<part.faces.length;fi++){
   const face=part.faces[fi],tag=part.faceTags[fi],key=tag.slice(0,-1).join('|')+'|'+face.length,candidates=lookup.get(key);if(!candidates?.length)throw Error('Missing original chair polygon chart '+name+' '+key);const chartIndex=candidates.reduce((a,b)=>Math.abs(a.value-tag.at(-1))<=Math.abs(b.value-tag.at(-1))?a:b).fi,chart=reference.faces[chartIndex],offset=positions.length/3;
   before.push(...chart.positions);normal.push(...chart.normals);if(chart.uv.length)uv.push(...chart.uv);for(const corner of chart.corners)positions.push(...part.vertices[face[corner]]);
   const packed=new Map(chart.corners.map((corner,i)=>[corner,i]));for(const tri of triangulateNative(face.map(i=>part.vertices[i]),[face.map((_,i)=>i)]))for(const corner of tri)index.push(offset+packed.get(corner));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));if(uv.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.addGroup(0,index.length,0);deformNormals(THREE,g,before);g.computeBoundingBox();g.computeBoundingSphere();g.userData.cantilever={nativeVertices:part.vertices.length,nativeFaces:part.faces.length,channelCount:p.channel_count,sectionSamples:part.count,wallThickness:name==='Frame_ONE_continuous_hollow_bent_steel_tube'?.0018:undefined};const material=Array.isArray(old.material)?old.material.map(m=>m.clone()):old.material.clone(),mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.userData={...old.userData};if(name.startsWith('Upholstery'))mesh.userData.panel_channels=p.channel_count;mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;group.add(mesh);
 }
}
export function disposeLibrary(library){references.delete(library);}
