// Define el horario de trabajo y la duración de la cita
const WORKING_HOURS = {
    START_HOUR: 6,      // 6:00 AM
    END_HOUR_LIMIT: 20.5, // 8:30 PM (Límite)
};

const SLOT_DURATION_MINUTES = 30; // Slots de 30 minutos

// Define el horario de almuerzo en minutos totales (desde medianoche)
const LUNCH_START_MINUTES = 12.5 * 60; // 1:00 PM = 780 minutos
const LUNCH_END_MINUTES = 14 * 60;   // 2:00 PM = 840 minutos

/**
 * Genera una lista de todos los posibles slots de tiempo para un día, excluyendo el horario de almuerzo.
 * @returns {string[]} Un array de strings en formato "HH:MM"
 */
export const generateAllTimeSlots = (): string[] => {
    const slots: string[] = [];
    
    const endMinutes = Math.floor(WORKING_HOURS.END_HOUR_LIMIT * 60);
    let currentTimeMinutes = WORKING_HOURS.START_HOUR * 60; 
    const endTimeLimitMinutes = endMinutes; 

    while (currentTimeMinutes < endTimeLimitMinutes) {
        
        // 🚨 Lógica de Exclusión del Almuerzo 🚨
        if (currentTimeMinutes >= LUNCH_START_MINUTES && currentTimeMinutes < LUNCH_END_MINUTES) {
            // Si la hora actual cae dentro del periodo de almuerzo (13:00 o 13:30), 
            // saltamos directamente a la hora de finalización del almuerzo (14:00).
            currentTimeMinutes = LUNCH_END_MINUTES;
            continue; // Volvemos a empezar el bucle while desde 14:00
        }
        
        // El resto de la lógica es la misma:
        const hours = Math.floor(currentTimeMinutes / 60).toString().padStart(2, '0');
        const minutes = (currentTimeMinutes % 60).toString().padStart(2, '0');
        
        slots.push(`${hours}:${minutes}`);
        
        // Avanzar el tiempo según la duración del slot
        currentTimeMinutes += SLOT_DURATION_MINUTES;
    }
    
    return slots;
};