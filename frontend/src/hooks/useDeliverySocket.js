import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '../api/axios';

export default function useDeliverySocket(token) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState({});

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(getSocketBaseUrl(), {
      transports: ['websocket'],
      auth: { token },
      path: '/socket.io',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('delivery:kpis', (payload) => {
      setEvents((current) => ({ ...current, kpis: payload }));
    });

    socket.on('delivery:shipments', (payload) => {
      setEvents((current) => ({ ...current, shipments: payload }));
    });

    socket.on('delivery:location', (payload) => {
      setEvents((current) => ({ ...current, tracking: payload }));
    });

    socket.on('delivery:status', (payload) => {
      setEvents((current) => ({ ...current, status: payload }));
    });

    socket.on('delivery:connected', (payload) => {
      setEvents((current) => ({ ...current, connectedMessage: payload.message }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { connected, events, socket: socketRef.current };
}
