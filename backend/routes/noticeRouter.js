import express from 'express';
import centersController from '../controllers/centersController.js';
import { check } from 'express-validator';
import noticeController from '../controllers/noticeController.js';

export const noticeRouter = express.Router();

noticeRouter.post('/notify', noticeController.notify);
noticeRouter.get('/getnotice', noticeController.getNotice);

export default noticeRouter;