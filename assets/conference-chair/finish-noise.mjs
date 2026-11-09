// Browser approximation of native seeded 4D procedural bump; saved maps stay intact.
// Differential bump is zero at the original seed, preserving the shipped baseline.
const noiseGLSL=`
uniform float furnitureNoiseSeed;
uniform float furnitureNoiseDefault;
uniform float furnitureNoiseScale;
uniform float furnitureNoiseAmplitude;
uniform vec3 furnitureNoiseVector;
varying vec3 furnitureNoisePosition;
float furnitureHash4(vec4 p){return fract(sin(dot(p,vec4(127.1,311.7,74.7,191.3)))*43758.5453);}
float furnitureNoise4(vec4 p){
 vec4 a=floor(p),f=fract(p),u=f*f*f*(f*(f*6.0-15.0)+10.0);float v=0.0;
 for(int i=0;i<16;i++){vec4 c=vec4(float(i%2),float((i/2)%2),float((i/4)%2),float((i/8)%2));vec4 w=mix(vec4(1.0)-u,u,c);v+=furnitureHash4(a+c)*w.x*w.y*w.z*w.w;}return v;
}
float furnitureFractal(vec3 p,float seed){return (furnitureNoise4(vec4(p,seed))+.65*furnitureNoise4(vec4(p*2.0,seed*2.0))+.4225*furnitureNoise4(vec4(p*4.0,seed*4.0)))/2.0725;}
`;
export function applySeedNoise(THREE,material,value,defaultValue,control){
 const strength=control.strength??(/slot:wood/.test(material.name)?.055:/slot:metal/.test(material.name)?.08:/slot:trim/.test(material.name)?.045:.07);
 const scale=control.scale??360,seedFactor=control.seedFactor??.731,amplitude=(control.bumpDistance??.00012)*strength;
 material.userData={...material.userData,proceduralSeed:value,proceduralSeedMethod:'differential four-dimensional value-noise approximation; original saved normal maps unchanged at default'};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{furnitureNoiseSeed:{value:value*seedFactor},furnitureNoiseDefault:{value:defaultValue*seedFactor},furnitureNoiseScale:{value:scale},furnitureNoiseVector:{value:new THREE.Vector3(...(control.vectorScale??[1,1,1]))},furnitureNoiseAmplitude:{value:amplitude}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 furnitureNoisePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nfurnitureNoisePosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+noiseGLSL).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  float furnitureHeight=furnitureNoiseAmplitude*(furnitureFractal(furnitureNoisePosition*furnitureNoiseVector*furnitureNoiseScale,furnitureNoiseSeed)-furnitureFractal(furnitureNoisePosition*furnitureNoiseVector*furnitureNoiseScale,furnitureNoiseDefault));
  vec3 furnitureDx=dFdx(-vViewPosition),furnitureDy=dFdy(-vViewPosition),furnitureR1=cross(furnitureDy,normal),furnitureR2=cross(normal,furnitureDx);
  float furnitureDet=dot(furnitureDx,furnitureR1)*faceDirection;
  normal=normalize(abs(furnitureDet)*normal-sign(furnitureDet)*(dFdx(furnitureHeight)*furnitureR1+dFdy(furnitureHeight)*furnitureR2));
  `);
 };
 const originalCompile=material.onBeforeCompile;
 if(control.colorRamp)material.onBeforeCompile=shader=>{originalCompile(shader);const ramp=control.colorRamp;shader.uniforms.furnitureRampLow={value:new THREE.Color(...ramp.low)};shader.uniforms.furnitureRampHigh={value:new THREE.Color(...ramp.high)};shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 furnitureRampLow;\nuniform vec3 furnitureRampHigh;').replace('#include <map_fragment>',`#include <map_fragment>
 float furnitureOldNoise=clamp((furnitureFractal(furnitureNoisePosition*furnitureNoiseVector*furnitureNoiseScale,furnitureNoiseDefault)-${ramp.min.toFixed(8)})/${(ramp.max-ramp.min).toFixed(8)},0.0,1.0);
 float furnitureNewNoise=clamp((furnitureFractal(furnitureNoisePosition*furnitureNoiseVector*furnitureNoiseScale,furnitureNoiseSeed)-${ramp.min.toFixed(8)})/${(ramp.max-ramp.min).toFixed(8)},0.0,1.0);
 diffuseColor.rgb*=mix(furnitureRampLow,furnitureRampHigh,furnitureNewNoise)/max(vec3(.00001),mix(furnitureRampLow,furnitureRampHigh,furnitureOldNoise));
 `);};
 material.customProgramCacheKey=()=>`furniture-seed-noise-v1:${value}:${defaultValue}`;
 material.needsUpdate=true;
}

// Preserve the saved finish, applying the relative native fade/scratch equations.
// Native texture coordinates/noise are approximated; default wear is identity.
export function applyPaintWear(THREE,material,value,defaultValue,role){
 const specs={'slot:body':{color:[.056,.078,.021],factor:1,scale:6,low:.98,high:1.7,scratch:.5,brushed:false},'slot:trim':{color:[.130,.146,.095],factor:1,scale:15,low:.95,high:1.2,scratch:.15,brushed:false},'slot:metal':{color:[.32,.34,.31],factor:.28,scale:15,low:.95,high:1.2,scratch:0,brushed:true},'slot:metal.001':{color:[.067,.075,.063],factor:.4,scale:15,low:.95,high:1.2,scratch:0,brushed:true},'slot:label':{color:[.59,.61,.49],factor:.15,scale:15,low:.95,high:1.2,scratch:0,brushed:false}};
 const spec=specs[role];if(!spec)throw Error('Unknown native paint role '+role);
 material.userData={...material.userData,paintWear:value,paintWearRole:role,paintWearMethod:'relative native ramp/scratch/bump formulas with browser noise approximation; saved baseline retained'};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{furnitureWear:{value:value*spec.factor},furnitureWearDefault:{value:defaultValue*spec.factor},furnitureWearColor:{value:new THREE.Color(...spec.color)}});
  const fmt=v=>Number(v).toFixed(8);
  const body=role==='slot:body';
  const code=noiseGLSL+`
uniform float furnitureWear;
uniform float furnitureWearDefault;
uniform vec3 furnitureWearColor;
float furnitureWearNoise(vec3 p){float n=0.0,w=1.0,total=0.0;for(int i=0;i<5;i++){n+=w*furnitureNoise4(vec4(p,0.0));total+=w;w*=.74;p*=2.0;}return n/total;}
vec3 furniturePaintColor(vec3 p,float wear){
 float n=furnitureWearNoise(p*${fmt(spec.scale)});n=${body?'clamp((n-.25)/.5,0.0,1.0)':'n'};
 vec3 a=min(vec3(1.0),furnitureWearColor*(1.0-wear*${fmt(spec.low)}));vec3 b=min(vec3(1.0),furnitureWearColor*(1.0+wear*${fmt(spec.high)}));vec3 c=mix(a,b,n);
 vec3 q=vec3(p.x,cos(-.38)*p.y-sin(-.38)*p.z,sin(-.38)*p.y+cos(-.38)*p.z);
 float scratch=clamp((furnitureFractal(q*vec3(2.0,1.0,42.0)*12.0,0.0)-.53)/.13,0.0,1.0)*wear*${fmt(spec.scratch)};
 return mix(c,min(vec3(1.0),furnitureWearColor*2.0+.02),scratch);
}
`;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 furnitureNoisePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nfurnitureNoisePosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+code).replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb*=furniturePaintColor(furnitureNoisePosition,furnitureWear)/max(vec3(.00001),furniturePaintColor(furnitureNoisePosition,furnitureWearDefault));
`);
  if(!spec.brushed)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float furnitureHeight=.0003*(furnitureWear*(.12+.10*furnitureWear)-furnitureWearDefault*(.12+.10*furnitureWearDefault))*furnitureFractal(furnitureNoisePosition*vec3(1.7,1.7,8.0)*95.0,0.0);
 vec3 furnitureDx=dFdx(-vViewPosition),furnitureDy=dFdy(-vViewPosition),furnitureR1=cross(furnitureDy,normal),furnitureR2=cross(normal,furnitureDx);float furnitureDet=dot(furnitureDx,furnitureR1)*faceDirection;
 normal=normalize(abs(furnitureDet)*normal-sign(furnitureDet)*(dFdx(furnitureHeight)*furnitureR1+dFdy(furnitureHeight)*furnitureR2));
