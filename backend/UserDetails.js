const mongoose=require("mongoose");

const UserDetailSchema =new mongoose.Schema({
    username:{type:String, unqiue:true, required: true},
    password:{type:String, required: true},
},{
    collection:"UserInfo"
});
mongoose.model("UserInfo", UserDetailSchema)