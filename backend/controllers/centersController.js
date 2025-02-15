import Center from "../models/center.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
//import { populate } from "dotenv";
import { centersRouter } from "../routes/centersRouter.js";
import mongoose from 'mongoose';


export default {
    async register(req,res){
        try {
            const {centername, password} = req.body;
            //if both username and password entered
            if (!centername || !password) {
                return res
                  .status(400)
                  .json({
                    error: "Please enter both username and password."
                  });
              }
              
            //if username has been taken, User is tablename 
            // To-do:
            const findcenter = await Center.findOne({centername});
            if (findcenter){
                return res.status(400).json(
                { error: "Sorry, the username is already taken : ("}
                )
            }
    
            //if password is valid, if contains at least 1 lowercase, 1 uppercase, and 1 number.
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!password || !passwordRegex.test(password)) {
                return res.status(400).json({
                    message: 'Password must be at least 8 characters long, contain at least one lowercase, one uppercase letter, and one number.'
                });
            }
    
            //hash password and insert user
            const hashedPassword = await bcrypt.hash(password, 10);
            const newCenter = new Center({ centername, password: hashedPassword });
            const centerId = newCenter._id.toString(); 
            await newCenter.save();
              res.status(201).json({message: "Your organization has been successfully registered! "});
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'An error occurred while registering the center.'
            });
        }
    },

    async login(req, res) {
        try{
            const {centername, password} = req.body;
            //if both username and password entered
            if (!centername || !password) {
                return res
                  .status(400)
                  .json({
                    error: "Please enter both username and password."
                  });
              }
            
            //query db
            const center = await Center.findOne({ centername }).select("+password");
            //fail if no centername found or psw unmatched
            if (!center || !(await bcrypt.compare(password, center.password))){
                return res.status(401).json({
                  error: "centername or password doesn't match. Please check if both are entered correctly"
                })
            }
            else{
                //store center into session 
                req.session.centerId = center._id.toString(); //check if need to query in db later
                req.session.centername = center.centername;
                res.status(201).json({
                  message: "Logged in successfully"
                })
            }
        }
        catch(err) {
            console.error(err);
            res.status(500).json({
                error: 'An error occurred while logining in the center.'
            });
        }
    },

    async logout(req, res) {
        try{
            req.session.destroy();
            res.status(200).json({
              message: 'The center has been logged out.',
            });
        
        }
        catch(err) {
            console.error(err);
            res.status(500).json({
                error: 'An error occurred while logining out in the center.'
            });
        }
    },

    //Pending
    async recruitNotice(req, res) {
        try{
            const { centername, context} = req.body;
        
        }
        catch(err) {
            console.error(err);
            res.status(500).json({
                error: 'An error occurred while center tries to send out pop up notice.'
            });
        }
    }

}
