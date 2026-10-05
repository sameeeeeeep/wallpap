const nativeMatchMedia=window.matchMedia.bind(window);
window.matchMedia=q=>{
 const result=nativeMatchMedia(q);
 if(q.includes('(pointer: coarse)'))Object.defineProperty(result,'matches',{get:()=>true});
 return result;
};
