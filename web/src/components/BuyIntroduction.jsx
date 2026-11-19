import { useLocation } from 'react-router-dom';
import CheckoutProof from './CheckoutProof.jsx';

export default function BuyIntroduction({ kitId }) {
  const { state } = useLocation();
  const fromSite = state?.checkoutEntry === 'site';

  return (
    <div className="by-intro">
      {fromSite && <h1 className="by-intro-head">Checkout</h1>}
      <CheckoutProof kitId={kitId} condensed />
      {!fromSite && <>
        <h1 className="by-intro-head">The shower routine for men who want to feel their best.</h1>
        <p className="by-intro-sub">{kitId === 'ritual' ? 'An award-winning kit' : 'A complete kit'} to take you beyond a 3-in-1. Sulphate-free cleansing, exfoliation and nourishing hydration, with clear, numbered steps for your ten-minute daily shower and a 22-minute weekly spa reset.</p>
        <p className="by-intro-value"><strong>Signature fragrance · Cedarwood + Vetiver</strong></p>
      </>}
    </div>
  );
}
