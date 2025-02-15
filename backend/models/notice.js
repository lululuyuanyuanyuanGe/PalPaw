import mongoose from 'mongoose';

const NoticeSchema = new mongoose.Schema({
    centername: { type: String, required: true }, 
    content: { type: String, required: true },
    notifytime: { type: Date, default: Date.now }
});

const Notice = mongoose.model('Notice', NoticeSchema);
export default Notice;