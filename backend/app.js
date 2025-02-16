const bcrypt = require("bcrypt")
const express=require("express");
const app=express();
app.use(express.json());

const mongoose = require("mongoose");

//Set up cors
const cors = require('cors');
const corsOptions = {
    origin: "http://localhost:8081", 
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

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
    try{
        const {username,password} = req.body;

        // Basic body request check
        if (!username || !password) {
            return res
              .status(400)
              .json({ error: "Missing parameters in the request body" });
          }
    
        const user = await User.findOne({username:username});
    
        if(user !== null){
            return res.send({ success: false, data:"User already exists!"})
        }

        //generate salt
        const salt = await bcrypt.genSalt(10);

        //generate hash
        const hashedPasswd = await bcrypt.hash(password, salt);

        await User.create({
            username:username,
            password:hashedPasswd,
        });

        res.send({ success: true, message: "User registered successfully" });
    }catch(e){
        res.send({ status:"error", data:e.message });
    }
})

app.post('/login', async (req, res) => {  
    try {
    const { username, password } = req.body;

        // Basic body request check
        if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Missing parameters in the request body" });
      }

      const user = await User.findOne({
        username: username});
  
      if (user === null) {
        return res.send({ success: false, message: "User not found" });
      }

      const match = bcrypt.compare(password,user.password);
  
      if (match) {
        res.send({ success: true , message: "Logged in successfully"});
      }else{
        res.send({ success: false, message: "The username/password is incorrect" });
      }
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send({ success: false, message: "An error occurred" });
    }
  });

app.listen(5001,()=> {
    console.log("Node js started");
})



