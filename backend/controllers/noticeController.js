import Center from "../models/center.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Notice from "../models/Notice.js"; 
import mongoose from 'mongoose';


export default {
    async notify(req, res) {
        try{
            const {content} = req.body;
            //auth
            if (!req.session.centername|| !req.session.centerId){
                return res.status(401).json({
                  error: "User not authenticated"
                })
            }
            //check filled
            if (!content) {
                return res
                  .status(400)
                  .json({
                    error: "Please enter the content to send the notice"
                  });
              }
            const newNotice = await Notice.create({
                centername: req.session.centername,
                content: content,
                notify: new Date(),
            });
            //const noticeId = notice.id; 
            res.status(201).json({message: `Notify successfully!`});  

        }
        catch(err) {
            console.error(err);
            res.status(500).json({
                error: 'An error occurred while center tries to send out pop up notice.'
            });
        }
        
    },

    async getNotice(req, res) {
        try {
            // Get newest notice
            const latestNotice = await Notice.find().sort({ notifytime: -1 });
          
            if (!latestNotice) {
                return res.status(404).json({ message: "No notices found." });
            }
          
            res.status(200).json({
                latestNotice
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
            error: 'An error occurred during notice retrieval.'
          });
        }
      }

}
