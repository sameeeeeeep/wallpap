const nativeMatchMedia=window.matchMedia.bind(window);
window.matchMedia=q=>{
 const result=nativeMatchMedia(q);
 if(q==='(prefers-reduced-motion: reduce)')Object.defineProperty(result,'matches',{get:()=>true});
 return result;
};
