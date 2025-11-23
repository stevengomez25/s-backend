import { Router } from 'express';
import { getAvailableSlots, createAppointment, getAllAppointments, cancelAppointment, confirmAppointment } from '../controllers/AppointmentController';

const router = Router();

// Ruta GET: /api/appointments/slots/YYYY-MM-DD
// Devuelve una lista de los horarios disponibles para una fecha específica.
router.get('/slots/:date', getAvailableSlots);

// Ruta POST: /api/appointments
// Crea una nueva cita en la base de datos.
router.post('/', createAppointment);

// Rutas de cliente (ya existentes)
router.get('/slots/:date', getAvailableSlots);
router.post('/', createAppointment);

// Rutas de entrenador/administrador (NUEVAS)
router.get('/', getAllAppointments); // GET /api/appointments
router.patch('/:id/cancel', cancelAppointment); // PATCH /api/appointments/:id/cancel
router.patch('/:id/confirm',confirmAppointment);

export default router;