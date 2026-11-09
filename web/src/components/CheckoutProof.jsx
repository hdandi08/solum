import { Fragment } from 'react';
import AwardProof from './AwardProof.jsx';
import { PRESS } from '../data/press.js';
import './CheckoutProof.css';

const publications = [...PRESS.filter(item => item.tier === 'lead'), ...PRESS.filter(item => item.tier !== 'lead')];

export default function CheckoutProof({ kitId }) {
  return (
    <div className="checkout-proof" aria-label={kitId === 'ritual' ? 'Awards and press' : 'Press coverage'}>
      {kitId === 'ritual' && <AwardProof compact />}
      <p className="checkout-proof-press">
        <span className="checkout-proof-label">Featured in </span>
        {publications.map((item, index) => (
          <Fragment key={item.name}>
            {index > 0 && <span aria-hidden="true"> · </span>}
            <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