`);
 };
 material.customProgramCacheKey=()=>`furniture-paint-wear-v1:${role}:${value}:${defaultValue}`;material.needsUpdate=true;
}

export function applyWalnutGrain(THREE,material,value,defaultValue){
 material.userData={...material.userData,grainScale:value,grainScaleMethod:'native walnut ramp/fiber/ring equations; approximate browser noise and metric veneer coordinates; default identity'};
 material.onBeforeCompile=shader=>{
  shader.uniforms.walnutScale={value};shader.uniforms.walnutDefaultScale={value:defaultValue};
  const code=noiseGLSL+`
 uniform float walnutScale;uniform float walnutDefaultScale;varying vec2 walnutMetricUV;
 float walnutNoise(vec3 p,float r){return (furnitureNoise4(vec4(p,0.0))+r*furnitureNoise4(vec4(p*2.0,0.0))+r*r*furnitureNoise4(vec4(p*4.0,0.0)))/(1.0+r+r*r);}
 vec3 walnutRamp(float n){
  if(n<.18)return vec3(.027,.012,.006);
  if(n<.33)return mix(vec3(.027,.012,.006),vec3(.068,.029,.012),smoothstep(.18,.33,n));
  if(n<.41)return mix(vec3(.068,.029,.012),vec3(.120,.056,.023),smoothstep(.33,.41,n));
  if(n<.48)return mix(vec3(.120,.056,.023),vec3(.163,.080,.036),smoothstep(.41,.48,n));
  if(n<.53)return mix(vec3(.163,.080,.036),vec3(.077,.033,.014),smoothstep(.48,.53,n));
  if(n<.58)return mix(vec3(.077,.033,.014),vec3(.144,.064,.027),smoothstep(.53,.58,n));
  if(n<.69)return mix(vec3(.144,.064,.027),vec3(.187,.092,.042),smoothstep(.58,.69,n));
  return mix(vec3(.187,.092,.042),vec3(.220,.112,.051),smoothstep(.69,.82,n));
 }
 vec3 walnutColor(vec2 uv,float scale){float n=walnutNoise(vec3(uv*vec2(1.55,9.5)*scale,0.0),.45);vec3 base=walnutRamp(n);vec3 line=mix(vec3(.86,.78,.68),vec3(.32,.26,.21),clamp((sin(n*205.0)-.18)/.73,0.0,1.0));vec3 figured=base*mix(vec3(1.0),line,.63);float f=walnutNoise(vec3(uv*vec2(3.2,360.0)*scale,0.0),.6);vec3 fiber=mix(vec3(.28,.21,.16),vec3(.84,.71,.56),clamp((f-.22)/.55,0.0,1.0));return figured*mix(vec3(1.0),fiber,.82);}
 `;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 woodMetricUV;varying vec2 walnutMetricUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nwalnutMetricUV=woodMetricUV;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+code).replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb*=walnutColor(walnutMetricUV,walnutScale)/max(vec3(.00001),walnutColor(walnutMetricUV,walnutDefaultScale));
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float woodHeight=.00035*.15*(walnutNoise(vec3(walnutMetricUV*vec2(1.55,9.5)*walnutScale*12.0,0.0),.5)-walnutNoise(vec3(walnutMetricUV*vec2(1.55,9.5)*walnutDefaultScale*12.0,0.0),.5));
 vec3 woodDx=dFdx(-vViewPosition),woodDy=dFdy(-vViewPosition),woodR1=cross(woodDy,normal),woodR2=cross(normal,woodDx);float woodDet=dot(woodDx,woodR1)*faceDirection;
 normal=normalize(abs(woodDet)*normal-sign(woodDet)*(dFdx(woodHeight)*woodR1+dFdy(woodHeight)*woodR2));
 `);
 };
 material.customProgramCacheKey=()=>`walnut-grain-v1:${value}:${defaultValue}`;material.needsUpdate=true;
}
