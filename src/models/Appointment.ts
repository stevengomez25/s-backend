import { Schema, model, Document } from 'mongoose';

// 1. Tipado de la Interfaz (para TypeScript)
export interface IAppointment extends Document {
  date: Date;
  timeSlot: string; // Ej: "09:00", "10:30"
  clientName: string;
  clientEmail: string;
  duration: number; // Duración en minutos
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
}

// 2. Definición del Esquema (para Mongoose)
const AppointmentSchema = new Schema<IAppointment>({
  date: {
    type: Date,
    required: true,
    // Aseguramos que solo se almacene la fecha (ignora la hora en la indexación/query)
    index: true 
  },
  timeSlot: {
    type: String,
    required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  duration: {
    type: Number,
    required: true,
    default: 60, // 60 minutos por defecto
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

// 3. Crear y Exportar el Modelo
const Appointment = model<IAppointment>('Appointment', AppointmentSchema);
export default Appointment;