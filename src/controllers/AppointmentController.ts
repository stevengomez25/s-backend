import { Request, Response } from 'express';
import Appointment, { IAppointment } from '../models/Appointment';
import { generateAllTimeSlots } from '../utils/timeSlots';
import mongoose from 'mongoose';

// --- Función Auxiliar para parsear la fecha ---
const parseDate = (dateString: string): Date => {
    // Aseguramos que la fecha se interprete como UTC para evitar problemas de zona horaria
    const date = new Date(dateString);
    // Para simplificar la consulta a MongoDB, establecemos la hora a medianoche (UTC)
    date.setUTCHours(0, 0, 0, 0); 
    return date;
};

// ============================================
// 1. OBTENER SLOTS DISPONIBLES
// ============================================
export const getAvailableSlots = async (req: Request, res: Response) => {
    const { date: dateString } = req.params;

    if (!dateString) {
        return res.status(400).json({ message: 'Se requiere el parámetro de fecha.' });
    }

    try {
        const targetDate = parseDate(dateString);
        
        // 1. Obtener todos los slots posibles para el día
        const allSlots = generateAllTimeSlots();
        
        // 2. Consultar citas ya reservadas para esa fecha
        const bookedAppointments = await Appointment.find({ 
            date: targetDate, 
            status: { $in: ['pending', 'confirmed'] } // Consideramos pendientes y confirmadas
        });
        
        // 3. Crear un Set de los slots ocupados (para búsqueda rápida)
        const bookedSlots = new Set(bookedAppointments.map(app => app.timeSlot));

        // 4. Filtrar los slots disponibles
        const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));

        res.status(200).json({ 
            date: dateString,
            slots: availableSlots 
        });

    } catch (error) {
        console.error("Error al obtener slots:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// ============================================
// 2. CREAR NUEVA CITA
// ============================================
export const createAppointment = async (req: Request, res: Response) => {
    const { date, timeSlot, clientName, clientEmail, duration = 60 } = req.body;

    // Validación básica de campos
    if (!date || !timeSlot || !clientName || !clientEmail) {
        return res.status(400).json({ message: 'Faltan campos requeridos (fecha, hora, nombre, email).' });
    }

    try {
        const targetDate = parseDate(date);
        
        // 1. Verificar si el slot ya está ocupado (doble chequeo)
        const existingAppointment = await Appointment.findOne({
            date: targetDate,
            timeSlot: timeSlot,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(409).json({ message: 'Este slot de tiempo ya ha sido reservado.' });
        }

        // 2. Crear y guardar la nueva cita
        const newAppointment: IAppointment = new Appointment({
            date: targetDate,
            timeSlot,
            clientName,
            clientEmail,
            duration,
            status: 'pending' // Por defecto
        });

        await newAppointment.save();
        
        res.status(201).json({ 
            message: 'Cita creada exitosamente.', 
            appointment: {
                id: newAppointment._id,
                date: newAppointment.date.toISOString().split('T')[0],
                timeSlot: newAppointment.timeSlot,
                clientName: newAppointment.clientName 
            }
        });

    } catch (error) {
        console.error("Error al crear la cita:", error);
        // Manejo de errores de validación de Mongoose si es necesario
        res.status(500).json({ message: 'Error al registrar la cita.' });
    }
};

export const getAllAppointments = async (req: Request, res: Response) => {
    try {
        // Obtenemos todas las citas, ordenadas cronológicamente por fecha y hora
        const appointments = await Appointment.find({
            status: { $in: ['pending', 'confirmed'] } // Solo las activas
        })
        .sort({ date: 1, timeSlot: 1 }) // Orden ascendente por fecha, luego por hora
        .select('date timeSlot clientName clientEmail duration status'); // Seleccionamos solo los campos necesarios

        res.status(200).json(appointments);

    } catch (error) {
        console.error("Error al obtener todas las citas:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// ============================================
// 4. CANCELAR CITA (liberar slot)
// ============================================
export const cancelAppointment = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de cita inválido.' });
    }

    try {
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { status: 'cancelled' }, // Cambia el estado a 'cancelled'
            { new: true } // Devuelve el documento actualizado
        );

        if (!appointment) {
            return res.status(404).json({ message: 'Cita no encontrada.' });
        }

        res.status(200).json({ 
            message: 'Cita cancelada exitosamente.',
            appointment 
        });

    } catch (error) {
        console.error("Error al cancelar la cita:", error);
        res.status(500).json({ message: 'Error al cancelar la cita.' });
    }
};

export const confirmAppointment = async (req: Request, res: Response)=>{
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de cita inválido.' });
    };
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { status: 'confirmed' }, // Cambia el estado a 'cancelled'
            { new: true } // Devuelve el documento actualizado
        );

        if (!appointment) {
            return res.status(404).json({ message: 'Cita no encontrada.' });
        }

        res.status(200).json({ 
            message: 'Cita cancelada exitosamente.',
            appointment 
        });

    } catch (error) {
        console.error("Error al cancelar la cita:", error);
        res.status(500).json({ message: 'Error al cancelar la cita.' });
    };
};