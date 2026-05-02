import axios from 'axios';
import beepSound from '../assets/beep.mp3'; // 🔊 IMPORT SOUND

interface LocationProps {
    lat: number | null;
    lng: number | null;
}

const SOSButton = ({ lat, lng }: LocationProps) => {

    const handleSOS = async () => {
        if (!lat || !lng) {
            alert("Waiting for GPS signal...");
            return;
        }

        // 🔊 PLAY SOUND
        const audio = new Audio(beepSound);
        audio.play();

        // (Optional) stop sound after 3 sec
        setTimeout(() => {
            audio.pause();
        }, 3000);

        try {
            const response = await axios.post('http://localhost:5000/api/sos', {
                user_id: "Tourist_001",
                lat: lat,
                lng: lng
            });

            alert(response.data.message);

        } catch (error) {
            console.error("SOS Failed:", error);
            alert("SOS failed!");
        }
    };

    return (
        <button 
            onClick={handleSOS}
            style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '20px',
                borderRadius: '50%',
                fontWeight: 'bold',
                cursor: 'pointer'
            }}
        >
            🚨 SEND SOS
        </button>
    );
};

export default SOSButton;