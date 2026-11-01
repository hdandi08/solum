import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ReservationTimer from './ReservationTimer.jsx';
it('shows a compact timer only for a real reservation',()=>{
 expect(renderToStaticMarkup(<ReservationTimer remaining={null}/>)).toBe('');
 expect(renderToStaticMarkup(<ReservationTimer remaining={720}/>)).toContain('12:00');
});
it('does not replace an in-flight confirmation with the expiry action',()=>{
 const html=renderToStaticMarkup(<ReservationTimer remaining={0} busy={true}/>);
 expect(html).toContain('Confirming your payment');
 expect(html).not.toContain('Check availability again');
});
