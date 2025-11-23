// Define el horario de trabajo y la duración de la cita
const WORKING_HOURS = {
    START_HOUR: 9,  // 9:00 AM
    END_HOUR: 17,   // 5:00 PM
};

const SLOT_DURATION_MINUTES = 30; // Slots de 30 minutos

/**
 * Genera una lista de todos los posibles slots de tiempo para un día.
 * @returns {string[]} Un array de strings en formato "HH:MM" (e.g., ["09:00", "09:30", "10:00"])
 */
export const generateAllTimeSlots = (): string[] => {
    const slots: string[] = [];
    let currentTime = new Date();
    
    // Establecer la hora de inicio (e.g., 9:00 AM)
    currentTime.setHours(WORKING_HOURS.START_HOUR, 0, 0, 0);

    const endTime = new Date();
    // Establecer la hora de finalización (e.g., 5:00 PM)
    endTime.setHours(WORKING_HOURS.END_HOUR, 0, 0, 0);

    while (currentTime < endTime) {
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        
        slots.push(`${hours}:${minutes}`);
        
        // Avanzar el tiempo según la duración del slot
        currentTime.setMinutes(currentTime.getMinutes() + SLOT_DURATION_MINUTES);
    }
    
    return slots;
};