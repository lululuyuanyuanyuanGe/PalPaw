const express=require("express");

const app=express();
app.use(express.json());

const mongoose = require("mongoose");

const cors = require('cors');
app.use(cors());

require('dotenv').config(); // Load environment variables

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("Database Connected");
})
.catch((e) => {
    console.log("Database Connection Error:", e);
});

require('./UserDetails');

const User=mongoose.model("UserInfo");

app.get("/", (req,res) =>{
    res.send({status: "Started"})
})

app.post('/register', async(req, res) => {
    const {username,password} = req.body;

    // Basic body request check
    if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Missing parameters in the request body" });
      }

    const user = await User.findOne({username:username});

    if(user != null){
        return res.send({data:"username already exists!"})
    }
    try{
        await User.create({
            username:username,
            password:password,
        });
    }catch(e){
        res.send({ status:"error", data:error.message });
    }
    res.send({ success: true, message: "User registered successfully" });
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ where: { 
        username: username
      } });
  
      if (!user) {
        return res.send({ success: false, message: "User not found" });
      }
  
      if (user.password !== password) {
        return res.send({ success: false, message: "Invalid password" });
      }
  
      // Login successful
      res.send({ success: true });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send({ success: false, message: "An error occurred" });
    }
  });

app.listen(5001,()=> {
    console.log("Node js started");
})



