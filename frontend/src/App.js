import React, { useState, useEffect } from 'react';
import SocketIO from 'socket.io-client';
import './App.css';
import Line from './Line';

const cursorChannelId = Math.random().toString();

function App() {
  const [socket, setSocket] = useState(null);
  const [lineStart, setLineStart] = useState(0);
  const [lineEnd, setLineEnd] = useState(lineStart + 100);
  const [initLines, setInitLines] = useState(null);

  useEffect(() => {
    const socket = SocketIO('http://192.168.1.7:8080');
    setSocket(socket);

    socket.emit('fetchLines', lineStart, lineEnd);
    socket.on('lines', (lines) => {
      console.log(lines);
      setInitLines(lines);
    });
  }, []);

  const lines = [];
  if(initLines) {
    for(let n=lineStart; n<lineEnd; n++) {
      lines.push(<Line key={n} channelId={cursorChannelId} number={n} socket={socket}>{initLines[n-lineStart]}</Line>);
    }
  }

  return (
    <div className='editor-container'>
      <div className='editor-content'>
        { lines }
      </div>
    </div>
  );
}

export default App;
