import React, { useRef, useEffect } from 'react';

const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            ref.current.srcObject = stream;
        })
    },
        // eslint-disable-next-line
        []);

    return (
        <video playsInline autoPlay ref={ref} style={{ transform: "scaleX(-1)" }} />
    );
}

export default Video;
