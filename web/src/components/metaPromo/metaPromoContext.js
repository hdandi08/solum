import {createContext,useContext} from 'react';
export const EMPTY_META_PROMO={promo:null,eligible:false,setCheckoutGuard:()=>()=>{},reopen:()=>{}};
export const MetaPromoContext=createContext(null);
export function useMetaPromo(){return useContext(MetaPromoContext) ?? EMPTY_META_PROMO;}
