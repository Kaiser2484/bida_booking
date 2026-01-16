import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3002'; // Hard-coded for now

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const onTableStatusChange = (callback) => {
  socket.on('tableStatusChanged', callback);
};

export const offTableStatusChange = () => {
  socket.off('tableStatusChanged');
};

export default socket;