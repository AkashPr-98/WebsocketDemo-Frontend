import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import Video from './Video';
import Whiteboard from './Whiteboard';
import { Button } from '@mui/material';

const Room = ({ roomId }) => {
    const [peers, setPeers] = useState([]);
    const [whiteboardVisible, setWhiteboardVisible] = useState(false);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    useEffect(() => {
        socketRef.current = io('http://localhost:8080');
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit('join room', roomId);
            socketRef.current.on('all users', users => {
                const peers = [];
                users.forEach(userId => {
                    // Only create a new peer connection if one doesn't already exist
                    if (!peersRef.current.find(p => p.peerID === userId)) {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userId,
                            peer,
                        })
                        peers.push(peer);
                    }
                })
                setPeers(peers);
            });
            socketRef.current.on('user joined', newPeerID => { // New event listener
                // Only create a new peer connection if one doesn't already exist
                if (!peersRef.current.find(p => p.peerID === newPeerID)) {
                    const peer = createPeer(newPeerID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: newPeerID,
                        peer,
                    })
                    setPeers(peers => [...peers, peer]);
                }
            });
            socketRef.current.on('receiving returned signal', payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        })
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });
        peer.on('signal', signal => {
            socketRef.current.emit('sending signal', { userToSignal, callerID, signal })
        })
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })
        peer.on('signal', signal => {
            socketRef.current.emit('returning signal', { signal, callerID })
        })
        peer.signal(incomingSignal);
        return peer;
    }

    const muteAudio = () => {
        const enabled = userVideo.current.srcObject.getAudioTracks()[0].enabled;
        if (enabled) {
            userVideo.current.srcObject.getAudioTracks()[0].enabled = false;
        } else {
            userVideo.current.srcObject.getAudioTracks()[0].enabled = true;
        }
    };

    const muteVideo = () => {
        const enabled = userVideo.current.srcObject.getVideoTracks()[0].enabled;
        if (enabled) {
            userVideo.current.srcObject.getVideoTracks()[0].enabled = false;
        } else {
            userVideo.current.srcObject.getVideoTracks()[0].enabled = true;
        }
    };

    const shareScreen = async () => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        userVideo.current.srcObject = new MediaStream([screenVideoTrack]);
    };

    const raiseHand = () => {
        socketRef.current.emit('raise hand', roomId);
    };

    return (
        <div>
            <video muted ref={userVideo} autoPlay playsInline style={{ transform: "scaleX(-1)" }} />
            {peers.map((peer, index) => {
                return (
                    <Video key={index} peer={peer} />
                );
            })}
            <Button variant="contained" color="primary" onClick={muteAudio}>Mute/Unmute Audio</Button>
            <Button variant="contained" color="primary" onClick={muteVideo}>Mute/Unmute Video</Button>
            <Button variant="contained" color="primary" onClick={shareScreen}>Share Screen</Button>
            <Button variant="contained" color="primary" onClick={raiseHand}>Raise Hand</Button>
            <Button variant="contained" color="primary" onClick={() => setWhiteboardVisible(!whiteboardVisible)}>Toggle Whiteboard</Button>
            {whiteboardVisible && <Whiteboard />}
        </div>
    );
};

export default Room;
