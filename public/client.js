const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const endCallButton = document.getElementById('endCall');
const createRoomButton = document.getElementById('createRoom');
const joinRoomButton = document.getElementById('joinRoom');
const roomInput = document.getElementById('roomInput');
const roomDisplay = document.getElementById('roomDisplay');

let localStream;
let remoteStream;
let peerConnection;
let currentRoomId = '';

const constraints = {
    video: true,
    audio: true
};

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

createRoomButton.addEventListener('click', () => {
    socket.emit('createRoom');
});

joinRoomButton.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (roomId) {
        socket.emit('joinRoom', roomId);
        currentRoomId = roomId;
    } else {
        alert('Please enter a room ID.');
    }
});

socket.on('roomCreated', (roomId) => {
    roomDisplay.textContent = `Room Created: ${roomId}`;
    currentRoomId = roomId;
});

startCallButton.addEventListener('click', startCall);

endCallButton.addEventListener('click', endCall);

socket.on('signal', (data) => {
    if (data.room === currentRoomId) {
        if (data.type === 'offer') {
            handleOffer(data.offer);
        } else if (data.type === 'answer') {
            handleAnswer(data.answer);
        } else if (data.type === 'candidate') {
            handleCandidate(data.candidate);
        }
    }
});

function startCall() {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localVideo.srcObject = stream;
            localStream = stream;
            initiateCall();
        }).catch(error => {
            console.error('Error accessing media devices.', error);
        });
}

function initiateCall() {
    peerConnection = new RTCPeerConnection(configuration);
    addLocalTracks(peerConnection);

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('signal', { type: 'candidate', candidate: event.candidate, room: currentRoomId });
        }
    };

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('signal', { type: 'offer', offer: peerConnection.localDescription, room: currentRoomId });
        });
}

function handleOffer(offer) {
    peerConnection = new RTCPeerConnection(configuration);
    addLocalTracks(peerConnection);

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('signal', { type: 'candidate', candidate: event.candidate, room: currentRoomId });
        }
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            socket.emit('signal', { type: 'answer', answer: peerConnection.localDescription, room: currentRoomId });
        });
}

function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function addLocalTracks(peerConnection) {
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}
