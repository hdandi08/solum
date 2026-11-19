import { describe,it,expect,vi,afterEach } from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
import { reservationRemaining, reservationLabel, canConfirmReservation, localiseReservation } from './reservation.js';
describe('reservation deadline',()=>{
 it('uses the absolute deadline and never resets on another read',()=>{
  const deadline='2026-11-01T12:12:00Z', now=Date.parse('2026-11-01T12:00:00Z');
  expect(reservationRemaining(deadline,now)).toBe(720);
  expect(reservationRemaining(deadline,now+180000)).toBe(540);
  expect(reservationRemaining(deadline,now+800000)).toBe(0);
 });
 it('preserves compatibility without a reservation and fails closed for invalid deadlines',()=>{
  expect(reservationRemaining(undefined)).toBe(null);
  expect(reservationRemaining('invalid')).toBe(0);
  expect(canConfirmReservation(undefined)).toBe(true);
  expect(canConfirmReservation('invalid')).toBe(false);
 });
 it('formats a compact countdown',()=>{expect(reservationLabel(720)).toBe('12:00');expect(reservationLabel(9)).toBe('0:09');});
});

it('normalises a server deadline for a device clock that is an hour fast',()=>{
 const data=localiseReservation({reservation_expires_at:'2026-11-01T12:12:00Z',reservation_server_now:'2026-11-01T12:00:00Z'},Date.parse('2026-11-01T13:00:00Z'));
 expect(reservationRemaining(data.reservation_expires_at,Date.parse('2026-11-01T13:00:00Z'))).toBe(720);
});

it('keeps a personal offer request identity when only landing attribution changes and freezes unknown financial edits',async()=>{
 const {withReservationAttempt}=await import('./reservation.js');
 const values=new Map();vi.stubGlobal('sessionStorage',{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)});
 const body={kit_id:'ritual',items:[{kit_id:'ritual',quantity:1}],email:'buyer@example.test',promo_code:'PERSONAL',promo_visitor_token:'opaque',landing_url:'https://example.test/buy?utm_source=meta'};
 const first=await withReservationAttempt(body,'promo-test');
 const retried=await withReservationAttempt({...body,landing_url:'https://example.test/buy?source=aw',awc:'retained-affiliate'},'promo-test');
 expect(retried.reservation_request_id).toBe(first.reservation_request_id);expect(retried.awc).toBe('retained-affiliate');
 await expect(withReservationAttempt({...body,email:'changed@example.test'},'promo-test')).rejects.toThrow(/previous payment/i);
});

it('blocks offer and order edits when a previous payment response is unknown',async()=>{
 const {assertReservationEditable}=await import('./reservation.js');
 const values=new Map([['solum_reservation_express',JSON.stringify({id:'unknown-request',fingerprint:'hash'})]]);
 vi.stubGlobal('sessionStorage',{getItem:key=>values.get(key)});
 expect(()=>assertReservationEditable('express',null)).toThrow(/previous payment/i);
 expect(()=>assertReservationEditable('express',{client_secret:'pi_known_secret_test'})).not.toThrow();
});

it('session-persists the original pending promo body before creation and restores it without a payment response',async()=>{
 const {withReservationAttempt,restorePendingPromoAttempt,clearReservationAttempt}=await import('./reservation.js');
 const values=new Map();vi.stubGlobal('sessionStorage',{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
 const body={kit_id:'ritual',items:[{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}],email:'buyer@example.test',first_name:'Test',line1:'10 Test Street',city:'London',postcode:'SW1A 1AA',promo_code:'PERSONAL',promo_visitor_token:'opaque'};
 const request=await withReservationAttempt(body,'restore-test');
 expect(restorePendingPromoAttempt('restore-test')).toEqual({body,requestId:request.reservation_request_id});
 expect(JSON.parse(values.get('solum_reservation_restore-test')).pending_body).toEqual(body);
 await expect(withReservationAttempt({...body,promo_code:undefined,promo_visitor_token:undefined},'restore-test')).rejects.toThrow(/previous payment/);
 clearReservationAttempt('restore-test');expect(restorePendingPromoAttempt('restore-test')).toBeNull();
});
