import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors'; // Permite que el frontend (React) acceda al backend
import appointmentRoutes from './routes/AppointmentRoutes'; // Importa las rutas

// Carga las variables de entorno desde .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Permite a Express parsear JSON en el cuerpo de las peticiones

// --- Rutas de API ---
app.use('/api/appointments', appointmentRoutes); // <--- INTEGRACIÓN CLAVE

// --- Ruta de Prueba (se mantiene) ---
app.get('/', (req: Request, res: Response) => {
  res.send('API de Agendamiento está corriendo...');
});

// --- Conexión a MongoDB ---
const connectDB = async () => {
  try {
    if (!MONGO_URI) {
        throw new Error("MONGO_URI no está definido en las variables de entorno.");
    }
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB conectado exitosamente.');
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error);
    process.exit(1); // Sale del proceso si la conexión falla
  }
};

// --- Rutas de Prueba ---
app.get('/', (req: Request, res: Response) => {
  res.send('API de Agendamiento está corriendo...');
});

// --- Inicio del Servidor ---
connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`📡 Servidor Express corriendo en http://localhost:${PORT}`);
    });
});