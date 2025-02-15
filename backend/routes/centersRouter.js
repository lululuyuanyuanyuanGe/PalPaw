import express from 'express';
import centersController from '../controllers/centersController.js';
import { check } from 'express-validator';

export const centersRouter = express.Router();

centersRouter.post('/register', centersController.register);
centersRouter.post('/login', centersController.login);
//centersRouter.get('/profile', centersController.profile);
centersRouter.delete('/logout', centersController.logout);

export default centersRouter;