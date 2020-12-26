import React, { useState, useEffect } from 'react';
import SocketIO from 'socket.io-client';
import './App.css';
import Line from './Line';

/* global BigInt */

const cursorChannelId = Math.random().toString();
const pageSize = 500n;
const paddingLines = 100n;

function App() {
  const [socket, setSocket] = useState(null);
  const [lineStart, setLineStart] = useState(BigInt(window.location.hash ? parseInt(window.location.hash.substring(1)) - 1 : 0));
  const [lineEnd, setLineEnd] = useState(lineStart + pageSize);
  const [initLines, setInitLines] = useState(null);
  const [loadingLines, setLoadingLines] = useState(false);
  const [currentLine, setCurrentLine] = useState(lineStart);

  useEffect(() => {
    const socket = SocketIO('http://192.168.1.7:8080');
    setSocket(socket);

    socket.emit('fetchLines', lineStart.toString(), lineEnd.toString());
    function handleLines(lines) {
      setInitLines(lines);
      socket.off('lines', this);
    }
    socket.on('lines', handleLines);

    function handleKeyPress(e) {
      e.preventDefault();
    }
    
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  useEffect(() => {
    function handleLines(lines) {
      setInitLines([...initLines, ...lines]);
      setLineEnd(lineEnd + pageSize);
      setLoadingLines(false);
      socket.off('lines', this);
    }

    function handleScroll(e) {
      const scrollY = window.scrollY;
      const scrollHeight = document.body.scrollHeight;
      if(scrollY >= scrollHeight - 2.5 * window.innerHeight && !loadingLines) {
        setLoadingLines(true);
        socket.emit('fetchLines', lineEnd.toString(), (lineEnd + pageSize).toString());
        socket.on('lines', handleLines);
      }
    }

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [initLines, setInitLines, loadingLines, setLoadingLines, socket, currentLine, setCurrentLine]);

  useEffect(() => {
    function refreshHash() {
      // 15 because that's the 'line-height' of each line
      const _currentLine = BigInt(Math.round(window.scrollY / 15));
      if(_currentLine !== currentLine) {
        setCurrentLine(_currentLine);
      }
    }
    const i = setInterval(refreshHash, 500);

    return () => clearInterval(i);
  }, [setCurrentLine, currentLine]);

  useEffect(() => {
    const line = document.getElementById((currentLine + 1n).toString());
    if(!line) return;
    const preId = line.id;
    line.id = line.id + '_tmp';
    window.location.hash = currentLine + 1;
    line.id = preId;
  }, [currentLine]);

  const lines = [];
  if(initLines) {
    for(let n=lineStart; n<lineEnd; n++) {
      if(n - lineStart >= currentLine - paddingLines && n - lineStart <= currentLine + BigInt(Math.floor(window.innerHeight / 15)) + paddingLines) {
        lines.push(<Line key={n} channelId={cursorChannelId} number={n} socket={socket}>{initLines[n-lineStart]}</Line>);
      }
      else {
        lines.push(<div key={n} id={n + 1n} className='fake-line'/>);
      }
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
