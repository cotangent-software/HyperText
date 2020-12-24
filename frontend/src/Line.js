import React, { useState, useEffect, useReducer } from 'react';

function Cursor({ blink }) {
    return (
        <span style={{ position: 'relative', width: 0 }} className={blink ? 'blink' : ''}>
            <span style={{ position: 'absolute', borderLeft: '2px solid black', height: '100%' }}></span>
        </span>
    );
}

function LineNumber({ onMouseDown=()=>{}, children }) {
    return (
        <span onMouseDown={onMouseDown} style={{ minWidth: '26px', textAlign: 'right', paddingRight: 5, backgroundColor: '#00000005' }}>{children}</span>
    );
}

function reducer(state, action) {
    const out = { ...state };

    const aCursor = action.cursor;
    if(aCursor !== undefined) {
        if(aCursor.type === 'SET') {
            out.cursor = aCursor.value;
        }
        else if(aCursor.type === 'MOVE') {
            if(state.cursor !== null) out.cursor = state.cursor + aCursor.delta;
        }
        else if(aCursor.type === 'MOVE_IF_LESS') {
            if(state.cursor !== null && aCursor.charIndex <= state.cursor) out.cursor = state.cursor + aCursor.delta;
        }
    }

    const charIndex = action.charIndex ? (action.charIndex === 'cursor' ? state.cursor : action.charIndex) : 0;
    if(action.type === 'SET') {
        out.value = action.value;
    }
    else if(action.type === 'INSERT') {
        out.value = state.value.splice(charIndex, 0, action.key);
    }
    else if(action.type === 'BACKSPACE') {
        out.value = state.value.splice(charIndex-1, 1);
    }

    return out;
}

function Line({ number: lineNumber, channelId='default', socket, children }) {
    const [state, dispatch] = useReducer(reducer, { value: '', cursor: null });
    const [blink, setBlink] = useState(true);
    const [blinkTimeout, setBlinkTimeout] = useState(-1);
    const cursorChannel = new BroadcastChannel(`cursor_${channelId}`);

    const value = state.value || '';
    const cursor = state.cursor;

    const chars = value.split('');

    function setValue(newValue) {
        dispatch({ type: 'SET', value: newValue });
    }
    function setCursor(newCursor) {
        dispatch({ cursor: { type: 'SET', value: newCursor }});
    }

    useEffect(() => {
        setValue(children);
    }, [children]);

    useEffect(() => {
        if(cursor !== null) {
            window.addEventListener('keydown', handleKeyPress);
    
            return () => {
                window.removeEventListener('keydown', handleKeyPress);
            };
        }
    }, [cursor, lineNumber]);

    useEffect(() => {
        cursorChannel.addEventListener('message', handleCursorMessage);

        return () => {
            cursorChannel.removeEventListener('message', handleCursorMessage);
        };
    }, [cursor, lineNumber, handleCursorMessage, setCursor]);

    useEffect(() => {
        if(socket) {
            function handleEditInsert(charIndex, key) {
                dispatch({
                    type: 'INSERT',
                    charIndex,
                    key,
                    cursor: {
                        type: 'MOVE_IF_LESS',
                        charIndex,
                        delta: 1
                    }
                });
            }
            function handleEditBackspace(charIndex) {
                dispatch({
                    type: 'BACKSPACE',
                    charIndex,
                    cursor: {
                        type: cursor > chars.length - 1 ? 'MOVE' : undefined,
                        delta: -1
                    }
                });
            }
            socket.on(`editInsert_${lineNumber}`, handleEditInsert);
            socket.on(`editBackspace_${lineNumber}`, handleEditBackspace);

            return () => {
                socket.off(`editInsert_${lineNumber}`, handleEditInsert);
                socket.off(`editBackspace_${lineNumber}`, handleEditBackspace);
            };
        }
    }, [socket, cursor, value]);

    function handleCursorMessage(msg) {
        if(lineNumber !== msg.data.lineNumber) {
            setCursor(null);
        }
        else if(msg.data.linePosition !== null) {
            setCursor(msg.data.linePosition === 'end' ? chars.length : Math.min(msg.data.linePosition, chars.length));
        }
    }

    function moveCursor(ln, linePosition) {
        cursorChannel.postMessage({ lineNumber: ln, linePosition });
        if(lineNumber !== ln) {
            setCursor(null);
        }
    }

    function handleKeyPress(e) {
        e.preventDefault();

        if(!blink) {
            clearTimeout(blinkTimeout);
        }
        setBlink(false);
        setBlinkTimeout(setTimeout(() => {
            setBlink(true);
        }, 1000));

        if(e.key.length === 1 && e.key.charCodeAt(0) <= 127) {
            socket.emit('editInsert', lineNumber, cursor, e.key);
            dispatch({
                type: 'INSERT',
                charIndex: 'cursor',
                key: e.key,
                cursor: {
                    type: 'MOVE',
                    delta: 1
                }
            });
        }
        else if(e.key === 'Backspace') {
            if(cursor === 0) {
                if(lineNumber > 0) {
                    moveCursor(lineNumber - 1, 'end');
                }
            }
            else {
                socket.emit('editBackspace', lineNumber, cursor);
                dispatch({
                    type: 'BACKSPACE',
                    charIndex: 'cursor',
                    cursor: {
                        type: 'MOVE',
                        delta: -1
                    }
                });
            }
        }
        else if(e.key === 'Enter') {
            moveCursor(lineNumber + 1, 'end');
        }
        else if(e.key === 'ArrowLeft') {
            if(cursor === 0) {
                moveCursor(lineNumber - 1, 'end');
            }
            else {
                setCursor(cursor - 1);
            }
        }
        else if(e.key === 'ArrowRight') {
            if(cursor === chars.length) {
                moveCursor(lineNumber + 1, 0);
                setCursor(null);
            }
            else {
                setCursor(Math.min(cursor + 1, chars.length));
            }
        }
        else if(e.key === 'ArrowUp') {
            if(lineNumber > 0) {
                moveCursor(lineNumber - 1, cursor);
            }
        }
        else if(e.key === 'ArrowDown') {
            moveCursor(lineNumber + 1, cursor);
        }
        else if(e.key === 'Home') {
            setCursor(0);
        }
        else if(e.key === 'End') {
            setCursor(chars.length);
        }
    }

    function handleCharClick(charPos) {
        setCursor(charPos);
        moveCursor(lineNumber, null);
    }

    return (
        <div id={lineNumber + 1} style={{ display: 'flex', cursor: 'text', height: 15 }}>
            <LineNumber onMouseDown={() => handleCharClick(0)}>{lineNumber + 1}</LineNumber>
            <span>&nbsp;</span>
            <span style={{ whiteSpace: 'pre' }}>
                { chars.map((c, i) => (
                    <React.Fragment key={i}>
                        { cursor === i && (
                            <Cursor blink={blink}/>
                        )}
                        <span onMouseDown={() => handleCharClick(i)}>{c}</span>
                    </React.Fragment>
                )) }
            </span>
            { cursor === chars.length && (
                <Cursor blink={blink}/>
            )}
            <span style={{ flexGrow: 1 }} onMouseDown={() => handleCharClick(chars.length)}/>
        </div>
    );
}

export default Line;