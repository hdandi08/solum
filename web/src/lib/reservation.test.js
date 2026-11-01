import { describe,it,expect } from 'vitest';
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
