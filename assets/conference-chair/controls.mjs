// Optional plain-DOM controls. Host owns rendering and calls render() after updates.
export function mountParameterControls(container, asset, {render=()=>{}, onError=console.error}={}) {
  const fields=new Map(), nodes=[], schema=asset.parameterSchema;
  const make=tag=>document.createElement(tag);
  function refresh(){state.value=asset.userData.state;const params=asset.getParams(),ranges=asset.getParameterRanges?.()??{};for(const[k,{input,output}]of fields){if(ranges[k]){input.min=ranges[k].min;input.max=ranges[k].max;}input.value=params[k];output.value=typeof params[k]==='number'?String(Number(params[k].toFixed(4))):String(params[k]);const active=schema[k].activeStates;input.disabled=(!!active&&!active.includes(asset.userData.state))||Object.entries(schema[k].activeWhen??{}).some(([key,values])=>!values.includes(params[key]));}}
  const state=make('select');for(const name of asset.userData.availableStates){const option=make('option');option.value=name;option.textContent=name;state.append(option);}state.value=asset.userData.state;
  const listen=(element,event,fn)=>{element.addEventListener(event,fn);nodes.push(()=>element.removeEventListener(event,fn));};
  listen(state,'change',async()=>{try{await asset.setState(state.value);refresh();render();}catch(e){onError(e);}});container.append(state);
  for(const [key,d]of Object.entries(schema)){
    const label=make('label'),text=make('span'),output=make('output'),input=make(d.enum?'select':'input');
    label.style.cssText='display:block;margin:14px 0';text.textContent=`${key}${d.unit?' ('+d.unit+')':''} `;label.title=d.description;label.append(text,output,make('br'),input);
    if(d.enum){for(const value of d.enum){const option=make('option');option.value=value;option.textContent=value;input.append(option);}}
    else Object.assign(input,{type:'range',min:d.min,max:d.max,step:d.step??(d.type==='integer'?1:.001)});
    input.style.width='100%';listen(input,'input',async()=>{try{await asset.updateParams({[key]:d.enum?d.enum.find(v=>String(v)===input.value):Number(input.value)});refresh();render();}catch(e){refresh();onError(e);}});
    container.append(label);fields.set(key,{input,output});
  }
  const reset=make('button');reset.textContent='恢复默认参数';listen(reset,'click',async()=>{try{await asset.resetParams();refresh();render();}catch(e){onError(e);}});container.append(reset);refresh();
  return ()=>{for(const remove of nodes)remove();container.replaceChildren();};
}
