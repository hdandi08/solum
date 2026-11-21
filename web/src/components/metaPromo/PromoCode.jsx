import {useEffect, useRef, useState} from 'react';

export default function PromoCode({code,compact=false}) {
 const [status,setStatus]=useState('');
 const [copying,setCopying]=useState(false);
 const output=useRef(null),timer=useRef(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 async function copy(){
  if(copying)return;
  setCopying(true);clearTimeout(timer.current);
  let copied=false;
  try{await navigator.clipboard.writeText(code);copied=true;}catch{
   if(!output.current){setCopying(false);return;}
   const previous=document.activeElement;
   const field=document.createElement('textarea');
   field.value=code;field.readOnly=true;field.style.cssText='position:fixed;opacity:0;pointer-events:none';
   output.current.parentElement.appendChild(field);
   try{field.select();field.setSelectionRange(0,code.length);copied=document.execCommand('copy');}catch{/* Select the visible code below instead. */}
   finally{field.remove();previous?.focus({preventScroll:true});}
  }
  if(copied){setStatus('copied');timer.current=setTimeout(()=>setStatus(''),2500);}
  else{
   const range=document.createRange();range.selectNodeContents(output.current);
   const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);setStatus('manual');
  }
  setCopying(false);
 }
 return <div className={`meta-promo-copy${compact?' meta-promo-copy-compact':''}`}>
  <div className="meta-promo-code-row"><output ref={output} className="meta-promo-code" aria-label="Your personal code">{code}</output>
   <button type="button" className="meta-promo-copy-button" aria-busy={copying} onClick={copy}>{status==='copied'?'Copied':'Copy code'}</button>
  </div>
  <span className="meta-promo-copy-status" role="status" aria-label="Copy status">{status==='copied'?'Code copied.':status==='manual'?'Code selected. Copy it using your device’s copy option.':''}</span>
 </div>;
}
