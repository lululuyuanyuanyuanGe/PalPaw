const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
    res.send("running server...");
});

const animalRoutes = require("./routes/animalRoutes");
app.use("/api/animals", animalRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`server is running at ${PORT}`));