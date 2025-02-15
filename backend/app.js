const express=require("express");
const app=express();
const mongoose = require("mongoose");

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

    const oldUser = await User.findOne({username:username});

    if(oldUser){
        return res.send({data:"username already exists!"})
    }
    try{
        await User.create({
            username:username,
            password:password,
        });
    }catch(e){
        res.send({ status:"error", data:error });
    }
})

app.listen(5001,()=> {
    console.log("Node js started");
})

const cors = require('cors');
app.use(cors());


