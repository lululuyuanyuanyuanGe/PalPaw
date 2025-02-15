const mongoose = require("mongoose");

const AnimalSchema = new mongoose.Schema({
    species: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
})

module.exports = mongoose.model("Animal", AnimalSchema);