// Browser-only geometry responses. No Python or Blender service is called.
import {buildDynamic,directPositions} from './dynamic.mjs';
// Large immutable calibration buffers can be shared by independent instances.
const correctionResources=new Map();
async function resource(url, gzip=false) {
  const r=await fetch(url); if(!r.ok) throw new Error(`Asset resource ${r.status}: ${url}`);
  if(!gzip)return r.json();
  const buffer=await r.arrayBuffer(),bytes=new Uint8Array(buffer);
  if(bytes[0]!==0x1f||bytes[1]!==0x8b)return buffer;
  return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
export async function attachParameters(THREE, root, spec, base, initial={}) {
  const schema=spec.parameterSchema, defaults=Object.fromEntries(Object.entries(schema).map(([k,v])=>[k,v.default]));
  const data=await resource(new URL('response.json',base));
  const gamingRuntime=data.id==='01-L1-0170'?await import(new URL('gaming-desk.mjs',base)):null;
  const nativeTessellation=data.nativePolygons?await import(new URL('native-tessellation.mjs',base)):null;
  const noiseRuntime=Object.values(data.materialControls||{}).some(c=>['noiseSeed','paintWear','grainScale'].includes(c.property))?await import(new URL('finish-noise.mjs',base)):null;
  const barRuntime=data.bar?await import(new URL('bar-cabinet.mjs',base)):null;
  const vanityRuntime=data.vanity?await import(new URL('vanity-slats.mjs',base)):null;
  const lightingRuntime=data.lighting?await import(new URL('lighting.mjs',base)):null;
  const readoutRuntime=data.readout?await import(new URL('standing.mjs',base)):null;
  const weaveRuntime=data.weave?await import(new URL('corner-desk-weave.mjs',base)):null;
  const weaveLibrary=data.weave?JSON.parse(new TextDecoder().decode(await resource(new URL(data.weave.file,base),true))):null;
  const friezeRuntime=data.frieze?await import(new URL('corner-table.mjs',base)):null;
  const friezeLibrary=data.frieze?JSON.parse(new TextDecoder().decode(await resource(new URL(data.frieze.file,base),true))):null;
  const cantileverRuntime=data.cantilever?await import(new URL('cantilever.mjs',base)):null;
  const cantileverLibrary=data.cantilever?JSON.parse(new TextDecoder().decode(await resource(new URL(data.cantilever.file,base),true))):null;
  const benchRuntime=data.bench?await import(new URL('bench.mjs',base)):null;
  const benchLibrary=data.bench?JSON.parse(new TextDecoder().decode(await resource(new URL(data.bench.file,base),true))):null;
  const bistroRuntime=data.bistro?await import(new URL('bistro.mjs',base)):null;
  const bistroLibrary=data.bistro?JSON.parse(new TextDecoder().decode(await resource(new URL(data.bistro.file,base),true))):null;
  const cartRuntime=data.cart?await import(new URL('serving-cart.mjs',base)):null;
  const cartLibrary=data.cart?JSON.parse(new TextDecoder().decode(await resource(new URL(data.cart.file,base),true))):null;
  const trolleyRuntime=data.trolley?await import(new URL('wire-trolley.mjs',base)):null;
  const trolleyLibrary=data.trolley?JSON.parse(new TextDecoder().decode(await resource(new URL(data.trolley.file,base),true))):null;
  const cabrioleRuntime=data.cabriole?await import(new URL('cabriole-legs.mjs',base)):null;
  const cabrioleLibrary=data.cabriole?JSON.parse(new TextDecoder().decode(await resource(new URL(data.cabriole.file,base),true))):null;
  const tileRuntime=data.tiles?await import(new URL('kitchen-tiles.mjs',base)):null;
  const tileLibrary=data.tiles?JSON.parse(new TextDecoder().decode(await resource(new URL(data.tiles.file,base),true))):null;
  const wardrobeRuntime=data.wardrobe?await import(new URL('wardrobe-bag.mjs',base)):null;
  const wardrobeLibrary=data.wardrobe?JSON.parse(new TextDecoder().decode(await resource(new URL(data.wardrobe.file,base),true))):null;
  const dressingRuntime=data.dressing?await import(new URL('dressing.mjs',base)):null;
  const dressingLibrary=data.dressing?JSON.parse(new TextDecoder().decode(await resource(new URL(data.dressing.file,base),true))):null;
  const readoutLibrary=data.readout?JSON.parse(new TextDecoder().decode(await resource(new URL(data.readout.file,base),true))):null;
  const originalSetState=root.setState.bind(root), originalPrepare=root.prepareState.bind(root), originalDispose=root.dispose.bind(root);
  const originalGroups=[...root.children];
  const templates=new Map(), pending=new Map(), acquiredCorrections=new Map();
  function correction(url){
    const key=url.href;let entry=acquiredCorrections.get(key);
    if(!entry){entry=correctionResources.get(key);if(!entry){entry={references:0,promise:resource(url,true)};correctionResources.set(key,entry);entry.promise.catch(()=>{if(correctionResources.get(key)===entry)correctionResources.delete(key);});}entry.references++;acquiredCorrections.set(key,entry);}
    return entry.promise;
  }
  let committed={...defaults}, desired={...defaults}, state=root.userData.state, desiredState=state, token=0, disposed=false, live=null;
  const active=new Set();
  function check(patch, current) {
    const out={...current};
    for(const [key,value] of Object.entries(patch)) {
      const d=schema[key]; if(!d) throw new RangeError(`Unknown parameter: ${key}`);
      if(d.enum ? !d.enum.includes(value) : typeof value!=='number'||!Number.isFinite(value)||value<d.min||value>d.max||(d.type==='integer'&&!Number.isInteger(value))) throw new RangeError(`Invalid ${key}: ${value}`);
      out[key]=value;
    }
    if(data.link) {
      const l=data.link;
      if(Object.hasOwn(patch,l.count)&&!Object.hasOwn(patch,'seat_count_mode'))out.seat_count_mode='manual';
      if(out.seat_count_mode==='auto') {
        let net=out[l.width];
        if(l.arc)net*=out[l.arc]*Math.PI/180;
        for(const s of l.subtract||[])net-=s.key?out[s.key]*(s.factor??1):s.constant;
        out[l.count]=Math.max(l.min,Math.min(l.max,Math.floor(net/out.target_seat_width+.5)));
      }
    }
    return out;
  }
  function free(group) { if(!group)return;group.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();}});group.removeFromParent(); }
  async function prepared(name) {
    if(!templates.has(name))templates.set(name,(async()=>{
      await originalPrepare(name);await originalSetState(name);root.updateMatrixWorld(true);
      const group=root.children.find(g=>g.name===`state:${name}`), map=new Map();
      if(!group)throw new Error(`Missing state template ${name}`);
      const inv=root.matrixWorld.clone().invert();
      group.traverse(o=>{if(o.isMesh||o.name.startsWith('socket:'))map.set(o.name,{object:o,matrix:new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)});});
      group.visible=false;return map;
    })().catch(e=>{templates.delete(name);throw e;}));
    return templates.get(name);
  }
  function array(buffer,d){return new (d.type==='u32'?Uint32Array:Float32Array)(buffer,d.offset,d.length/4);}
  function expression(e,p) {
    if(typeof e==='number')return e;if(typeof e==='string')return p[e];
    const [op,...children]=e,a=children.map(x=>expression(x,p));
    switch(op){case '+':return a.reduce((x,y)=>x+y,0);case '-':return a[0]-a[1];case '*':return a.reduce((x,y)=>x*y,1);case '/':return a[0]/a[1];case 'max':return Math.max(...a);case 'min':return Math.min(...a);case '>':return +(a[0]>a[1]);case 'sin':return Math.sin(a[0]);case 'cos':return Math.cos(a[0]);case 'sqrt':return Math.sqrt(a[0]);case 'pow':return Math.pow(a[0],a[1]);default:throw new Error(`Unsupported expression ${op}`);}
  }
  async function build(p,name) {
    const effective={...Object.fromEntries(data.keys.map((k,i)=>[k,data.centers[i]])),...p};
    const model=data.models.find(m=>m.state===name&&Object.entries(m.variant).every(([k,v])=>p[k]===v)&&(!m.bounds||data.keys.every((k,i)=>effective[k]>=m.bounds[0][i]-1e-9&&effective[k]<=m.bounds[1][i]+1e-9)));
    if(!model)throw new RangeError('Unsupported parameter/state combination');
    const tm=await prepared(name);
    if(!pending.has(model.file))pending.set(model.file,resource(new URL(model.file,base),true).catch(e=>{pending.delete(model.file);throw e;}));
    const buffer=await pending.get(model.file), u=data.keys.map((k,i)=>(effective[k]-(model.centers??data.centers)[i])/(model.scales??data.scales)[i]);
    for(const f of data.features||[])u.push((expression(f.expression,p)-expression(f.expression,defaults))/(f.scale??1));
    const group=new THREE.Group();group.name=`parameters:${name}`;
    try {
      for(const part of model.parts) {
        const template=tm.get(part.template);if(!template)throw new Error(`Missing template ${part.template}`);
        const old=template.object;
        if(cartRuntime&&cartLibrary.parts[part.name]){group.add(cartRuntime.buildGrid(THREE,cartLibrary,p,template,part.name));continue;}
        if(trolleyRuntime&&trolleyLibrary.parts[part.name]){group.add(trolleyRuntime.buildWire(THREE,trolleyLibrary,p,template,part.name));continue;}
        if(cabrioleRuntime&&/^leg_[fb][lr]$/.test(part.name)){group.add(await cabrioleRuntime.buildLeg(THREE,cabrioleLibrary,p,template,part.name,base));continue;}
        if(wardrobeRuntime&&part.name==='b2_tan_travel_bag_body'){group.add(wardrobeRuntime.buildBag(THREE,wardrobeLibrary,p,template));continue;}
        if(dressingRuntime&&part.name==='shaped_structural_knee_apron'){group.add(dressingRuntime.buildApron(THREE,dressingLibrary,p,template));continue;}
        const direct=data.directGeometry?.[part.name];
        if(direct&&typeof direct==='object')await Promise.all([['correctionFile','correctiveValues'],['referenceCorrectionFile','referenceCorrectiveValues']].map(async([fileKey,valueKey])=>{
          const file=direct[fileKey];if(!file||direct[valueKey])return;
          if(!pending.has(file))pending.set(file,correction(new URL(file,base)).catch(e=>{pending.delete(file);throw e;}));
          direct[valueKey]=new Float32Array(await pending.get(file));
        }));
        const basePositions=array(buffer,part.base),positions=direct?(cantileverRuntime&&typeof direct==='string'&&direct.startsWith('cantilever-')?cantileverRuntime.socketPositions(direct,p):gamingRuntime&&typeof direct==='string'&&direct.startsWith('gaming-')?gamingRuntime.gamingPositions(direct,p,basePositions):directPositions(direct,p,name,basePositions)):new Float32Array(basePositions), mapping=array(buffer,part.map);
        if(direct&&positions.length!==basePositions.length)throw new Error(`Direct construction changed template vertex count: ${part.name}`);
        for(const term of direct?[]:part.terms) {
          const factor=term.powers.reduce((n,i)=>n*u[i],1);if(Math.abs(factor)<1e-15)continue;
          const values=array(buffer,term.values);for(let i=0;i<positions.length;i++)positions[i]+=values[i]*factor;
        }
        if(part.socket){const socket=new THREE.Group();socket.name=part.name;template.matrix.decompose(new THREE.Vector3(),socket.quaternion,socket.scale);socket.position.fromArray(positions);if(barRuntime)barRuntime.orientSocket(THREE,socket,p,name);socket.userData={...old.userData};group.add(socket);continue;}
        const g=old.geometry.clone();
        if((Array.isArray(old.material)?old.material:[old.material]).some(m=>m?.anisotropy>0))ensureAnisotropicTangents(THREE,g);
        g.applyMatrix4(template.matrix);
        const attr=g.getAttribute('position'), before=attr.array.slice();
        if(gamingRuntime)g.setAttribute('carbonReference',new THREE.Float32BufferAttribute(before,3));
        for(let i=0;i<mapping.length;i++)for(let j=0;j<3;j++)attr.array[3*i+j]=positions[3*mapping[i]+j];
        deformNormals(THREE,g,before);
        if(data.nativePolygons?.[part.name]){
          const vertices=Array.from({length:attr.count},(_,i)=>[attr.getX(i),attr.getY(i),attr.getZ(i)]),indices=nativeTessellation.triangulateNative(vertices,data.nativePolygons[part.name]).flat();g.setIndex(indices);g.clearGroups();g.addGroup(0,indices.length,0);
        }
        attr.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
        const mats=(Array.isArray(old.material)?old.material:[old.material]).map(m=>m?.clone());
        for(const [key,control] of Object.entries(data.materialControls||{}))for(const m of mats){
          if(!m||!new RegExp(control.match,'i').test([m.name,m.userData.family,m.userData.finish_id].join(' ')))continue;
          const ratio=control.expression?expression(control.expression,p):p[key]/schema[key].default;
          // Three multiplies this uniform by the retained roughness texture
          // before the physical shader clamps the resulting surface roughness.
          if(control.property==='carbonTwill')gamingRuntime.applyCarbonTwill(THREE,m,p[key],schema[key].default);
          else if(control.property==='noiseSeed')noiseRuntime.applySeedNoise(THREE,m,p[key],schema[key].default,control);
          else if(control.property==='paintWear')noiseRuntime.applyPaintWear(THREE,m,p[key],schema[key].default,control.roles[part.name]);
          else if(control.property==='grainScale'){barRuntime.prepareWoodCoordinates(THREE,g,p,name,part.name);noiseRuntime.applyWalnutGrain(THREE,m,p[key],schema[key].default);}
          else if(control.property==='roughness')m.roughness=Math.max(0,m.roughness*ratio);
          else if(control.property==='color')m.color.multiplyScalar(ratio);
          else if(control.property==='emissiveIntensity')m.emissiveIntensity*=ratio;
        }
        const mesh=new THREE.Mesh(g,Array.isArray(old.material)?mats:mats[0]);mesh.name=part.name;mesh.userData={...old.userData,assetNode:part.name};mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;mesh.visible=old.visible;
        group.add(mesh);
      }
      if(weaveRuntime)weaveRuntime.buildBaskets(THREE,weaveLibrary,p,tm,group);
      if(friezeRuntime)friezeRuntime.buildFriezes(THREE,friezeLibrary,p,tm,group);
      if(cantileverRuntime)cantileverRuntime.buildChair(THREE,cantileverLibrary,p,tm,group);
      if(benchRuntime)await benchRuntime.buildBench(THREE,benchLibrary,p,tm,group,base);
      if(bistroRuntime)bistroRuntime.buildBistro(THREE,bistroLibrary,p,tm,group);
      if(tileRuntime)tileRuntime.buildTiles(THREE,tileLibrary,p,tm,group);
      if(barRuntime)barRuntime.buildRibs(THREE,p,tm,group);
      if(vanityRuntime)vanityRuntime.buildSlats(THREE,p,name,tm,group,data.materialControls.seed);
      if(data.dynamic)buildDynamic(THREE,data.dynamic,p,tm,group,deformNormals);
      if(lightingRuntime)lightingRuntime.buildLighting(THREE,data.lighting,p,name,group);
      if(readoutRuntime)readoutRuntime.buildReadout(THREE,readoutLibrary,p,name,tm,group);
      return group;
    } catch(e){free(group);throw e;}
  }
  async function apply(p,name,request) {
    const group=await build(p,name);
    if(disposed||request!==token){free(group);return root;}
    for(const g of originalGroups)g.visible=false;
    for(const g of root.children)if(g.name.startsWith('state:'))g.visible=false;
    free(live);live=group;root.add(group);committed={...p};state=name;root.userData.state=name;root.userData.params={...p};root.updateMatrixWorld(true);
    return root;
  }
  function submit(p,name) {
    if(disposed)throw new Error('Asset has been disposed');
    desired=p;desiredState=name;const request=++token;
    const job=apply(p,name,request).catch(e=>{if(request===token){desired={...committed};desiredState=state;}throw e;});
    active.add(job);job.finally(()=>active.delete(job)).catch(()=>{});return job;
  }
  root.parameterSchema=schema;root.getParams=()=>({...committed});
  root.updateParams=patch=>submit(check(patch,desired),desiredState);
  root.resetParams=()=>submit(check({},defaults),desiredState);
  root.setState=name=>{if(!spec.availableStates.includes(name))throw new RangeError(`Unknown state: ${name}`);return submit({...desired},name);};
  root.getStateObject=name=>live?.getObjectByName(name);
  root.dispose=async()=>{if(disposed)return;disposed=true;++token;await Promise.allSettled([...active]);free(live);pending.clear();if(cabrioleRuntime)cabrioleRuntime.disposeLibrary(cabrioleLibrary);if(benchRuntime)benchRuntime.disposeLibrary(benchLibrary);if(cantileverRuntime)cantileverRuntime.disposeLibrary(cantileverLibrary);for(const[key,entry]of acquiredCorrections){entry.references--;if(entry.references===0&&correctionResources.get(key)===entry)correctionResources.delete(key);}acquiredCorrections.clear();for(const part of Object.values(data.directGeometry??{}))if(part&&typeof part==='object'){delete part.correctiveValues;delete part.referenceCorrectiveValues;}await originalDispose();};
  await submit(check(initial,defaults),state);return root;
}
// Transport the saved split/weighted normals through each deformed triangle.
// This retains original smooth/crease normals instead of flattening UV seams.
export function deformNormals(THREE,g,before) {
  const pos=g.attributes.position.array, normal=g.attributes.normal;if(!normal)return;
  const tangent=g.attributes.tangent,oldTangents=tangent?.array.slice(),tangentSums=tangent?new Float64Array(pos.length):null;
  const oldNormals=normal.array.slice(), sums=new Float64Array(normal.array.length), counts=new Uint32Array(pos.length/3), index=g.index?.array;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3(),n=new THREE.Vector3(),q=new THREE.Vector3();
  const oldFrame=new THREE.Matrix3(),newFrame=new THREE.Matrix3(),transform=new THREE.Matrix3(),tangentTransform=new THREE.Matrix3();
  const length=index?index.length:pos.length/3;
  for(let t=0;t<length;t+=3) {
    const ids=index?[index[t],index[t+1],index[t+2]]:[t,t+1,t+2], [i,j,k]=ids.map(v=>3*v);
    a.set(before[j]-before[i],before[j+1]-before[i+1],before[j+2]-before[i+2]);b.set(before[k]-before[i],before[k+1]-before[i+1],before[k+2]-before[i+2]);
    c.set(pos[j]-pos[i],pos[j+1]-pos[i+1],pos[j+2]-pos[i+2]);d.set(pos[k]-pos[i],pos[k+1]-pos[i+1],pos[k+2]-pos[i+2]);
    n.crossVectors(a,b);q.crossVectors(c,d);if(n.lengthSq()<1e-24||q.lengthSq()<1e-24)continue;n.normalize();q.normalize();
    oldFrame.set(a.x,b.x,n.x,a.y,b.y,n.y,a.z,b.z,n.z);newFrame.set(c.x,d.x,q.x,c.y,d.y,q.y,c.z,d.z,q.z);
    tangentTransform.multiplyMatrices(newFrame,oldFrame.invert());
    transform.copy(tangentTransform).invert().transpose();
    for(const v of ids){n.fromArray(oldNormals,3*v).applyMatrix3(transform).normalize();sums[3*v]+=n.x;sums[3*v+1]+=n.y;sums[3*v+2]+=n.z;counts[v]++;if(tangent){q.fromArray(oldTangents,4*v).applyMatrix3(tangentTransform).normalize();tangentSums[3*v]+=q.x;tangentSums[3*v+1]+=q.y;tangentSums[3*v+2]+=q.z;}}
  }
  for(let i=0;i<counts.length;i++)if(counts[i]){n.fromArray(sums,3*i).normalize();normal.setXYZ(i,n.x,n.y,n.z);}
  normal.needsUpdate=true;
  if(tangent){for(let i=0;i<counts.length;i++){n.fromBufferAttribute(normal,i).normalize();q.fromArray(counts[i]?tangentSums:oldTangents,(counts[i]?3:4)*i);q.addScaledVector(n,-q.dot(n)).normalize();if(q.lengthSq()<.5)throw Error('Degenerate transported anisotropic tangent');tangent.setXYZW(i,q.x,q.y,q.z,oldTangents[4*i+3]);}tangent.needsUpdate=true;}
}
// Untextured native metals have no UV derivative from which Three can derive
// anisotropy. Give them a stable local brushing direction, then transport that
// vector with the same structural deformation as their saved normals.
export function ensureAnisotropicTangents(THREE,g){
 if(g.attributes.tangent)return;
 const normal=g.attributes.normal;if(!normal)throw Error('Anisotropic geometry requires normals');
 g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3()).toArray(),order=[0,1,2].sort((a,b)=>size[b]-size[a]),axis=new THREE.Vector3(),n=new THREE.Vector3(),t=new THREE.Vector3(),values=new Float32Array(normal.count*4);
 for(let i=0;i<normal.count;i++){
  n.fromBufferAttribute(normal,i).normalize();if(!Number.isFinite(n.lengthSq())||n.lengthSq()<.5)throw Error('Invalid anisotropic normal');
  for(const a of order){axis.set(0,0,0).setComponent(a,1);t.copy(axis).addScaledVector(n,-axis.dot(n));if(t.lengthSq()>1e-8)break;}
  t.normalize();values.set([t.x,t.y,t.z,1],4*i);
 }
 g.setAttribute('tangent',new THREE.BufferAttribute(values,4));g.userData.anisotropyTangent='local longest-axis projection, transported through parameter deformation';
}
