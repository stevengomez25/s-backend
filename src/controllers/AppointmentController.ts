import { Request, Response } from "express";
import Appointment, { IAppointment } from "../models/Appointment";
import { generateAllTimeSlots } from "../utils/timeSlots";
import mongoose from "mongoose";

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
    return res
      .status(400)
      .json({ message: "Se requiere el parámetro de fecha." });
  }

  try {
    const targetDate = parseDate(dateString);

    // 1. Obtener todos los slots posibles para el día
    const allSlots = generateAllTimeSlots();

    // 2. Consultar citas ya reservadas para esa fecha
    const bookedAppointments = await Appointment.find({
      date: targetDate,
      status: { $in: ["pending", "confirmed"] }, // Consideramos pendientes y confirmadas
    });

    // 3. Crear un Set de los slots ocupados (para búsqueda rápida)
    const bookedSlots = new Set<string>();

    bookedAppointments.forEach((app) => {
      bookedSlots.add(app.timeSlot);

      if (app.duration === 60) {
        const nextSlot = getNextTimeSlot(app.timeSlot);
        bookedSlots.add(nextSlot);
      }
    });
    // 4. Filtrar los slots disponibles
    const availableSlots = allSlots.filter((slot, index, array) => {
      // Regla A: El slot no debe estar reservado por ninguna cita existente.
      if (bookedSlots.has(slot)) {
        return false;
      }

      // Regla B: Si el slot actual es el último, no puede ser el inicio de un servicio de 60 minutos.
      const nextSlotIndex = index + 1;
      if (nextSlotIndex >= array.length) {
        return false; // El último slot ("20:00") no puede ser el inicio de 60 min.
      }

      // Regla C: El siguiente slot TAMPOCO debe estar reservado.
      // (Esto es solo una verificación de seguridad, ya que la Regla A ya filtró la mayoría)
      const nextSlot = array[nextSlotIndex];
      if (bookedSlots.has(nextSlot)) {
        return false;
      }

      // Si pasa las tres reglas, está disponible para un servicio de 60 minutos.
      return true;
    });

    res.status(200).json({
      date: dateString,
      slots: availableSlots,
    });
  } catch (error) {
    console.error("Error al obtener slots:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ============================================
// 2. CREAR NUEVA CITA
// ============================================
const getNextTimeSlot = (currentTime: string): string => {
  // ... (Implementación de getNextTimeSlot, como se definió antes)
  const SLOT_DURATION_MINUTES = 30;
  const [hours, minutes] = currentTime.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + SLOT_DURATION_MINUTES);
  const nextHours = date.getHours().toString().padStart(2, "0");
  const nextMinutes = date.getMinutes().toString().padStart(2, "0");
  return `${nextHours}:${nextMinutes}`;
};

const getAffectedTimeSlots = (
  startTime: string,
  duration: number
): string[] => {
  let slots = [startTime];
  if (duration === 60) {
    slots.push(getNextTimeSlot(startTime));
  }
  return slots;
};

export const createAppointment = async (req: Request, res: Response) => {
  // El frontend ahora debe enviar duration: 60
  const { date, timeSlot, clientName, clientEmail, duration = 60 } = req.body;

  // Validación básica de campos
  if (!date || !timeSlot || !clientName || !clientEmail || duration < 30) {
    return res
      .status(400)
      .json({ message: "Faltan campos requeridos o la duración es inválida." });
  }

  const targetDate = parseDate(date);

  // -------------------------------------------------------------------
  // PASO 1: Determinar TODOS los slots de 30 minutos a verificar.
  // -------------------------------------------------------------------
  // Si duration=60, slotsToVerify = ["08:00", "08:30"]
  const slotsToVerify = getAffectedTimeSlots(timeSlot, duration);

  // -------------------------------------------------------------------
  // PASO 2: Verificar la disponibilidad contra TODAS las citas existentes.
  // -------------------------------------------------------------------
  try {
    // Busca si CUALQUIERA de los slots requeridos está ya en uso
    const occupiedAppointments = await Appointment.find({
      date: targetDate,
      // timeSlot: Busca en la base de datos si alguna cita empieza en 08:00 o 08:30
      timeSlot: { $in: slotsToVerify },
      status: { $in: ["pending", "confirmed"] },
    });

    // 💡 Lógica de Detección de Conflicto:
    // Si encontramos cualquier cita existente (de 30 o 60 min) que empiece
    // en cualquiera de nuestros puntos de inicio (8:00 o 8:30), ¡hay conflicto!
    if (occupiedAppointments.length > 0) {
      const conflictSlot = occupiedAppointments[0].timeSlot;
      return res.status(409).json({
        message: `El slot de tiempo ${conflictSlot} (parte de tu reserva de ${duration}min) ya está ocupado por otra cita.`,
        conflictSlot,
      });
    }
  } catch (error) {
    console.error("Error al verificar disponibilidad:", error);
    return res
      .status(500)
      .json({ message: "Error en la verificación de disponibilidad." });
  }

  // -------------------------------------------------------------------
  // PASO 3: Crear el ÚNICO documento para la reserva de 60 minutos
  // -------------------------------------------------------------------
  try {
    const newAppointment: IAppointment = new Appointment({
      date: targetDate,
      timeSlot, // Ej: "08:00"
      clientName,
      clientEmail,
      duration, // Ej: 60 (¡Este es el punto clave del cambio!)
      status: "pending",
    });

    await newAppointment.save();

    res.status(201).json({
      message: `Cita de ${duration} minutos creada exitosamente, iniciando a las ${timeSlot}.`,
      appointment: {
        id: newAppointment._id,
        date: newAppointment.date.toISOString().split("T")[0],
        timeSlot: newAppointment.timeSlot,
        clientName: newAppointment.clientName,
        duration: newAppointment.duration,
      },
    });
  } catch (error) {
    console.error("Error al crear la cita:", error);
    res.status(500).json({ message: "Error al registrar la cita." });
  }
};

export const getAllAppointments = async (req: Request, res: Response) => {
  try {
    // Obtenemos todas las citas, ordenadas cronológicamente por fecha y hora
    const appointments = await Appointment.find({
      status: { $in: ["pending", "confirmed"] }, // Solo las activas
    })
      .sort({ date: 1, timeSlot: 1 }) // Orden ascendente por fecha, luego por hora
      .select("date timeSlot clientName clientEmail duration status"); // Seleccionamos solo los campos necesarios

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error al obtener todas las citas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ============================================
// 4. CANCELAR CITA (liberar slot)
// ============================================
export const cancelAppointment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de cita inválido." });
  }

  try {
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: "cancelled" }, // Cambia el estado a 'cancelled'
      { new: true } // Devuelve el documento actualizado
    );

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada." });
    }

    res.status(200).json({
      message: "Cita cancelada exitosamente.",
      appointment,
    });
  } catch (error) {
    console.error("Error al cancelar la cita:", error);
    res.status(500).json({ message: "Error al cancelar la cita." });
  }
};

export const confirmAppointment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de cita inválido." });
  }
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: "confirmed" }, // Cambia el estado a 'cancelled'
      { new: true } // Devuelve el documento actualizado
    );

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada." });
    }

    res.status(200).json({
      message: "Cita cancelada exitosamente.",
      appointment,
    });
  } catch (error) {
    console.error("Error al cancelar la cita:", error);
    res.status(500).json({ message: "Error al cancelar la cita." });
  }
};
