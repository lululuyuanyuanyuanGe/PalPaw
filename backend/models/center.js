import mongoose from 'mongoose';

const centerSchema = new mongoose.Schema({
    centername: {
        type: String,
        unique: true,
        required: true, 
        trim: true
      },
    password: {
        type: String,
        select: true,
        required: true
      },
})

centerSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
    }
});

//const Center = mongoose.model('Center',schema);
const Center = mongoose.model('Center', centerSchema); 

centerSchema.pre('save', function(next) {
    if (!this.centername) {
        next(new Error("Center name is required"));
    } else {
        next();
    }
});
export default Center; 