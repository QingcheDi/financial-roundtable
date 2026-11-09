import {orientation} from './orientation.mjs';
export {orientation};
import {openAsset} from './loader.mjs';
// Runtime bundled into every asset.mjs. The application supplies its installed THREE.
// Compressed resources are relative files; serve this entire directory over HTTP(S).
export const metadata = Object.freeze({orientation,"schema":"asset-web-module/1","itemId":"01-L1-0033","name":"落地窗","defaultState":"default","sourceUpAxis":"Z","units":"metres","geometryEncoding":"float32-le-base64","textureEncoding":"lossless-png","profile":"MESH","unifiedMaterials":{"9e5a789942f3c4f4876d85ae5e19815383f6b13337d16283b03b37029c4ae5b8":{"finish_id":"metal.powder.charcoal","family":"coated_metal","recipe_version":"1.0.0","canonical_material_id":"metal.powder.charcoal","canonical_recipe_sha256":"be0c6017e8cfa2975c10a31ea2e8928fa19b30d2534145781eac049ae74aeacd","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"941d5fc128ca4159b25a25c1eb67c474f422e3ca4d9c68718d4c3e520f560fdb":{"finish_id":"rubber.charcoal","family":"rubber","recipe_version":"1.0.0","canonical_material_id":"rubber.charcoal","canonical_recipe_sha256":"4f8910e5a119cc7d9adeb2301536ff2c4bcd51cf6d894d2371425545599e5c8b","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"f18336251e569163165e148d289022bb2dd11bdf0b1d9679c568d92bc253d636":{"finish_id":"glass.clear.polished","family":"glass","recipe_version":"1.0.0","canonical_material_id":"glass.clear.polished","canonical_recipe_sha256":"af068feb51f12d0a350a6384c41055195be34d456ef688a0c1383cd66e37986a","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"c8d6766b7f24276607d6a19ce93976fbb487fad1c07244b79efcb4315b42785e":{"finish_id":"metal.powder.charcoal","family":"coated_metal","recipe_version":"1.0.0","canonical_material_id":"metal.powder.charcoal","canonical_recipe_sha256":"be0c6017e8cfa2975c10a31ea2e8928fa19b30d2534145781eac049ae74aeacd","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"01d05b5714ead585c6a737d5ae8dcc4cefc0e0d812c6937453090bf5a237b786":{"finish_id":"metal.powder.charcoal","family":"coated_metal","recipe_version":"1.0.0","canonical_material_id":"metal.powder.charcoal","canonical_recipe_sha256":"be0c6017e8cfa2975c10a31ea2e8928fa19b30d2534145781eac049ae74aeacd","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"9a696c23c84a39aa0b3bba42172e6e2931bbae13225504489adb9a251a875808":{"finish_id":"metal.powder.charcoal","family":"coated_metal","recipe_version":"1.0.0","canonical_material_id":"metal.powder.charcoal","canonical_recipe_sha256":"be0c6017e8cfa2975c10a31ea2e8928fa19b30d2534145781eac049ae74aeacd","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"e82b97f13b7a53ea59a04bcf142c4ad4fc6ff32179ae51916b19c3e8f91ef9e2":{"finish_id":"metal.powder.charcoal","family":"coated_metal","recipe_version":"1.0.0","canonical_material_id":"metal.powder.charcoal","canonical_recipe_sha256":"be0c6017e8cfa2975c10a31ea2e8928fa19b30d2534145781eac049ae74aeacd","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."}},"styleV2":{"revision":"style-v2-paper-static5-9729479e2ce4d60a36d6","registry":{"path":null,"sha256":"a48e5c052660dd5aa229e960bc80195c65626361e8d23d1219500f629814a5fd"},"mappingSha256":"9459bdaa4e65b3fa330b471c2484469ce81c6057d66af7a369691cf1ab71f39f","mode":"standard","sourceBlendSha256":"a951a9d73c0214406f04a614077a391738e5f336ef517604bb3cf97b2aa45cc1"},"limitations":["Saved states exposed in Web; public parametric generation remains in source/build.py.","Final native PBR channels are finite-resolution UV textures; Cycles and three.js lighting are not pixel-identical.","The native shared library is hash-bound at the registry workspace path."]});
export const availableStates = Object.freeze(["default"]);

export async function createAsset(THREE, options = {}) {
  if (!THREE?.Group || !THREE?.BufferGeometry || !THREE?.MeshPhysicalMaterial)
    throw new TypeError('Pass the three.js namespace to createAsset(THREE, options)');
  const requested = options.state ?? metadata.defaultState;
  const session = await openAsset(THREE, new URL('./', import.meta.url), options);
  const DATA = session.data;
  try {
  if (!DATA.states[requested]) throw new RangeError(`Unknown asset state: ${requested}`);
  const geometries = session.geometries, materials = new Map(), textures = session.textures;
  const floats = session.array;
  const root = new THREE.Group();
  root.name = metadata.name;
  root.userData.asset = metadata;
  root.userData.availableStates = [...availableStates];
  if ((options.upAxis ?? 'Y') === 'Y') root.rotation.x = -Math.PI / 2;
  else if (options.upAxis !== 'Z') throw new RangeError('upAxis must be Y or Z');
  const loadTexture = options.loadTexture ?? ((uri) => new THREE.TextureLoader().loadAsync(uri));
  async function texture(id, color) {
    const key = `${id}:${color}`;
    if (!textures.has(key)) textures.set(key, (async () => {
      const t = await session.loadTexture(session.uri(id), loadTexture);
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.flipY = true; // native Blender UVs, unlike the glTF convention
      t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      // Continuous coverage proof bounds the exact level-zero bilinear footprint.
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      return t;
    })());
    return textures.get(key);
  }
  async function material(id) {
    if (!materials.has(id)) materials.set(id, (async () => {
      const d = DATA.materials[id], p = d.properties;
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(...p.color), metalness: p.metalness,
        roughness: p.roughness, opacity: p.opacity, transparent: p.transparent,
        ior: p.ior, transmission: p.transmission, clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        emissive: new THREE.Color(...p.emissive), emissiveIntensity: p.emissiveIntensity,
        specularIntensity: p.specularIntensity, specularColor: new THREE.Color(...p.specularColor),
        sheen: p.sheen ?? 0, sheenColor: new THREE.Color(...(p.sheenColor ?? [1,1,1])),
        sheenRoughness: p.sheenRoughness ?? .5,
        anisotropy: p.anisotropy ?? 0, anisotropyRotation: p.anisotropyRotation ?? 0,
        side: THREE.DoubleSide,
        vertexColors: Boolean(d.vertexColor),
      });
      m.name = d.name; m.userData.blenderMaterial = d.name;
      Object.assign(m.userData, DATA.metadata.unifiedMaterials[id]);
      if (d.vertexColor) m.userData.vertexColorContract = d.vertexColor;
      if (d.vertexColor?.emission_vertex_multiplier) {
        // Three's ordinary vertex color path affects diffuse/alpha only.
        // The native source feeds the same interpolated RGB to emission too.
        m.onBeforeCompile = shader => {
          const token = '#include <emissivemap_fragment>';
          if (shader.fragmentShader.split(token).length !== 2) throw new Error('Unsupported Three emission shader boundary');
          shader.fragmentShader = shader.fragmentShader.replace(token, token + '\n#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)\n totalEmissiveRadiance *= vColor.rgb;\n#endif\n');
        };
        m.customProgramCacheKey = () => 'native-vertex-rgb-emission-v1';
      }
      for (const [prop, tex] of Object.entries(d.maps))
        m[prop] = await texture(tex, prop === 'map' || prop === 'emissiveMap' || prop === 'specularColorMap');
      return m;
    })());
    return materials.get(id);
  }
  function geometry(id) {
    if (!geometries.has(id)) {
      const d = DATA.geometries[id], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(floats(d.position), 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(floats(d.normal), 3));
      if (d.color) g.setAttribute('color', new THREE.Float32BufferAttribute(floats(d.color), 4));
      const uv = floats(d.uv);
      if (uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      if (d.index) g.setIndex(new THREE.BufferAttribute(floats(d.index), 1));
      for (const [start, count, slot] of d.groups) g.addGroup(start, count, slot);
      g.computeBoundingBox(); g.computeBoundingSphere();
      geometries.set(id, g);
    }
    return geometries.get(id);
  }
  // States are actual saved Blender scenes. Swapping states does not pretend that
  // arbitrary procedural Python parameters are available as JavaScript parameters.
  const stateGroups = new Map();
  const building = new Map();
  let disposed = false;
  async function buildState(name) {
    if (disposed) throw new Error('Asset has been disposed');
    if (stateGroups.has(name)) return;
    await session.prepare(name);
    const state = DATA.states[name];
    await Promise.all([...new Set(state.nodes.flatMap(n => n.materials || []).filter(id => id !== null))].map(material));
    const container = new THREE.Group(); container.name = `state:${name}`;
    const nodes = new Map();
    for (const d of state.nodes) {
      const o = d.geometry
        ? new THREE.Mesh(geometry(d.geometry), await Promise.all(d.materials.map(material)))
        : new THREE.Group();
      o.name = d.name; o.visible = d.visible;
      o.matrix.fromArray(d.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale);
      o.matrixAutoUpdate = false;
      o.userData = {...d.properties, blenderType: d.type, assetNode: d.name};
      o.castShadow = true; o.receiveShadow = true; nodes.set(d.name, o);
    }
    for (const d of state.nodes) (nodes.get(d.parent) ?? container).add(nodes.get(d.name));
    container.visible = name === requested;
    root.add(container); stateGroups.set(name, container);
  }
  async function prepareState(name) {
    if (disposed) throw new Error('Asset has been disposed');
    if (!DATA.states[name]) throw new RangeError(`Unknown asset state: ${name}`);
    if (!building.has(name)) building.set(name, buildState(name).catch(e => {building.delete(name);throw e;}));
    await building.get(name);
    return root;
  }
  for (const name of (options.states === 'lazy' ? [requested] : availableStates)) await prepareState(name);
  root.prepareState = prepareState;
  let switchRequest = 0;
  root.setState = (name) => {
    if (disposed) throw new Error('Asset has been disposed');
    const token = ++switchRequest;
    if (!stateGroups.has(name) && DATA.states[name]) return prepareState(name).then(() => token === switchRequest ? root.setState(name) : root);
    if (!stateGroups.has(name)) throw new RangeError(`Unknown asset state: ${name}`);
    for (const [state, group] of stateGroups) group.visible = state === name;
    root.userData.state = name;
    return root;
  };
  root.getStateObject = (name) => stateGroups.get(root.userData.state).getObjectByName(name);
  root.dispose = async () => {
    if (disposed) return; disposed = true;
    await Promise.allSettled(building.values());
    for (const m of materials.values()) (await m).dispose();
    await session.release();
  };
  root.setState(requested); root.updateMatrixWorld(true);
  return root;
  } catch (error) { await session.release(); throw error; }
}

export default createAsset;
