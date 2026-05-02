import { useEffect } from 'react';
const Toast = ({ message, onClose }: any) => {
    useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
    }, []);

    return (
    <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        background: '#2ecc71',
        color: 'white',
        padding: '10px'
    }}>
        {message}
    </div>
    );
};

export default Toast;