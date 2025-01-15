import './InfoMessage.css';

function InfoMessage({ message }) {
    return <div className='tooltip'>
        <span>Help</span>
        <div className='tooltiptext'>
            {message}    
        </div>
    </div>
}

export default InfoMessage;