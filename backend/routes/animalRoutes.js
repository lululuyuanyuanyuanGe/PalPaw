const express = require("express");
const Animal = require("../models/Animal");
const router = express.Router();

//get all animals or search by species
router.get("/", async (req, res)=> {
    try{
        const query = req.query.species ? { species: req.query.species } : {};
        const animals = await Animal.find(query);
        res.json(animals);
    }catch (err) {
        res.status(500).json({error: err.message});
    }
})
//add animal
router.post("/", async (req, res) => {
    try {
        const { species, quantity } = req.body;

        if (!species || quantity == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existingAnimal = await Animal.findOne({ species }); 
        if (existingAnimal) {
            return res.status(400).json({ error: "Animal species already exists, please update instead" });
        }

        const newAnimal = new Animal({ species, quantity });
        await newAnimal.save();
        res.status(201).json(newAnimal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// update # of animals
router.patch("/:species", async (req, res) => {
    try {
        const { quantity } = req.body;

        if (quantity == null) {
            return res.status(400).json({ error: "Quantity is required" });
        }
        
        const updatedAnimal = await Animal.findOneAndUpdate(
            { species: req.params.species },
            { quantity },
            { new: true }
        );

        if (!updatedAnimal) return res.status(404).json({ error: "Animal species not found" });

        res.json(updatedAnimal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
 