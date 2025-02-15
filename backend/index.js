import MongoStore from 'connect-mongo';
import express from 'express';
import mongoose from 'mongoose';
import{ centersRouter } from './routes/centersRouter.js';
import dotenv from 'dotenv';
import session from 'express-session';
//const express = require('express')
import cors from 'cors'; 
import noticeRouter from './routes/noticeRouter.js'; 


dotenv.config()
const app = express()
//const mongoose = require('mongoose')
const PORT = 8080
const uri = "mongodb+srv://muhanqing1:muhanqing1@cluster0.8fwzg.mongodb.net/"
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

async function run() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch(err){
  
  }
  finally {
    // Ensures that the client will close when you finish/error
    //await mongoose.disconnect();
  }
}
run().catch(console.dir);
mongoose.set('strictQuery', false)

//middleware

app.use(express.json()); 
//app.use(cors());

app.use(cors({
  origin: "http://localhost:8081",
  credentials: true
}));


app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'sceretkey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({mongoUrl: uri}),
  cookie: { maxAge: 24 * 60 * 60 * 1000 *7 } //7days expire
}));
app.use((req, res, next) => {
  console.log("Session Middleware Active:", req.session);
  next(); 
});

//routes
app.use('/api/centers', centersRouter);
app.use('/api/notice', noticeRouter);

app.get("/api", (req, res) => {
    res.json ({"test": ["hello", "foo", "gamemode 1"]})
})

app.listen(PORT, () => {console.log("Server started on port " + PORT)})