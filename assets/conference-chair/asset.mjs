import {createAsset as createSavedAsset,metadata as savedMetadata} from './saved-asset.mjs';
import {attachParameters} from './parametric.mjs';
import {specification,parameterSchema} from './parameters.mjs';
export {orientation,availableStates} from './saved-asset.mjs';
export {parameterSchema};
export const metadata=Object.freeze({...savedMetadata,parameterAPI:'updateParams',parameterSchema,runtime:'threejs-browser',capabilities:[...(savedMetadata.capabilities??[]),'browser_parameters'],limitations:(savedMetadata.limitations??[]).filter(x=>!x.includes('Blender Python parameter generation')),parametricMethod:'native response coefficients and explicit construction expressions; finite sampled validation, not a global error guarantee'});
export async function createAsset(THREE,options={}) {
 const root=await createSavedAsset(THREE,{...options,states:'lazy'});
 try {await attachParameters(THREE,root,specification,new URL('./',import.meta.url),options.params??{});root.userData.asset=metadata;return root;}
 catch(e){await root.dispose();throw e;}
}
export default createAsset;
