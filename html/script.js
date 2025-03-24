const seatbeltOnSound = new Audio('https://r2.fivemanage.com/GCyucN95bkmZoaUqYLQJb/audio/SeatbeltOnSound.mp3');
const seatbeltOffSound = new Audio('https://r2.fivemanage.com/GCyucN95bkmZoaUqYLQJb/audio/SeatbeltOffSound.mp3');
const seatbeltWarningSound = new Audio('https://r2.fivemanage.com/GCyucN95bkmZoaUqYLQJb/audio/SeatbeltAlertSound.mp3');
let warningInterval = null;

const elements = {
    hud: document.getElementById('hud'),
    carHud: document.getElementById('car-hud'),
    speedValue: document.getElementById('speed-value'),
    locationInfo: document.getElementById('location-info'),
    zoneText: document.getElementById('zone-text'),
    streetText: document.getElementById('street-text'),
    directionText: document.getElementById('direction-text'),
    seatbeltContainer: document.querySelector('.seatbelt-container'),
    fuelPercent: document.querySelector('.fuel-percent'),
    fuelProgress: document.querySelector('.fuel-progress'),
    voiceContainer: document.querySelector('.voice-container'),
    voiceState: document.getElementById('voice-state'),
    stats: {
        health: {
            progress: document.getElementById('health-progress'),
            percent: document.getElementById('health-percent')
        },
        hunger: {
            progress: document.getElementById('hunger-progress'),
            percent: document.getElementById('hunger-percent')
        },
        thirst: {
            progress: document.getElementById('thirst-progress'),
            percent: document.getElementById('thirst-percent')
        },
        stamina: {
            progress: document.getElementById('stamina-progress'),
            percent: document.getElementById('stamina-percent')
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => {
        bar.style.cssText = 'height: 0; opacity: 0;';
    });

    requestAnimationFrame(() => {
        bars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.cssText = 'height: auto; opacity: 1; transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);';
            }, index * 100);
        });
    });
});

window.addEventListener('message', function(event) {
    const { type, action, data } = event.data;
    
    switch(type || action) {
        case 'update':
            updateStats(event.data);
            break;
        case 'updateVehicle':
            updateVehicleHUD(event.data);
            handleSeatbeltWarning(event.data);
            break;
        case 'toggleMap':
            document.body.classList.toggle('map-active', event.data.mapActive);
            break;
        case 'updateLocation':
            updateLocation(event.data);
            break;
        case 'seatbelt':
            toggleSeatbelt(event.data.value);
            break;
        case 'enableSeatbelt':
            elements.seatbeltContainer.style.display = event.data.value ? 'flex' : 'none';
            break;
        case 'updateVoice':
            updateVoiceIndicator(event.data);
            break;
    }
});

function updateStats(data) {
    ['health', 'hunger', 'thirst', 'stamina'].forEach(stat => {
        const value = Math.round(data[stat]);
        const { progress, percent } = elements.stats[stat];
        const currentValue = parseInt(percent.textContent);
        
        if (Math.abs(currentValue - value) > 10) {
            progress.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            percent.style.transform = 'scale(1.1)';
            requestAnimationFrame(() => {
                setTimeout(() => percent.style.transform = 'scale(1)', 200);
            });
        } else {
            progress.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        progress.style.width = `${value}%`;
        percent.textContent = `${value}%`;
    });
}

function updateVehicleHUD(data) {
    if (data.isInVehicle && data.speed > 2) {
        elements.carHud.style.display = 'block';
        
        requestAnimationFrame(() => {
            elements.carHud.style.cssText = 'display: block; opacity: 1; transform: translate(-50%, -50%); transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);';
            
            const speed = data.speed.toString().padStart(3, '0');
            const oldSpeed = parseInt(elements.speedValue.textContent || '0');
            
            if (Math.abs(oldSpeed - data.speed) > 10) {
                elements.speedValue.style.transform = 'scale(1.1)';
                setTimeout(() => elements.speedValue.style.transform = 'scale(1)', 200);
            }
            
            elements.speedValue.textContent = speed;
            
            const fuelPercent = Math.round(data.fuel);
            elements.fuelPercent.textContent = `${fuelPercent}%`;
            elements.fuelProgress.style.height = `${fuelPercent}%`;
        });
    } else {
        elements.carHud.style.cssText = 'opacity: 0; transform: translate(-50%, 20px);';
    }
}

function toggleSeatbelt(isOn) {
    elements.seatbeltContainer.classList.toggle('active', isOn);
    elements.seatbeltContainer.style.transform = isOn ? 'scale(1.2)' : 'scale(0.8)';
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            elements.seatbeltContainer.style.transform = 'scale(1)';
        }, 200);
    });
    
    (isOn ? seatbeltOnSound : seatbeltOffSound).play();
}

function handleSeatbeltWarning(data) {
    const shouldWarn = data.isInVehicle && !data.seatbelt && data.speed > 2 && data.showSeatbelt;
    
    if (shouldWarn && !warningInterval) {
        seatbeltWarningSound.loop = true;
        seatbeltWarningSound.play();
        warningInterval = true;
    } else if (!shouldWarn && warningInterval) {
        seatbeltWarningSound.loop = false;
        seatbeltWarningSound.pause();
        seatbeltWarningSound.currentTime = 0;
        warningInterval = false;
    }
}

function updateLocation(data) {
    if (data.showLocationInfo) {
        elements.locationInfo.style.display = 'block';
        requestAnimationFrame(() => {
            elements.locationInfo.classList.remove('fade-exit');
            elements.locationInfo.classList.add('visible', 'fade-enter');
            
            elements.zoneText.textContent = data.zone;
            elements.streetText.textContent = data.street;
            elements.directionText.textContent = data.heading;
        });
    } else {
        elements.locationInfo.classList.remove('fade-enter', 'visible');
        elements.locationInfo.classList.add('fade-exit');
        setTimeout(() => {
            if (!elements.locationInfo.classList.contains('visible')) {
                elements.locationInfo.style.display = 'none';
            }
        }, 500);
    }
}

function updateVoiceIndicator(data) {
    elements.voiceState.textContent = data.state;
    elements.voiceContainer.classList.toggle('talking', data.talking);
    
    if (data.talking) {
        elements.voiceContainer.style.transform = 'scale(1.05)';
    } else {
        elements.voiceContainer.style.transform = 'scale(1)';
    }
}